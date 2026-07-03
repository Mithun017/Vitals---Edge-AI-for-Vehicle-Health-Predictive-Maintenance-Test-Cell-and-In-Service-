# VITALS-Edge — Full Implementation Plan
## Edge AI for Vehicle Health & Predictive Maintenance (Tata InnoVent-27)

### Background

**VITALS-Edge** is a hackathon project for Tata InnoVent-27 (theme 3.2.1.3: AI at the Edge). The system performs real-time fault detection and Remaining Useful Life (RUL) estimation for rotating machinery and combustion engines — **entirely on an edge device** (NVIDIA Jetson Orin Nano Super or a laptop for dev). The cloud is deliberately thin: only compact alert packets travel there.

**Core KPIs:**
| KPI | Target |
|---|---|
| Fault detection recall / precision | ≥ 90% / 90% |
| Edge-to-alert latency | < 2 s (inference < 300 ms) |
| RUL error (C-MAPSS FD001) | RMSE ~ 15–20 cycles |
| False-alarm rate | < 1 per demo session |
| Data reduction | Alert < 1 KB vs raw MB/s |
| Offline resilience | Full local detection + buffered alerts |

**The money-shot demo:** mid-demo, pull the network cable — the dashboard freezes but the edge box keeps detecting and the local LED/alert still fires.

---

## Proposed Repository Structure

```
vitals-edge/                           ← project root
├── Makefile                           ← unified entrypoints
├── .env.example                       ← all env vars documented
├── pyproject.toml / setup.cfg         ← editable install
├── requirements/
│   ├── base.txt                       ← shared deps
│   ├── train.txt                      ← training-only deps
│   ├── edge.txt                       ← edge-only deps
│   └── cloud.txt                      ← cloud/dashboard deps
│
├── vitals_common/                     ← shared library (no deps on edge/cloud)
│   ├── __init__.py
│   ├── schemas.py                     ← Pydantic: SensorWindow, Prediction, Alert, HealthEvent
│   └── preprocess.py                  ← windowing, scaling, FFT features (shared train↔serve)
│
├── vitals_data/                       ← data acquisition + replay
│   ├── __init__.py
│   ├── loaders.py                     ← C-MAPSS, CWRU, AI4I, IEEE PHM 2012 loaders
│   └── replay.py                      ← Replayer class + CLI (--fault flag)
│
├── vitals_train/                      ← ML training (offline, CPU/GPU)
│   ├── __init__.py
│   ├── models.py                      ← AnomalyAutoencoder, IsolationForestWrapper, CNNLSTMRul
│   ├── train_anomaly.py               ← unsupervised training + ROC-AUC report
│   ├── train_rul.py                   ← CNN-LSTM training, RMSE + asymmetric score
│   └── export.py                      ← PyTorch → ONNX → TensorRT INT8 (optional)
│
├── vitals_edge/                       ← on-device service (FastAPI)
│   ├── __init__.py
│   ├── runner.py                      ← ModelRunner: ONNX/TRT backend + parity check
│   ├── inference.py                   ← InferenceCore: loads artifacts, scores SensorWindow
│   ├── decision.py                    ← DecisionEngine: state machine HEALTHY→WATCH→WARNING→CRITICAL
│   ├── ingest.py                      ← ReplayIngest, MqttIngest, CanIngest (guarded)
│   ├── alert.py                       ← LocalAlerter: GPIO (Jetson/Pi) + console fallback
│   └── app.py                         ← FastAPI: GET /health, POST /predict, GET /alerts
│
├── vitals_cloud/                      ← thin cloud layer
│   ├── __init__.py
│   ├── subscriber.py                  ← MQTT subscriber → validates + stores alerts
│   ├── storage.py                     ← InfluxDB / SQLite adapter + retention policy
│   ├── twin.py                        ← Lightweight digital twin (numpy/scipy degradation curve)
│   └── dashboard.py                   ← Streamlit: live tiles, RUL chart, fleet map, event log
│
├── scripts/
│   └── demo.py                        ← One-command demo with narration + network-unplug cue
│
├── tests/
│   ├── test_schemas.py
│   ├── test_preprocess.py
│   ├── test_loaders.py
│   ├── test_replay.py
│   ├── test_models.py
│   ├── test_runner.py
│   ├── test_inference.py
│   ├── test_decision.py
│   ├── test_ingest.py
│   ├── test_alert.py
│   ├── test_app.py                    ← httpx-based integration test
│   ├── test_subscriber.py
│   ├── test_twin.py
│   ├── test_e2e.py                    ← full chain + latency report (p50/p95/max)
│   └── test_offline.py               ← network-loss resilience
│
├── artifacts/                         ← saved model artifacts (gitignored except .gitkeep)
│   └── .gitkeep
│
├── data/                              ← raw + processed datasets (gitignored)
│   └── .gitkeep
│
├── docker-compose.yml                 ← Mosquitto + InfluxDB
└── DEMO.md                            ← storyboard with timings
```

