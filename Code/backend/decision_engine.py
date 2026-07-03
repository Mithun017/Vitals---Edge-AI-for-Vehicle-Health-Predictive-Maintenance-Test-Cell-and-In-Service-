import urllib.request
import json

class DecisionEngine:
    """
    State machine and diagnostics classifier for the engine health monitoring.
    Uses hysteresis thresholds to prevent alarm flapping.
    Integrates with local Qwen LLM for diagnostic recommendations.
    """
    def __init__(self):
        self.current_state = "HEALTHY"
        self.consecutive_healthy_needed = 5
        self.healthy_counter = 0

    def generate_qwen_recommendation(self, zone: str, severity: str, anomaly_score: float) -> str:
        """
        Queries local Qwen model via Ollama for a customized maintenance recommendation.
        Falls back to localized expert rules if LLM service is offline.
        """
        if zone == "Healthy":
            return "[Qwen-AI-Local] Caterpillar C18 operating within nominal thermal, pressure, and structural vibration parameters. Continue scheduled 250-hour inspections."

        prompt = (
            f"You are a Caterpillar C18 industrial engine diagnostics expert. "
            f"We have detected a {severity} anomaly in {zone} (deviation score: {anomaly_score:.2f}). "
            f"Generate a single-sentence or short bulleted maintenance recommendation. "
            f"Identify specific engine components, sensors, or seals to inspect. Do not write introduction."
        )
        
        payload = {
            "model": "qwen",
            "prompt": prompt,
            "stream": False
        }
        
        try:
            req = urllib.request.Request(
                "http://localhost:11434/api/generate",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            # Short timeout to keep SSE telemetry stream fluid (1.2 seconds)
            with urllib.request.urlopen(req, timeout=1.2) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                output = res_data.get("response", "").strip()
                if output:
                    return f"[Qwen-AI-Local] {output}"
        except Exception:
            pass

        # Robust expert-rule fallback if Ollama/Qwen is offline
        fallbacks = {
            "Zone 1": "Intake Air restriction. Action: Check filter restriction gauge, inspect seal bellows for cracks, and clean hot-wire MAF sensor elements.",
            "Zone 2": "Charge Air Cooler / Coolant loop thermal drift. Action: Check coolant level, inspect radiator cap seal, check CAC face for external debris, and run thermostat diagnostic.",
            "Zone 3": "Combustion chamber thermal variance. Action: Perform fuel rail pressure bleed, run cylinder cut-out test, and check Cylinder 4 injector solenoid resistance.",
            "Zone 4": "Exhaust manifold leakage. Action: Check manifold flanges for soot tracks/gas blowby, torque mounting fasteners to 55 Nm, and check turbo joint clamp.",
            "Zone 5": "Turbocharger boost leakage. Action: Inspect wastegate actuator rod travel, check boost sensor hose condition, and inspect compressor wheel for axial play.",
            "Zone 6": "DPF particulate obstruction. Action: Trigger stationary active DPF regeneration, inspect pressure tube sensor lines, and check soot load percentage."
        }
        
        advice = fallbacks.get(zone, "Inspect engine core systems for anomalies.")
        return f"[Qwen-AI-Local] {advice} (Fault: {severity}, Score: {anomaly_score:.2f})"

    def evaluate(self, anomaly_score: float, max_energy: float, current_rul: float, active_zone: str, severity: str) -> dict:
        """
        Evaluate health state based on anomaly parameters and RUL.
        Applies hysteresis: transitioning back to HEALTHY requires 5 consecutive healthy records.
        """
        # Determine raw target state
        if anomaly_score >= 0.85 or max_energy >= 0.85 or current_rul < 20:
            target_state = "CRITICAL"
        elif anomaly_score >= 0.65 or max_energy >= 0.70 or current_rul < 72:
            target_state = "WARNING"
        elif anomaly_score >= 0.45 or max_energy >= 0.40 or current_rul < 120:
            target_state = "WATCH"
        else:
            target_state = "HEALTHY"

        # Apply hysteresis for recovery
        if target_state == "HEALTHY" and self.current_state in ["WATCH", "WARNING", "CRITICAL"]:
            self.healthy_counter += 1
            if self.healthy_counter >= self.consecutive_healthy_needed:
                self.current_state = "HEALTHY"
                self.healthy_counter = 0
        else:
            # Immediate escalation
            if self.current_state != target_state and self.state_severity_rank(target_state) > self.state_severity_rank(self.current_state):
                self.current_state = target_state
                self.healthy_counter = 0
            elif target_state != "HEALTHY":
                self.current_state = target_state
                self.healthy_counter = 0
                
        # Confidence calculation
        base_confidence = 0.98 - (anomaly_score * 0.1)
        if self.current_state == "HEALTHY":
            confidence = max(0.92, base_confidence)
        elif self.current_state == "WATCH":
            confidence = 0.85 + (anomaly_score - 0.45) * 0.2
        elif self.current_state == "WARNING":
            confidence = 0.88 + (anomaly_score - 0.65) * 0.3
        else: # CRITICAL
            confidence = 0.94 + (anomaly_score - 0.85) * 0.4
            
        confidence = min(confidence, 1.0)
        
        message = f"Diagnostics: System in {self.current_state} state."
        if self.current_state != "HEALTHY":
            message = f"Anomaly detected in {active_zone}. Severity: {severity}."
            
        recommendation = self.generate_qwen_recommendation(active_zone, severity, anomaly_score)
        
        return {
            "state": self.current_state,
            "confidence": float(confidence),
            "message": message,
            "recommendation": recommendation,
            "is_go": self.current_state == "HEALTHY",
            "is_hold": self.current_state in ["WATCH", "WARNING"],
            "is_nogo": self.current_state == "CRITICAL"
        }

    @staticmethod
    def state_severity_rank(state: str) -> int:
        ranks = {"HEALTHY": 0, "WATCH": 1, "WARNING": 2, "CRITICAL": 3}
        return ranks.get(state, 0)
