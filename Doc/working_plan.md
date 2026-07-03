# VITALS-Edge — Working Development Plan

**Vehicle Intelligent Telemetry & Anomaly-Learning System**
Tata InnoVent-27 · Category 3.2.1.3 — Edge AI for Vehicle Health & Predictive Maintenance
Team Algorithm404 · Sri Eshwar College of Engineering

---

## 1. What We Are Building (One Paragraph)

An **edge-first predictive-maintenance system** that detects incipient engine / rotating-machinery faults **on the device in under 2 seconds**, estimates **Remaining Useful Life (RUL)** in real time, and ships only **< 1 KB alert packets** to a thin cloud dashboard with a lightweight digital twin. The entire pipeline is demoable **without any real engine** — public run-to-failure datasets (NASA C-MAPSS, CWRU bearing, AI4I 2020) are replayed as a real-time sensor stream into the exact same edge service that would run in the field.

### Non-Negotiable Design Rules

1. **Edge-first** — all inference runs on-device; it must keep working with the network unplugged.
2. **Hardware-optional demo** — everything runs on a plain laptop CPU; Jetson is an upgrade, not a dependency.
3. **One shared preprocessing module** — training and serving import the same code (zero train/serve skew).
4. **Small payloads** — anything crossing to the cloud is a compact, schema-validated JSON < 1 KB.

---

## 2. Fixed Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| Training | PyTorch, scikit-learn, NumPy/SciPy, pandas |
| Edge inference | ONNX Runtime (CPU fallback) → TensorRT INT8 (Jetson) |
| Edge service | FastAPI + Uvicorn |
| Messaging | MQTT (Mosquitto broker, paho-mqtt client), TLS |
| Storage | SQLite (demo) / InfluxDB (production path) |
| Dashboard | Streamlit (Grafana optional) |
| Config | pydantic-settings + `.env` (no hardcoded paths) |
| Quality | type hints, pydantic schemas, pytest, ruff + black, pre-commit |
| Target hardware | NVIDIA Jetson Orin Nano Super (67 INT8 TOPS, $249) — laptop CPU always supported |

### Datasets

| Dataset | Purpose |
|---|---|
| NASA C-MAPSS (FD001–FD004) | RUL model training + the live "countdown to failure" demo |
| CWRU bearing (12/48 kHz vibration) | Vibration anomaly detection + fault-class demo |
| AI4I 2020 (UCI) | Fast tabular multi-fault classification baseline |
| Bench rig (optional, later) | Motor + flywheel with seeded imbalance for live validation |

---

## 3. Repository Structure

```
vitals-edge/
├── pyproject.toml              # pinned deps, ruff/black config
├── .env.example                # every config knob documented
├── .pre-commit-config.yaml
├── Makefile                    # install | lint | test | replay | run-edge | run-dashboard | test-e2e | demo
├── README.md
├── docker-compose.yml          # Mosquitto + InfluxDB (cloud layer)
│
├── vitals_common/              # ── shared contracts (both sides import this)
│   ├── config.py               # pydantic-settings Settings from .env
│   ├── schemas.py              # SensorWindow, Prediction, HealthEvent, Alert (<1 KB)
│   └── preprocess.py           # windowing, scaling, FFT/envelope features — ONE code path
│
├── vitals_data/                # ── data layer
│   ├── loaders.py              # load_cmapss(), load_cwru(), load_ai4i() → Parquet cache
│   └── replay.py               # Replayer: streams recorded runs at 1x/5x/50x, --fault flag
│
├── vitals_train/               # ── offline training (laptop/Colab)
│   ├── models.py               # autoencoder, CNN-LSTM RUL, baselines
│   ├── train_anomaly.py        # trains on HEALTHY only, saves model+threshold+scaler artifact
│   ├── train_rul.py            # C-MAPSS FD001, RMSE + asymmetric score, early stopping
│   └── export.py               # → ONNX, optional TensorRT INT8, parity check, latency bench
│
├── vitals_edge/                # ── the on-device core
│   ├── runner.py               # ModelRunner: one interface for ONNX-CPU / TensorRT
│   ├── inference.py            # InferenceCore: window → Prediction (<300 ms)
│   ├── decision.py             # state machine HEALTHY→WATCH→WARNING→CRITICAL, hysteresis
│   ├── ingest.py               # ReplayIngest | MqttIngest | CanIngest (import-guarded)
│   ├── alert.py                # local LED/buzzer (Jetson) / console banner (laptop) + MQTT publish with offline buffer
│   └── app.py                  # FastAPI: GET /health, POST /predict, GET /alerts
│
├── vitals_cloud/               # ── deliberately thin
│   ├── subscriber.py           # MQTT → validate → store, reconnect + disk buffer
│   ├── storage.py              # SQLite/InfluxDB adapter
│   ├── twin.py                 # degradation-curve projection + what_if(load_factor)
│   └── dashboard.py            # Streamlit: health tiles, RUL countdown, twin view, event log
│
├── scripts/
│   └── demo.py                 # one-command demo: healthy → fault → alert → network-cut
│
├── tests/
│   ├── test_schemas.py …       # unit tests per module
│   ├── test_e2e.py             # full chain, asserts p95 latency < 2 s
│   └── test_offline.py         # broker down → local alert still fires, buffered alerts resync
│
└── docs/
    ├── architecture.mmd        # Mermaid diagram
    ├── metrics_report.md       # auto-generated from artifacts
    ├── DEMO.md                  # demo storyboard with timings
    └── pitch.md                 # 2-min script mapped to judging stages
```

