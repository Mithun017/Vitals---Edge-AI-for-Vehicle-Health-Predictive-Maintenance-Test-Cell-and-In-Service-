# LeakSense Twin — UI Component Reference

LeakSense Twin is a physics-informed, machine learning-driven Digital Twin and diagnostics dashboard for the **Caterpillar C18 Diesel Engine**. This document serves as a comprehensive reference guide to the user interface pages and components within the React + Vite frontend application.

---

## 🎨 Global Styling & Design System
The visual style is defined in [index.css](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/index.css), utilizing a premium, glassmorphic dark interface styled after the **Caterpillar (CAT) Industrial Theme** (predominantly `#ffcd11` yellow and dark bronze/charcoal accents).

### CSS Custom Properties (Variables)
- **Primary Background**: `#050505` (`--bg-primary`)
- **Secondary Background**: `#0c0b08` (`--bg-secondary`)
- **Card Background**: `rgba(18, 16, 12, 0.65)` (`--bg-card`)
- **Caterpillar Yellow Accent**: `#ffcd11` (`--accent-yellow`, `--text-accent`)
- **Emerald Accent (Healthy Status)**: `#10b981` (`--accent-emerald`, `--status-go`)
- **Red Accent (Critical Alert)**: `#ef4444` (`--accent-red`, `--status-nogo`)
- **Fonts**: 
  - Sans-Serif: `Inter`
  - Monospace: `JetBrains Mono`

---

## 🏛️ Layout Structure
The application wrapper resides in [App.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/App.jsx) and implements:
1. **Sidebar Navigation** (`Sidebar`): Left-anchored collapsible navigation. Icons use inline premium SVGs.
2. **Main Header**: Displays the current page title, connection state badge (`LIVE` / `OFFLINE`), and theme toggle.
3. **AI Chatbot Overlay** (`ChatBot`): Floating interactive assistant available globally.

---

## 📄 Page-by-Page UI Reference

### 1. Dashboard Page (`/dashboard` or `/`)
Designed for real-time visualization of live telemetry streams. It displays core metrics, heatmaps, and digital twin outputs.

#### Page Components
- **Go/No-Go Indicator** (`GoNoGoIndicator`): 
  - Displays engine diagnostic status (`GO` / `HOLD` / `NO-GO`).
  - Adapts border colors and animations to status (`--accent-emerald` for GO, `--accent-red` for NO-GO, `--accent-yellow` for HOLD).
  - Includes a smooth confidence bar transition showing how certain the ML model is.
- **Confidence Ring / 3D Diagnostic Viewer** (`ConfidenceRing`): 
  - Displays a static placeholder when the engine is operating normally.
  - Dynamically mounts [ZoneGLBViewerFixed.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/ZoneGLBViewerFixed.jsx) when a leak is detected to highlight the suspected zone in a localized 3D rendering of the engine parts (loaded from lightweight `.glb` files).
- **Leak Alert Card** (`LeakAlertCard`):
  - Shows the suspected leak zone (e.g. `Zone 2 — Charge Air`).
  - Highlights severity labels (`NONE`, `SMALL`, `MEDIUM`, `CRITICAL`) with distinct tag stylings.
  - Reports estimated flow loss percentage and Qwen AI-suggested recommended maintenance actions.
- **Live Sensors Grid** (`SensorGrid`):
  - 2-column key-value grid rendering real-time readings (RPM, MAF, MAP, Temperatures, fuel quantity) formatted with measurement units.
- **Energy Field Heatmap** (`EnergyFieldHeatmap`):
  - Visualizes a 6x6 correlation matrix representing thermodynamic relationship shifts.
  - Maps numeric cell values to custom color scales (green for normal, red/orange/yellow for anomalies).
  - Displays summary metrics: *Global Deviation*, *Cosine Similarity*, and *Most Disrupted Sensor*.
- **Digital Twin Residuals Card** (`ResidualsCard`):
  - Plots the differences between live measurements and healthy physics-based baselines.
  - Renders horizontal bar fills dynamically colored according to anomaly severity.
- **Zone Probabilities & Recommendation Panel** (`ZoneProbabilities`):
  - Draws horizontal progress bars mapping probability percentages (0–100%) for all 6 engine zones + Healthy baseline.
  - Includes a contextual AI Recommendations box that displays diagnostic lists mapping to the highest suspect zone.
- **Demo Stream Controls**:
  - Anchored at the top of the dashboard.
  - **Start/Stop Live Demo** button.
  - Dropdowns for injecting custom simulation zones (Zones 1-6 or Healthy) and severities (Small, Medium, Large) to instantly observe model predictions.

---

### 2. Analysis Page (`/engine`)
Provides override mechanisms and advanced diagnostic tools, including engine schematics and acoustic spectrum validations.

#### Page Components
- **Live Sensor Overrides** (`InteractiveLevelMeters`):
  - Set of range sliders allowing engineers to manual adjust sensor parameters (RPM, MAF, Boost pressure, Exhaust temperature, DPF differential pressure, Fuel quantity).
  - Uses CSS background gradients representing current values.
- **Acoustic Leak Detector** (`AcousticLeakDetector`):
  - Custom audio component providing frequency-based validation.
  - Contains selectors for pre-recorded WAV samples of engine audio (Categorized into healthy and leak sounds) and a native audio playback frame.
  - Features an **"Analyze Audio Leak Signatures"** button.
  - Renders frequency indicators on analysis complete: RMS Energy, Peak Amplitude, Spectral Centroid (Hz), Zero-Crossing Rate, and High Frequency ratio.
- **Engine Diagram Map** (`EngineDiagram`):
  - Schematic layout representing the 6 sequential flow zones of the Caterpillar C18.
  - Clicking any zone box instantly mocks those specific sensor threshold patterns in the backend and highlights the block in pulsing red/orange.
