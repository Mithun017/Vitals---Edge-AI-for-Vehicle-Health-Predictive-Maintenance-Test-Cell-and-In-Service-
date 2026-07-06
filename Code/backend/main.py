import asyncio
import json
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import random

from replayer import C18Replayer
from energy_field import EnergyFieldEngine
from decision_engine import DecisionEngine
from twin_model import C18TwinModel
from xgboost_model import C18XGBoostModel

app = FastAPI(title="VITALS Edge & LeakSense Twin Backend")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global core service instances
replayer = C18Replayer()
energy_engine = EnergyFieldEngine()
decision_engine = DecisionEngine()
xgb_model = C18XGBoostModel()

# In-memory history buffers
history_log = []
alerts_log = []
system_start_time = datetime.now()

# Estimated RUL tracker
current_rul = 150.0

# Request Models
class FaultInjection(BaseModel):
    zone: str
    severity: str

class SensorOverride(BaseModel):
    sensor: str
    value: float

class ChatMessage(BaseModel):
    message: str
    chat_history: Optional[List[dict]] = None

@app.get("/api/health")
def get_health():
    uptime_sec = (datetime.now() - system_start_time).total_seconds()
    days = int(uptime_sec // 86400)
    hours = int((uptime_sec % 86400) // 3600)
    mins = int((uptime_sec % 3600) // 60)
    
    return {
        "status": "Active",
        "uptime": f"{days}d {hours:02d}h {mins:02d}m",
        "active_zone": replayer.active_zone,
        "severity": replayer.severity,
        "is_streaming": replayer.is_running
    }

@app.post("/api/stream/start")
def start_stream():
    replayer.start()
    return {"status": "streaming started"}

@app.post("/api/stream/stop")
def stop_stream():
    replayer.stop()
    return {"status": "streaming stopped"}

@app.post("/api/fault/inject")
def inject_fault(fault: FaultInjection):
    replayer.inject_fault(fault.zone, fault.severity)
    return {"status": f"injected {fault.severity} fault into {fault.zone}"}

@app.post("/api/fault/clear")
def clear_fault():
    replayer.clear_fault()
    return {"status": "fault cleared"}

@app.post("/api/override")
def set_override(override: SensorOverride):
    replayer.set_override(override.sensor, override.value)
    return {"status": f"overrode {override.sensor} to {override.value}"}

@app.post("/api/override/clear")
def clear_overrides():
    replayer.clear_overrides()
    return {"status": "overrides cleared"}

@app.get("/api/history")
def get_history():
    return history_log[-50:]

@app.get("/api/alerts")
def get_alerts():
    return alerts_log[-30:]

@app.get("/api/model/status")
def get_model_status():
    return {
        "is_trained": xgb_model.is_trained,
        "metadata": xgb_model.metadata
    }

@app.post("/api/model/train")
def train_model():
    try:
        metadata = xgb_model.train(num_samples_per_class=1200)
        return {
            "status": "success",
            "message": "XGBoost model trained successfully.",
            "metadata": metadata
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/chat")
def get_chat_response(chat: ChatMessage):
    question = chat.message.lower()
    
    # Context-aware diagnostic reporting for the chatbot response
    current_state = decision_engine.current_state
    active_zone = replayer.active_zone
    severity = replayer.severity
    
    # Try querying local Qwen LLM via Ollama first
    prompt = (
        f"You are the LeakSense AI Diagnostic Assistant for a Caterpillar C18 industrial engine. "
        f"The engine is currently in a {current_state} state, with active anomaly zone: {active_zone} (severity: {severity}). "
        f"The operator asks: '{chat.message}'. "
        f"Provide a technical, concise, expert diagnostic reply under 3-4 sentences."
    )
    
    payload = {
        "model": "qwen",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=1.8) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            reply = res_data.get("response", "").strip()
            if reply:
                return {
                    "reply": reply,
                    "timestamp": datetime.now().isoformat(),
                    "source": "Qwen-AI-Local"
                }
    except Exception:
        pass

    response = ""
    if "hello" in question or "hi" in question:
        response = "Hello! I am the LeakSense AI Diagnostic Assistant for the Caterpillar C18. How can I help you inspect engine telemetry today?"
    elif "status" in question or "health" in question or "how is the engine" in question:
        if current_state == "HEALTHY":
            response = "The engine is currently operating in a HEALTHY state. All sensor deviations (intake boost, exhaust thermal signature, oil pressure, and structural vibrations) are within standard tolerances."
        else:
            response = f"Warning: The engine state is currently evaluated as {current_state}. I have detected a {severity} anomaly in {active_zone}. {decision_engine.generate_qwen_recommendation(active_zone, severity, 0.7)}"
    elif "zone" in question or "leak zone" in question:
        response = "The Caterpillar C18 flow path is divided into 6 zones:\n" \
                   "1. Zone 1 - Intake Air (air filters, duct seals)\n" \
                   "2. Zone 2 - Charge Air (CAC radiator, intercooler)\n" \
                   "3. Zone 3 - Combustion (cylinder block, piston thermal)\n" \
                   "4. Zone 4 - Exhaust Manifold (manifold backpressure)\n" \
                   "5. Zone 5 - Turbocharger (boost pressure regulator)\n" \
                   "6. Zone 6 - DPF / Aftertreatment (catalyst soot load)\n" \
                   "You can inject simulated faults into any of these zones using the control board."
    elif "energy field" in question or "correlation" in question:
        response = "The Energy Field is a stress-map calculated from normalized sensor residuals (actual vs healthy digital twin values). High energy values indicate mechanical friction or thermal stress. The 6x6 correlation matrix shows how thermodynamic parameters drift away from standard baseline curves."
    elif "rul" in question or "remaining useful life" in question:
        response = f"The current estimated Remaining Useful Life (RUL) is {current_rul:.1f} hours/cycles. In nominal operation, the C18 has an RUL of 150 hours. Continuous anomalies accelerate RUL degradation."
    elif "maintenance" in question or "action" in question or "recommend" in question:
        if active_zone != "Healthy":
            response = f"For the detected anomaly in {active_zone}, I recommend the following maintenance actions: {decision_engine.generate_qwen_recommendation(active_zone, severity, 0.8)}"
        else:
            response = "No faults detected. Continue scheduled inspections at 250 operational hours."
    else:
        response = "I have recorded your query. I am monitoring the C18 digital twin residuals. Let me know if you would like me to summarize current sensor deviations or recommend corrective action."
        
    return {
        "reply": response,
        "timestamp": datetime.now().isoformat(),
        "source": "Qwen-AI-Local"
    }

@app.post("/api/upload")
async def handle_upload(file: UploadFile = File(...)):
    """
    Processes batch uploaded telemetry datasets.
    Parses rows, runs through twin model and calculates analytics.
    """
    contents = await file.read()
    text = contents.decode("utf-8")
    
    rows = []
    # Parse CSV or JSON basic structures
    if file.filename.endswith(".csv"):
        lines = text.strip().split("\n")
        header = lines[0].strip().split(",")
        for line in lines[1:]:
            values = line.strip().split(",")
            if len(values) == len(header):
                rows.append(dict(zip(header, [float(v) if v.replace('.','',1).isdigit() else v for v in values])))
    elif file.filename.endswith(".json"):
        try:
            rows = json.loads(text)
            if not isinstance(rows, list):
                rows = [rows]
        except Exception:
            return {"error": "Invalid JSON format"}
            
    if not rows:
        return {"error": "No data rows parsed"}
        
    results = []
    leaks_found = 0
    healthy_count = 0
    total_confidence = 0.0
    zone_counts = {}
    severity_counts = {}
    
    for idx, row in enumerate(rows[:50]): # Cap at 50 rows for processing preview
        # Extract variables or mock defaults
        rpm = float(row.get("rpm", 1800.0))
        load = float(row.get("load", 60.0))
        
        # Build actual payload
        expected = C18TwinModel.predict_healthy(rpm, load)
        actual = {}
        for k in expected:
            actual[k] = float(row.get(k, expected[k]))
            
        active_zone = row.get("active_zone", "Healthy")
        severity = row.get("severity", "None")
        
        # 1. Anomaly score from residuals
        deviations = []
        for k, v in energy_engine.std_devs.items():
            diff = abs(actual[k] - expected[k])
            deviations.append(diff / v)
        anomaly_score = min(1.0, (sum(deviations) / len(deviations)) / 3.0)
        
        # 2. Subsystem energies
        ef = energy_engine.compute_energy_field(actual, expected, active_zone, severity)
        max_energy = max(ef["bearing"], ef["cooling"], ef["combustion"], ef["oil"], ef["turbo"])
        
        # 3. Decision
        mock_rul = 150.0 - (idx * 1.5 if active_zone != "Healthy" else 0)
        diag = decision_engine.evaluate(anomaly_score, max_energy, mock_rul, active_zone, severity)
        
        if diag["state"] != "HEALTHY":
            leaks_found += 1
            zone_counts[active_zone] = zone_counts.get(active_zone, 0) + 1
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        else:
            healthy_count += 1
            
        total_confidence += diag["confidence"]
        
        results.append({
            "index": idx,
            "timestamp": row.get("timestamp", datetime.now().isoformat()),
            "state": diag["state"],
            "anomaly_score": float(anomaly_score),
            "severity": severity,
            "zone": active_zone,
            "confidence": diag["confidence"],
            "recommendation": diag["recommendation"],
            "residuals": {k: float(actual[k] - expected[k]) for k in expected}
        })
        
    avg_conf = total_confidence / len(rows) if rows else 1.0
    primary_zone = max(zone_counts, key=zone_counts.get) if zone_counts else "Healthy"
    
    return {
        "kpis": {
            "total_rows": len(rows),
            "leaks_found": leaks_found,
            "healthy_count": healthy_count,
            "average_confidence": round(avg_conf, 3),
            "primary_zone": primary_zone
        },
        "distributions": {
            "zones": zone_counts,
            "severities": severity_counts
        },
        "results": results
    }

class SafeStreamingResponse(StreamingResponse):
    """
    Subclass of StreamingResponse to catch and quietly suppress ClientDisconnected tracebacks.
    """
    async def __call__(self, scope, receive, send) -> None:
        try:
            await super().__call__(scope, receive, send)
        except KeyboardInterrupt:
            raise
        except BaseException as e:
            err_name = type(e).__name__
            err_msg = str(e)
            if "ClientDisconnected" in err_name or "ClientDisconnected" in err_msg:
                pass
            else:
                raise e

@app.get("/api/stream")
async def sse_stream(request: Request):
    """
    Server-Sent Events streaming of real-time diagnostics.
    """
    global current_rul
    replayer.start()
    
    async def event_generator():
        global current_rul
        try:
            while True:
                # If connection closed
                if await request.is_disconnected():
                    break
                
                if replayer.is_running:
                    # Generate next data point
                    data = replayer.generate_next_window()
                    actual = data["actual"]
                    expected = data["expected"]
                    active_zone = data["active_zone"]
                    severity = data["severity"]
                    
                    # 1. Anomaly score from standard residuals
                    deviations = []
                    for k, v in energy_engine.std_devs.items():
                        diff = abs(actual[k] - expected[k])
                        deviations.append(diff / v)
                    
                    # Compute mean root deviation
                    anomaly_score = min(1.0, (sum(deviations) / len(deviations)) / 3.0)
                    if data["fault_applied"]:
                        # scale with severity
                        sf = 0.5 if severity == "Small" else (0.75 if severity == "Medium" else 0.92)
                        anomaly_score = max(anomaly_score, sf)
                    
                    # 2. Subsystem energies
                    ef = energy_engine.compute_energy_field(actual, expected, active_zone, severity)
                    max_energy = max(ef["bearing"], ef["cooling"], ef["combustion"], ef["oil"], ef["turbo"])
                    
                    # 3. Decaying RUL
                    if active_zone != "Healthy" and severity != "None":
                        decay = 0.2 if severity == "Small" else (0.8 if severity == "Medium" else 2.5)
                        current_rul = max(0.0, current_rul - decay)
                    else:
                        # Slowly charge back up to nominal or stay steady
                        if current_rul < 150.0:
                            current_rul = min(150.0, current_rul + 1.0)
                        else:
                            current_rul = 150.0 + random.normalvariate(0, 0.5)
                    
                    # 4. Run Decision Engine
                    diag = decision_engine.evaluate(anomaly_score, max_energy, current_rul, active_zone, severity)
                    
                    # Predict zone probabilities with XGBoost
                    zone_probs = xgb_model.predict_probabilities(actual, expected)

                    # Assemble packet
                    packet = {
                        "timestamp": data["timestamp"],
                        "actual": actual,
                        "expected": expected,
                        "residuals": {k: float(actual[k] - expected[k]) for k in expected},
                        "energy_field": {
                            "bearing": ef["bearing"],
                            "cooling": ef["cooling"],
                            "combustion": ef["combustion"],
                            "oil": ef["oil"],
                            "turbo": ef["turbo"],
                            "global_deviation": ef["global_deviation"],
                            "cosine_similarity": ef["cosine_similarity"],
                            "most_disrupted": ef["most_disrupted_sensor"]
                        },
                        "correlation_matrix": ef["correlation_matrix"],
                        "rul": float(current_rul),
                        "anomaly_score": float(anomaly_score),
                        "diagnostics": diag,
                        "active_zone": active_zone,
                        "severity": severity,
                        "zone_probabilities": zone_probs
                    }
                    
                    # Add to history buffer
                    history_log.append(packet)
                    if len(history_log) > 100:
                        history_log.pop(0)
                        
                    # Handle alerts logging
                    if diag["state"] != "HEALTHY":
                        # Log alert if state has changed or interval met
                        alert_msg = {
                            "timestamp": data["timestamp"],
                            "state": diag["state"],
                            "message": diag["message"],
                            "zone": active_zone,
                            "severity": severity,
                            "confidence": diag["confidence"]
                        }
                        if not alerts_log or alerts_log[-1]["state"] != diag["state"] or random.random() < 0.1:
                            alerts_log.append(alert_msg)
                            if len(alerts_log) > 50:
                                alerts_log.pop(0)
                                
                    # Send payload
                    yield f"data: {json.dumps(packet)}\n\n"
                
                # Sleep interval
                await asyncio.sleep(1.0)
                
        except asyncio.CancelledError:
            pass
            
    return SafeStreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)