---

## Proposed Changes — Component by Component

---

### A · Repo Skeleton & Shared Schemas

#### [NEW] `vitals-edge/pyproject.toml`
Editable package install defining three extras: `train`, `edge`, `cloud`.

#### [NEW] `vitals-edge/Makefile`
Unified entrypoints:
```
make install-train    # pip install -e .[train]
make download-data   # fetch C-MAPSS + CWRU
make train-anomaly   # vitals_train/train_anomaly.py
make train-rul       # vitals_train/train_rul.py
make export          # vitals_train/export.py
make replay          # vitals_data/replay.py --fault
make run-edge        # uvicorn vitals_edge.app:app
make run-cloud       # python vitals_cloud/subscriber.py + streamlit
make demo            # scripts/demo.py
make test            # pytest -x tests/
make test-e2e        # pytest tests/test_e2e.py -v
```

#### [NEW] `vitals_common/schemas.py`
Key Pydantic v2 models:
```python
class SensorWindow(BaseModel):
    asset_id: str
    timestamp: datetime
    channels: dict[str, list[float]]   # channel_name → window samples
    window_size: int
    sample_rate_hz: float

class Prediction(BaseModel):
    anomaly_score: float               # 0..1 (normalized reconstruction error)
    rul_estimate: float                # cycles to failure
    fault_class: str | None           # "bearing_inner", "imbalance", etc.
    confidence: float                  # 0..1

class HealthState(str, Enum):
    HEALTHY = "HEALTHY"
    WATCH   = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class HealthEvent(BaseModel):
    asset_id: str
    timestamp: datetime
    state: HealthState
    prediction: Prediction
    message: str

class Alert(BaseModel):
    asset_id: str
    timestamp: datetime
    state: HealthState
    anomaly_score: float
    rul_estimate: float
    message: str
```

---

### B · Data Layer

#### [NEW] `vitals_data/loaders.py`
Loaders for all four datasets with consistent return format:
- `load_cmapss(fd="FD001")` → `(train_df, test_df, rul_labels)` with RUL column computed
- `load_cwru(sample_rate=12000)` → bearing vibration windows with fault labels
- `load_ai4i()` → 10k IIoT records for quick multi-label baseline
- `load_ieee_phm()` → FEMTO bearing accelerated-life data

Each loader uses a tiny bundled synthetic stand-in when the download is missing (so tests pass offline).

#### [NEW] `vitals_data/replay.py`
```python
class Replayer:
    def __init__(self, source: str | Path, rate: float = 1.0, seed: int = 42): ...
    def stream(self) -> Iterator[SensorWindow]: ...
    def inject_fault(self): ...   # switches to run-to-failure sub-sequence
```
- CLI: `python -m vitals_data.replay --source data/cmapss/FD001_train.csv --fault --rate 50`
- Publishes to MQTT topic OR yields directly (dual mode)
- Deterministic with seed

---

### C · Shared Preprocessing

#### [NEW] `vitals_common/preprocess.py`
**The single most important anti-skew module — identical code path at train and serve time.**

```python
def make_windows(df, window_size=30, stride=1) -> np.ndarray: ...
def fit_scaler(windows: np.ndarray) -> StandardScaler: ...    # fit on train only
def apply_scaler(windows, scaler) -> np.ndarray: ...
def vibration_features(window: np.ndarray) -> np.ndarray:
    # FFT magnitude + envelope spectrum (Hilbert) + RMS + kurtosis
def make_features(window: np.ndarray, scaler: StandardScaler) -> np.ndarray:
    # One call: scale + vibration_features → feature vector
def save_scaler(scaler, path: str | Path): ...               # joblib
def load_scaler(path: str | Path) -> StandardScaler: ...
```

Fully typed, pure functions, no global state. Scaler saved as `artifacts/scaler.joblib`.

---

### D · ML Models

#### [NEW] `vitals_train/models.py`

**AnomalyAutoencoder (PyTorch)**
```python
class AnomalyAutoencoder(nn.Module):
    def __init__(self, input_dim, latent_dim=32): ...
    def forward(self, x) -> tuple[Tensor, Tensor]: ...     # reconstruction, latent
    def anomaly_score(self, x) -> Tensor: ...              # MSE reconstruction error
```

**IsolationForestWrapper (scikit-learn)**
```python
class IsolationForestWrapper:
    def fit(self, X): ...
    def score(self, x) -> float: ...                        # 0..1 normalized
```