---

## 4. Data & Control Flow

```
[Dataset replay OR real sensors/CAN]
        │  SensorWindow (pydantic)
        ▼
┌────────────────── EDGE BOX ──────────────────┐
│ preprocess (shared) → InferenceCore          │
│   ├── anomaly autoencoder → anomaly_score    │
│   └── CNN-LSTM → rul_estimate                │
│ decision engine → HEALTHY/WATCH/WARNING/CRIT │
│   ├── LOCAL alert (LED/console) ← works offline
│   └── Alert JSON <1 KB → MQTT (buffered)     │
└──────────────────────┬───────────────────────┘
                       ▼
        Mosquitto → subscriber → SQLite/InfluxDB
                       ▼
        digital twin projection + Streamlit dashboard
```

---

## 5. Phased Build Plan

> Follows the Prompt Playbook cards (0–20). Each step has a hard acceptance gate — do not move on until it passes. Commit after every green gate.

### Phase 1 — Foundation (Days 1–2) · Prompts 0–5

| Step | Deliverable | Acceptance gate |
|---|---|---|
| 1.1 Master context | `CLAUDE.md` with Prompt 0 content | assistant context loaded |
| 1.2 Repo scaffold | full tree, Makefile, pre-commit, pinned deps | `make install`, `make lint`, `make test` all run |
| 1.3 Config + schemas | `config.py`, `schemas.py` | all models round-trip JSON; Alert < 1024 bytes |
| 1.4 Dataset loaders | `loaders.py` + Parquet cache | correct shapes; RUL column on C-MAPSS; tests pass offline |
| 1.5 Shared preprocessing | `preprocess.py` + saved scaler | identical features from train path and serve path |
| 1.6 Replay harness | `replay.py` with `--fault` flag | `make replay` streams windows; deterministic with seed |

**Milestone M1: a replayed run streams SensorWindows in real time.**

### Phase 2 — Models (Days 3–6) · Prompts 6–8

| Step | Deliverable | Acceptance gate |
|---|---|---|
| 2.1 Anomaly detector | autoencoder + IsolationForest baseline, 99th-pct threshold artifact | reconstruction error separates healthy vs fault; ROC-AUC reported |
| 2.2 RUL model | CNN-LSTM on FD001, piece-wise RUL cap, early stopping | RMSE ≈ 15–20 cycles; beats plain-LSTM baseline; checkpoint saved |
| 2.3 Export & quantize | ONNX export, TensorRT path, `ModelRunner` | ONNX matches PyTorch within tolerance; runs on CPU; p50/p95 latency printed |

**Milestone M2: trained models with real metrics — this is the Round-2 (virtual PoC) evidence.**

### Phase 3 — Edge Service (Days 7–9) · Prompts 9–13

| Step | Deliverable | Acceptance gate |
|---|---|---|
| 3.1 Inference core | `inference.py` | SensorWindow → valid Prediction in < 300 ms on CPU |
| 3.2 Decision engine | `decision.py` with hysteresis/debounce | rising trend gives clean HEALTHY→WATCH→WARNING→CRITICAL, no flapping |
| 3.3 FastAPI service | `app.py` | `make run-edge` serves; /predict returns state; MQTT alert published |
| 3.4 Ingest adapters | `ingest.py` (replay/mqtt/can) | `INGEST=replay\|mqtt\|can` in .env switches source, no code edits |
| 3.5 Local alert | `alert.py` GPIO + console fallback | WARNING/CRITICAL fires visible local alert with **no network** |