- **Energy Field Deviation Graph** (`EnergyFieldGraph`):
  - Vertical bar chart representing absolute average deviation per sensor channel (MAF, Boost, CAC Out, Exhaust, DPF, RPM).

---

### 3. History Page (`/history`)
Presents a simple, high-readability overview of logging metrics.

#### Page Components
- **Prediction History Table** (`HistoryTable`):
  - Chronological tabular list showing the past 15 diagnostic runs.
  - Renders timestamps, colored status dots (`LEAK` / `OK`), confidence, zone indices, severity levels, and GO/NO-GO evaluations.

---

### 4. Sensor Hub Page (`/dax`)
Contains the DAQ device integrations and mathematical data query interfaces. Renders [DAXConsole.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/DAXConsole.jsx).

#### Page Components
- **DAX Query Editor**:
  - Integrates a Monaco Code Editor instance to compose queries on telemetry buffers (e.g. `AVERAGEX`, `COUNTROWS`, `FILTER`).
  - Features quick-query buttons for presets (e.g. "Live Leak Rate", "Avg MAF (Live)").
- **Circular Gauges** (`CircularGauge`):
  - Circular SVG gauges rendering live DAQ values (Engine RPM, Throttle Position, Coolant Temp, Oil Pressure, Air-Fuel Ratio, Health Score).
- **Telemetry Trend Chart** (`ResultLineChart`):
  - Zero-dependency custom SVG line graph that draws trendlines with linear shading, minimum/maximum indicators, and node dots representing real-time telemetry inputs.
- **DAQ Connection Controls**:
  - Options to configure DAQ connection type (Simulated or Serial COM Ports), sampling rates, and recording status.
  - Renders real-time execution outputs, websocket packet packet statistics, and secondary AI risk indicators (leak risk, turbo failure probability, injector failure, sensor drift).

---

### 5. Digital Twin Page (`/digital-twin`)
The primary interactive 3D model viewer rendering [DigitalTwinViewer.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/DigitalTwinViewer.jsx).

#### Page Components
- **Viewer Frame**:
  - Full-screen iframe wrapping the static `LeakSense_v5_Fixed.html` asset.
- **Three.js WebGL Canvas**:
  - Loads the massive 112 MB GLB engine assembly (`c18.glb`).
  - Supports OrbitControls (drag to rotate, scroll to zoom, shift+drag to pan).
- **Control Bar Overlay**:
  - Auto-rotation toggle (`R` key).
  - Explode slider mapping assembly displacements.
- **Sidebar Metadata Inspector**:
  - List of parts with zone classifications.
  - Dynamically populates part names, technical specs, and diagnostic summaries on clicking physical mesh models (driven by data configurations in [partInfo.js](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/digitaltwin/partInfo.js)).

---

### 6. Upload & Check Page (`/upload`)
The diagnostic pipeline center for uploading static telemetry spreadsheets, generating mock test data, or pasting raw JSON packets.

#### Page Components
- **Pipeline Mode Cards**:
  - 4 cards containing interactive mouse-hover styling representing distinct modes:
    1. *Live Stream*: Navigates back to the Dashboard to initiate active websockets.
    2. *Upload Data File*: Activates a file drop zone supporting Drag & Drop for `.csv` and `.json` files.
    3. *Synthetic Simulation*: Opens config sliders (RPM, Row count, target zone, severity) to synthesize telemetry sequences.
    4. *Manual JSON Entry*: Provides a text editor allowing direct pasting of structured telemetry payloads.
- **Pipeline Configuration Grid**:
  - Configures global settings: *Confidence Threshold* (suppresses signals below limits), *Analysis Speed* (Fast 20ms / Normal 50ms / Detailed 120ms delays), and *Leak-Only Filters*.
- **Batch Progress Panel**:
  - Visualizes loading state with a large gradient progress bar and raw row counters.
- **KPI Summary Strip**:
  - Renders 5 KPI indicators after pipeline runs: Total Rows, Leaks Found, Healthy Count, Average Confidence, and Primary Suspected Zone.
- **Distribution Charts**:
  - Displays bar graphs for *Zone Distribution* and *Severity Breakdown* across the uploaded dataset.
- **Row-by-Row Table**:
  - Renders sorting headers (Row Index, Confidence, Severity, Flow Loss) and status tags.
  - Table rows expand on click to expose detailed Digital Twin residual arrays and recommended actions.
- **Data Exporter**:
  - **"Export CSV"** button allowing download of computed batch anomalies.

---

### 7. Test GLB Page (`/test-glb`)
Diagnostic tool rendering [TestGLB.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/TestGLB.jsx).

#### Page Components
- **Console Log Panel**:
  - Runs 5 diagnostic tests sequentially (Verifying Three.js imports, GLTFLoader modules, instance creations, network file access to `/models/zone1.glb`, and actual WebGL model parses).
  - Dumps step-by-step logs colored green (success), yellow (warning), or red (failure).

---

### 8. Global AI Chatbot Overlay
Renders [ChatBot.jsx](file:///c:/Users/MITHUN/Desktop/STUDIES/PROJECT/60.LeakSense_Twin%20-%20Digital%20Twin%20&%20Energy%20Field%20&%20ML%20Based%20Leak%20Detection%20and%20Localization%20in%20Engines/Development/Only%20testing/frontend/src/ChatBot.jsx).

#### Page Components
- **Floating Action Button**:
  - Fixed-position button at the bottom right corner with toggle transitions.
- **Chat Window Card**:
  - Glassmorphic popup header showing connection state to the Python FastAPI backend.
  - Suggestion chips representing common queries (e.g. "What are the 6 leak zones?", "Explain Energy Field").
  - Message bubble stack displaying response sources (e.g., local Ollama Qwen model badges).
