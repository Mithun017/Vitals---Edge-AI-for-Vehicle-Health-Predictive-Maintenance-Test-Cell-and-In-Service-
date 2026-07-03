import time
import random
from datetime import datetime
from twin_model import C18TwinModel

class C18Replayer:
    """
    Simulates real-time sensor streams for a Caterpillar C18 Diesel Engine.
    Enables interactive fault injection and parameter overrides.
    """
    def __init__(self):
        self.is_running = False
        self.active_zone = "Healthy"   # Healthy, Zone 1, Zone 2, ..., Zone 6
        self.severity = "None"         # None, Small, Medium, Critical
        self.overrides = {}            # manual overrides for any sensor
        self.fuel_level = 95.0         # fuel level percentage
        self.tick_count = 0

    def start(self):
        self.is_running = True

    def stop(self):
        self.is_running = False

    def reset(self):
        self.active_zone = "Healthy"
        self.severity = "None"
        self.overrides = {}
        self.fuel_level = 95.0
        self.tick_count = 0

    def inject_fault(self, zone: str, severity: str):
        self.active_zone = zone
        self.severity = severity

    def clear_fault(self):
        self.active_zone = "Healthy"
        self.severity = "None"

    def set_override(self, sensor: str, value: float):
        self.overrides[sensor] = value

    def clear_overrides(self):
        self.overrides = {}

    def generate_next_window(self) -> dict:
        """
        Generates the next step of telemetry, merging baseline physics, 
        active faults, and manual overrides.
        """
        self.tick_count += 1
        
        # 1. Base Context: RPM and Load (with subtle natural fluctuations)
        base_rpm = self.overrides.get("rpm", 1800.0 + math_fluctuation(15.0, 0.05, self.tick_count))
        base_load = self.overrides.get("load", 60.0 + math_fluctuation(4.0, 0.02, self.tick_count))
        
        # 2. Get expected healthy baseline
        expected = C18TwinModel.predict_healthy(base_rpm, base_load)
        
        # Add basic white noise to actuals
        actual = {k: expected[k] + random.normalvariate(0, expected[k] * 0.015) for k in expected}
        # Vibration has a specific standard noise profile
        actual["vibration"] = expected["vibration"] + random.normalvariate(0, 0.03)
        actual["battery_voltage"] = expected["battery_voltage"] + random.normalvariate(0, 0.02)
        
        # 3. Apply active fault signatures
        fault_applied = False
        if self.active_zone != "Healthy" and self.severity != "None":
            fault_applied = True
            sev_factor = 1.0
            if self.severity == "Small":
                sev_factor = 1.2
            elif self.severity == "Medium":
                sev_factor = 2.0
            elif self.severity == "Critical":
                sev_factor = 3.5
                
            # Perturb sensors based on active zone
            if self.active_zone == "Zone 1":  # Intake Air -> pressure drops, vibration goes up
                actual["intake_pressure"] -= 10.0 * sev_factor
                actual["vibration"] += 0.15 * sev_factor
            elif self.active_zone == "Zone 2":  # Charge Air / Cooling -> Coolant temp elevates
                actual["coolant_temp"] += 4.0 * sev_factor
                actual["combustion_temp"] += 12.0 * sev_factor
            elif self.active_zone == "Zone 3":  # Combustion / cylinder -> combustion temp spikes, vibration jumps
                actual["combustion_temp"] += 35.0 * sev_factor
                actual["vibration"] += 0.3 * sev_factor
            elif self.active_zone == "Zone 4":  # Exhaust / lubrication -> oil pressure drops, temp rises
                actual["oil_pressure"] -= 6.0 * sev_factor
                actual["coolant_temp"] += 2.0 * sev_factor
            elif self.active_zone == "Zone 5":  # Turbo charger -> intake pressure drops heavily, exhaust spikes
                actual["intake_pressure"] -= 25.0 * sev_factor
                actual["combustion_temp"] += 20.0 * sev_factor
            elif self.active_zone == "Zone 6":  # DPF backpressure -> exhaust temp rises, vibration spikes
                actual["combustion_temp"] += 25.0 * sev_factor
                actual["vibration"] += 0.2 * sev_factor

        # 4. Apply manual overrides (which override baseline AND faults)
        for sensor, value in self.overrides.items():
            actual[sensor] = value

        # Ensure physical boundaries
        actual["coolant_temp"] = max(20.0, actual["coolant_temp"])
        actual["oil_pressure"] = max(5.0, actual["oil_pressure"])
        actual["vibration"] = max(0.05, actual["vibration"])
        actual["intake_pressure"] = max(50.0, actual["intake_pressure"])
        
        # Update fuel level (slowly drains, wraps back when empty)
        self.fuel_level -= 0.05
        if self.fuel_level <= 5.0:
            self.fuel_level = 95.0
            
        # Add basic context parameters
        actual["rpm"] = float(base_rpm)
        actual["load"] = float(base_load)
        actual["fuel_level"] = float(self.fuel_level)
        
        # Package and return
        return {
            "timestamp": datetime.now().isoformat(),
            "actual": actual,
            "expected": expected,
            "active_zone": self.active_zone,
            "severity": self.severity,
            "fault_applied": fault_applied
        }

def math_fluctuation(amplitude: float, frequency: float, tick: int) -> float:
    """Helper to generate smooth natural fluctuation waves using sine."""
    import math
    return amplitude * math.sin(tick * frequency)