**Milestone M3: end-to-end fault detection < 2 s on the device.**

### Phase 4 — Thin Cloud + Twin (Days 10–11) · Prompts 14–16

| Step | Deliverable | Acceptance gate |
|---|---|---|
| 4.1 Subscriber + storage | `subscriber.py`, `storage.py`, docker-compose | published Alert lands in store, queryable by asset_id/time |
| 4.2 Digital twin | `twin.py` (numpy trend projection, `what_if`) | projected failure date shifts sensibly with load_factor |
| 4.3 Dashboard | Streamlit: tiles, RUL countdown, twin, event log, fleet view | with replay + edge running, dashboard updates live; RUL visibly counts down |

**Milestone M4: the full visual story is live.**

### Phase 5 — Hardening, Demo & Docs (Days 12–14) · Prompts 17–20

| Step | Deliverable | Acceptance gate |
|---|---|---|
| 5.1 E2E integration test | `test_e2e.py` + latency report | passes; p95 window→alert < 2 s on laptop |
| 5.2 Offline-resilience test | `test_offline.py` + buffering | broker down → local alert still fires; buffered alerts flush on reconnect **in order** |
| 5.3 Demo automation | `scripts/demo.py`, `make demo` | one command runs healthy→fault→alert→network-cut story |
| 5.4 Docs & pitch | README, Mermaid diagram, metrics report, pitch script | newcomer goes clone→demo using README alone |

**Milestone M5: rehearsed live demo, including the network-unplug moment.**

### Phase 6 — Stretch (only if all gates green)

- Jetson Orin Nano deployment with TensorRT INT8 (turns the edge claim tangible).
- Bench rig with seeded imbalance for live physical validation.
- Transformer / CNN-BiLSTM-attention RUL upgrade.
- AWS mapping slide: IoT Core + Timestream + Managed Grafana (partner alignment).
- Roadmap items stay roadmap: computer vision inspection, LLM maintenance assistant, in-service fleet.

---

## 6. KPIs (Demo Targets)

| KPI | Target |
|---|---|
| Fault detection | ≥ 90% precision, ≥ 90% recall |
| Edge-to-alert latency | p95 < 2 s (inference < 300 ms) |
| RUL error (C-MAPSS FD001) | RMSE ~15–20 cycles |
| False alarms | < 1 per demo session |
| Data to cloud | < 1 KB per alert vs MB/s raw |
| Offline resilience | full local detection + buffered alerts with zero network |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| No engine/instrumentation | Replay harness — the whole system demos on a laptop |
| Scarce fault labels | Unsupervised anomaly detector trained on healthy data only |
| Model too heavy for edge | Compact CNN-LSTM, INT8 quantization; fallback: anomaly-only on Pi |
| Train/serve skew bugs | One shared `preprocess.py`, parity test enforced in CI |
| Demo fragility on stage | Deterministic replay, pre-recorded backup, rehearsed network-cut |
| Scope creep (CV/LLM/AR) | Explicitly parked as roadmap; MVP = vibration + CAN health only |
| Connectivity gaps | Local alerting + disk-buffered MQTT with ordered resync |

---

## 8. Definition of Done (MVP)

The MVP is complete when **`make demo`** on a plain laptop:

1. Boots broker, edge service, dashboard, and a healthy replay stream.
2. Shows live health tiles and a stable HEALTHY state.
3. On fault injection, the state climbs WATCH → WARNING → CRITICAL within 2 s of the fault signature, the local alert fires, and the RUL curve visibly counts down.
4. With the network cut, local detection and local alerts continue; on reconnect, buffered alerts flush in order and the dashboard catches up.
5. `make test` and `make test-e2e` are green, and the README takes a newcomer from clone to demo unaided.

---

## 9. Immediate Next Actions

1. Create `Code/vitals-edge/` and put the Prompt-0 master context in `CLAUDE.md`.
2. Scaffold the repo (Phase 1.2) — Makefile, pyproject, package tree.
3. Download C-MAPSS + CWRU datasets and wire the loaders.
4. Build the replay harness — everything downstream depends on it.
