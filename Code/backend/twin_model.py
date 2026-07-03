import numpy as np

class C18TwinModel:
    """
    Physics-informed statistical twin model for the Caterpillar C18 engine.
    Given operating context (RPM and Load), it predicts expected healthy sensor readings.
    """
    @staticmethod
    def predict_healthy(rpm: float, load: float) -> dict:
        """
        Calculate expected healthy baselines for C18 engine sensors.
        - rpm: 800 to 2200 RPM
        - load: 0 to 100 %
        """
        # Ensure values are within reasonable limits
        rpm = np.clip(rpm, 600, 2500)
        load = np.clip(load, 0, 110)
        
        # 1. Intake Pressure (kPa) - increases with RPM and Load (boost pressure)
        # Baseline is atmospheric ~100 kPa. Boost adds up to 150 kPa under full load.
        intake_pressure = 100.0 + (rpm - 800) * 0.03 + load * 0.8
        
        # 2. Combustion Temp / Exhaust Gas Temp (°C) - strongly related to load & fuel burn
        # Idles around 200°C, reaches ~650°C under peak load.
        combustion_temp = 180.0 + (rpm - 800) * 0.1 + load * 3.5
        
        # 3. Coolant Temp (°C) - thermostatically regulated, steady around 85-92°C
        # Rises slightly with load and RPM.
        coolant_temp = 82.0 + (rpm - 800) * 0.003 + load * 0.08
        
        # 4. Oil Pressure (PSI) - gear pump driven, pressure rises with RPM, drops with oil temp (viscosity)
        # Typically 30 PSI to 65 PSI.
        oil_pressure = 35.0 + (rpm - 800) * 0.015 - (coolant_temp - 80.0) * 0.1
        oil_pressure = np.clip(oil_pressure, 20, 80)
        
        # 5. Vibration (g) - structural vibrations increase with rotational speed (RPM) and torque
        # Typically 0.2g to 1.5g.
        vibration = 0.2 + (rpm / 1000.0) * 0.4 + (load / 100.0) * 0.2
        
        # 6. Battery Voltage (V) - alternators regulate around 24.2V - 24.6V on industrial machinery
        battery_voltage = 24.0 + (rpm / 2000.0) * 0.4
        battery_voltage = np.clip(battery_voltage, 23.8, 24.8)
        
        return {
            "intake_pressure": float(intake_pressure),
            "combustion_temp": float(combustion_temp),
            "coolant_temp": float(coolant_temp),
            "oil_pressure": float(oil_pressure),
            "vibration": float(vibration),
            "battery_voltage": float(battery_voltage)
        }
