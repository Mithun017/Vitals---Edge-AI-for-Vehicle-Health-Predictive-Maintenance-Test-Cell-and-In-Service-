# VITALS Edge & LeakSense Twin

### Vehicle Intelligent Telemetry & Anomaly-Learning System (Caterpillar C18 ACERT Twin)
An edge-first predictive-maintenance and digital twin visualization system designed to detect incipient engine faults, compute subsystem stress energy, evaluate health states in real time, and project Remaining Useful Life (RUL).

---

## 🌟 Key Features

- **3D Digital Twin Visualizer:** High-fidelity, real-time 3D model of the Caterpillar C18 ACERT engine block showcasing active leakage zones, sensor hotspots, and structural nodes.
- **Physics-Informed Digital Twin:** Predicts healthy baseline metrics (Boost Pressure, Combustion Temp, Coolant Temp, Oil Pressure, Vibration, and Battery Voltage) dynamically according to operational context (RPM and Load).
- **Component-Level Energy Fields:** Normalizes sensor residuals (Z-score style) to compute real-time stress scores (0.0 to 1.0) for 5 core subsystems:
  - *Bearing / Structural*
  - *Cooling System*
  - *Combustion / Injector*
  - *Oil / Lubrication*
  - *Turbocharger / Electrical*
- **Thermodynamic Correlation Matrix:** Real-time 6x6 correlation grid indicating deviations in joint parameter relationships (e.g., Exhaust Temp vs Coolant Temp) with global cosine similarity calculations.
- **State Diagnostics Machine:** Classifies health states into `HEALTHY`, `WATCH`, `WARNING`, and `CRITICAL`. Implements a hysteresis buffer requiring **5 consecutive healthy ticks** to recover from an anomaly state.
- **Interactive AI Diagnostics Chatbot:** Integrates with local Qwen models running via Ollama to generate expert diagnostic explanations and maintenance tips, falling back to robust rule-based systems if offline.

---

## 📁 Repository Structure

```
66. Edge AI for Vehicle Health & Predictive Maintenance/
├── .gitignore                      # Git exclusion patterns
├── README.md                       # Main project documentation
├── Doc/                            # Specifications, plans, and PDFs
│   ├── development.pdf             # Design documents
│   ├── ui.md                       # Frontend UI structure details
│   └── working_plan.md             # Phased development strategy
│
└── Code/                           # Source files
    ├── run.bat                     # Windows startup orchestrator script
    │
    ├── backend/                    # Python FastAPI Backend
    │   ├── main.py                 # REST API endpoints & SSE telemetry streaming
    │   ├── replayer.py             # Telemetry generator with fault & override layers
    │   ├── twin_model.py           # Physics-informed healthy baseline estimator
    │   ├── energy_field.py         # Subsystem energy & correlation matrix engine
    │   ├── decision_engine.py      # Health state evaluator & local Qwen integration
    │   └── requirements.txt        # Python dependency file
    │
    └── frontend/                   # React + Vite Frontend
        ├── src/App.jsx             # Main client shell and layout
        ├── src/index.css           # Global typography and glassmorphism styling
        ├── src/main.jsx            # Application entrypoint wrapping React router
        ├── src/views/              # Component views
        │   ├── FleetDashboardView.jsx  # Main controls & fleet overview
        │   ├── DigitalTwinView.jsx     # Iframe embedding the 3D twin page
        │   ├── AIAnalysisView.jsx      # Historical trends & correlation analytics
        │   ├── MaintenanceView.jsx     # Logging and diagnostic recommendations
        │   ├── VehicleDetailsView.jsx  # Custom sensor details & manual overrides
        │   └── LoginView.jsx           # Portal access control
        └── public/
            └── leaksense_fixed_v5.html # The standalone 3D Three.js engine visualizer
```

---

## 🚀 Getting Started

### Prerequisites

1. **Python 3.10+** (with `pip`)
2. **Node.js 18+** (with `npm`)
3. (Optional) **Ollama** with `qwen` model pulled to enable local AI chatbot features:
   ```bash
   ollama pull qwen
   ```

### Quick Start (Windows)

Double-click the **`run.bat`** file located inside the `Code/` directory or run it from command line:
```cmd
cd Code
run.bat
```
This script will automatically:
1. Start the FastAPI server on `http://localhost:8000`.
2. Start the Vite React development server on `http://localhost:5173`.
3. Open your default web browser to the Fleet Dashboard.

---

## 🛠️ Step-by-Step Manual Launch

If you prefer to start the servers manually:

### 1. Start the Backend Server

```bash
cd Code/backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

### 2. Start the Frontend Server

```bash
cd Code/frontend
npm install
npm run dev
```

---

## ⚙️ How the Engine Twin Simulation Works

### 1. Data Streaming & Fault Injection
- The simulation runs at **1 Hz**.
- Use the **Fleet Dashboard** to simulate leakages across different **Zones (1 to 6)** with three levels of severity (`Small`, `Medium`, `Critical`).
- The anomaly score, RUL decay rate, and stress energy fields dynamically respond to active fault selections.

### 2. Interactive Overrides
- Under **Vehicle Details**, operators can manually override individual sensors (e.g. setting vibration to 2.5g or load to 110%).
- Manual overrides bypass baseline estimates to test warning thresholds and state transitions immediately.

### 3. Diagnostic Assistant (Chatbot)
- Click the message bubble in the bottom right corner of the dashboard to open the AI Assistant.
- Ask questions like:
  - *“How is the engine health?”*
  - *“What does the energy field represent?”*
  - *“What should I inspect for Zone 1?”*
- If Ollama is running, the chatbot responds using Qwen with localized parameters. If not, it falls back to expert rules.