**CNNLSTMRul (PyTorch)**
```python
class CNNLSTMRul(nn.Module):
    # 1-D Conv → LSTM → Linear
    def __init__(self, n_features, seq_len, hidden=64, n_layers=2): ...
    def forward(self, x: Tensor) -> Tensor: ...             # shape (B,) → RUL
```
- Small enough for INT8 quantization
- Reproducible seed
- Best checkpoint saved

#### [NEW] `vitals_train/train_anomaly.py`
- Trains on healthy windows only
- Threshold = 99th percentile of healthy reconstruction error
- Reports ROC-AUC on held-out healthy-vs-fault split
- Saves artifact: `artifacts/anomaly/{model.onnx, threshold.json, scaler.joblib}`

#### [NEW] `vitals_train/train_rul.py`
- Sliding-window Dataset from C-MAPSS FD001
- Piecewise-linear RUL label capping (standard)
- MSE loss + asymmetric scoring function
- Early stopping on val RMSE
- Reports RMSE + asymmetric score vs plain-LSTM baseline
- Saves artifact: `artifacts/rul/{model.onnx, metadata.json}`

#### [NEW] `vitals_train/export.py`
```python
def export_to_onnx(model, dummy_input, path): ...
def build_tensorrt_engine(onnx_path, precision="int8"): ...    # guarded, Jetson-only
def parity_check(pt_model, onnx_path, input_data, tol=1e-4): ...
def benchmark(runner, n_runs=200) -> dict:                      # p50/p95/max latency
    ...
```
Graceful CPU fallback: if TensorRT/CUDA absent → ONNX Runtime.

---

### E · Edge Service

#### [NEW] `vitals_edge/runner.py`
```python
class ModelRunner:
    def __init__(self, onnx_path: str, use_tensorrt: bool = False): ...
    def infer(self, features: np.ndarray) -> np.ndarray: ...
    def latency_benchmark(self, n=100) -> dict: ...
```
Single interface for ONNX Runtime (CPU) and TensorRT (Jetson). Import-guarded.

#### [NEW] `vitals_edge/inference.py`
```python
class InferenceCore:
    def __init__(self, anomaly_artifact: Path, rul_artifact: Path): ...
    def score(self, window: SensorWindow) -> Prediction: ...
    # Thread-safe; loads artifacts once at startup
    # Applies vitals_common.preprocess.make_features internally
```
Returns `Prediction` in < 300 ms on CPU.

#### [NEW] `vitals_edge/decision.py`
```python
class DecisionEngine:
    # State machine: HEALTHY → WATCH → WARNING → CRITICAL
    # Hysteresis: N consecutive readings above threshold before state up-transitions
    # Debounce: M readings below threshold before state down-transitions
    def update(self, prediction: Prediction) -> HealthEvent | None:
        # Returns event only on state change OR heartbeat interval
```
Thresholds and hysteresis windows all config-driven (`config.yaml`).

#### [NEW] `vitals_edge/ingest.py`
```python
class BaseIngest(ABC):
    async def stream(self) -> AsyncIterator[SensorWindow]: ...

class ReplayIngest(BaseIngest): ...     # from Replayer
class MqttIngest(BaseIngest): ...      # subscribe to sensor topic
class CanIngest(BaseIngest): ...       # OBD-II via python-can (import-guarded)

def get_ingest(mode: str) -> BaseIngest:
    # mode from INGEST env var: "replay" | "mqtt" | "can"
```

#### [NEW] `vitals_edge/alert.py`
```python
class LocalAlerter:
    def trigger(self, event: HealthEvent): ...
    # Jetson/Pi: GPIO pin HIGH (LED/buzzer) when state >= WARNING
    # Laptop fallback: coloured console banner (rich) + optional desktop notification
    # Hardware access import-guarded
```

#### [NEW] `vitals_edge/app.py`
```python
# FastAPI
GET  /health   → {status, model_versions, uptime}
POST /predict  → SensorWindow → {prediction, state, latency_ms}
GET  /alerts   → list[Alert] (last N events, configurable)
```
- Startup: loads `InferenceCore`, `DecisionEngine`, `LocalAlerter`
- Each `/predict` call: `InferenceCore.score()` → `DecisionEngine.update()` → MQTT publish → `LocalAlerter.trigger()`
- Structured JSON logging of latency per request
- Runs with `uvicorn vitals_edge.app:app`

---

### F · Cloud Layer

#### [NEW] `vitals_cloud/subscriber.py`
- Connects to Mosquitto, reconnects on drop
- Validates incoming `Alert` / `HealthEvent` JSON against shared schemas
- Writes to storage via `storage.py`
- Buffers to disk if DB unavailable

#### [NEW] `vitals_cloud/storage.py`
```python
class Storage(ABC):
    def write(self, event: HealthEvent): ...
    def query(self, asset_id: str, start: datetime, end: datetime) -> list[HealthEvent]: ...

class InfluxStorage(Storage): ...    # production
class SQLiteStorage(Storage): ...   # demo / offline
```
Asset-ID-indexed, sane retention policy (30 days default).

#### [NEW] `vitals_cloud/twin.py`
```python
class DegradationTwin:
    def fit(self, timestamps: list, rul_values: list): ...
    def project(self) -> dict:
        # Returns: estimated_failure_date, confidence_band (±), trend_model
    def what_if(self, load_factor: float) -> dict:
        # Shifts curve for heavier/lighter duty cycle
```
Pure numpy/scipy — no 3D engine. Handles sparse history gracefully.

#### [NEW] `vitals_cloud/dashboard.py`
Streamlit app:
- **Live health tiles** per asset — colour by state (green/yellow/orange/red)
- **RUL countdown chart** (plotly line chart with confidence band from twin)
- **Digital twin projection** — what-if slider for load factor
- **Scrolling event log** (last 50 events)
- **Fleet map** (simple table or map if GPS available)
- Auto-refresh every 2 s via `st.rerun()`
- Degrades gracefully: "Last seen: X ago" if feed stops
- Demo-ready dark theme

---

### G · Integration Tests & Demo

#### [NEW] `tests/test_e2e.py`
```
make test-e2e
```
- Starts local Mosquitto broker
- Launches edge service
- Runs replay harness with --fault
- Subscribes as cloud
- Asserts: alert produced, state reaches WARNING/CRITICAL, p95 latency < 2 s
- Prints latency report (p50/p95/max)

#### [NEW] `tests/test_offline.py`
- Runs edge service + replay
- Simulates broker unreachable
- Asserts local detection still runs, local alert fires
- Asserts buffered alerts flush in order on reconnect

#### [NEW] `scripts/demo.py`
```
make demo
```
- Boots everything (broker, edge service, dashboard)
- Starts healthy replay with on-screen narration
- On keypress (or 30 s timer): injects fault
- Prints "PULL THE NETWORK CABLE NOW" cue
- Confirms local detection continues

#### [NEW] `DEMO.md`
Storyboard with exact timings for the live prototype stage.

---

## Open Questions

> [!IMPORTANT]
> **Q1: Dashboard UI** — Should the dashboard be Streamlit (faster to build) or Grafana (more professional-looking for judges)? The plan defaults to **Streamlit** since it's Python-native and faster to iterate.

> [!IMPORTANT]
> **Q2: Database** — Should we default to **SQLite** (zero-dependency, works offline) or **InfluxDB** (time-series native, needs Docker)? Plan uses SQLite as default with InfluxDB via docker-compose as opt-in.

> [!NOTE]
> **Q3: Hardware** — Since you're likely developing on a **laptop** (Windows), the GPIO and TensorRT paths will be import-guarded and safely stubbed. The full Jetson path requires Linux. Is this the intended dev environment?

> [!NOTE]
> **Q4: Dataset download** — C-MAPSS is a NASA dataset (~2 MB zip). CWRU bearing data is ~100 MB. Should the loaders auto-download, or should we include a `make download-data` script with manual steps?

---

## Build Order (2-Week Rhythm)

| Days | Prompts | Milestone |
|---|---|---|
| 1–2 | Repo + Schemas + Loaders + Preprocess + Replay | `make replay` streams windows |
| 3–6 | Anomaly model + RUL CNN-LSTM + Export | Models trained, ONNX exported |
| 7–9 | Edge service (Runner → Inference → Decision → Ingest → Alert → FastAPI) | `make run-edge` → end-to-end <2 s |
| 10–11 | Cloud (Subscriber → Storage → Twin → Dashboard) | Live dashboard + RUL countdown |
| 12 | E2E + Offline tests + Demo script | `make demo` runs full story |

---

## Verification Plan

### Automated Tests
```bash
make test          # all unit tests
make test-e2e      # full chain, latency report
pytest tests/test_offline.py   # network-loss resilience
```

### Acceptance Criteria
- `make replay` → windows flow to edge service ✓
- `POST /predict` → valid Prediction + state in < 300 ms on CPU ✓
- MQTT Alert published per prediction ✓
- Anomaly model ROC-AUC clearly separates healthy vs fault ✓
- RUL RMSE ~ 15–20 cycles on C-MAPSS FD001 ✓
- p95 end-to-end latency < 2 s (test_e2e.py) ✓
- With broker down: local WARNING/CRITICAL still fires ✓
- `make demo` runs healthy → fault → alert → offline story end-to-end ✓
