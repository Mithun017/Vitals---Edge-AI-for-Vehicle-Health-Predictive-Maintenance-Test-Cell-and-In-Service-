import numpy as np

class EnergyFieldEngine:
    """
    Computes component-level energy fields and shifts in the thermodynamic correlation matrix.
    Energy scores map to: Bearing, Cooling, Injector/Combustion, Oil/Lubrication, and Turbo/Electrical.
    """
    def __init__(self):
        # Baseline (healthy) correlation matrix between 6 core parameters:
        # [RPM, Load, Intake Pressure, Combustion Temp, Coolant Temp, Oil Pressure]
        self.healthy_corr = np.array([
            [1.00, 0.45, 0.85, 0.70, 0.30, 0.75],  # RPM
            [0.45, 1.00, 0.80, 0.90, 0.50, 0.20],  # Load
            [0.85, 0.80, 1.00, 0.85, 0.40, 0.65],  # Intake Pressure
            [0.70, 0.90, 0.85, 1.00, 0.55, 0.35],  # Combustion Temp
            [0.30, 0.50, 0.40, 0.55, 1.00, -0.30], # Coolant Temp
            [0.75, 0.20, 0.65, 0.35, -0.30, 1.00], # Oil Pressure
        ])
        
        # Standard deviations for normalizing residuals
        self.std_devs = {
            "intake_pressure": 5.0,     # kPa
            "combustion_temp": 15.0,    # °C
            "coolant_temp": 2.0,        # °C
            "oil_pressure": 3.0,        # PSI
            "vibration": 0.08,          # g
            "battery_voltage": 0.15     # V
        }

    def compute_energy_field(self, actual: dict, expected: dict, fault_zone: str = "Healthy", severity: str = "None") -> dict:
        """
        Computes normalized stress energy scores (0.0 to 1.0) for subsystems and 
        generates the current thermodynamic relationship correlation matrix.
        """
        # Calculate raw residuals
        res = {k: actual[k] - expected[k] for k in expected}
        
        # Compute normalized residuals (Z-score style)
        norm_res = {}
        for k in self.std_devs:
            if k in res:
                norm_res[k] = res[k] / self.std_devs[k]
        
        # 1. BEARING ENERGY: mainly driven by vibration residual
        # Idle/healthy is ~0.15. Anomalies push it up to 0.95.
        bearing_base = 0.15 + 0.3 * min(abs(norm_res.get("vibration", 0)), 2.0)
        if fault_zone == "Zone 1" or fault_zone == "Zone 6":  # Structural / bearing issues
            mult = 2.5 if severity == "Critical" else (1.8 if severity == "Medium" else 1.3)
            bearing_energy = min(bearing_base * mult, 0.98)
        else:
            bearing_energy = min(bearing_base, 0.95)

        # 2. COOLING ENERGY: coolant temperature residual and gradient
        cooling_base = 0.12 + 0.35 * min(abs(norm_res.get("coolant_temp", 0)), 2.0)
        if fault_zone == "Zone 2":  # Charge air cooler / cooling issue
            mult = 3.0 if severity == "Critical" else (2.0 if severity == "Medium" else 1.4)
            cooling_energy = min(cooling_base * mult, 0.99)
        else:
            cooling_energy = min(cooling_base, 0.92)

        # 3. INJECTOR/COMBUSTION ENERGY: exhaust/combustion temp and oil pressure instability
        combustion_base = 0.10 + 0.25 * min(abs(norm_res.get("combustion_temp", 0)), 2.0)
        if fault_zone == "Zone 3":  # Injector block / combustion issue
            mult = 3.2 if severity == "Critical" else (2.1 if severity == "Medium" else 1.4)
            combustion_energy = min(combustion_base * mult, 0.99)
        else:
            combustion_energy = min(combustion_base, 0.90)

        # 4. OIL/LUBRICATION ENERGY: oil pressure deviations
        oil_base = 0.14 + 0.3 * min(abs(norm_res.get("oil_pressure", 0)), 2.0)
        if fault_zone == "Zone 4":  # Oil leak / oil pressure issue
            mult = 2.8 if severity == "Critical" else (1.9 if severity == "Medium" else 1.3)
            oil_energy = min(oil_base * mult, 0.97)
        else:
            oil_energy = min(oil_base, 0.91)

        # 5. TURBO/ELECTRICAL ENERGY: intake pressure and battery voltage anomalies
        turbo_base = 0.11 + 0.3 * min(abs(norm_res.get("intake_pressure", 0)), 2.0)
        if fault_zone == "Zone 5":  # Turbo charger boost leakage
            mult = 3.1 if severity == "Critical" else (2.2 if severity == "Medium" else 1.5)
            turbo_energy = min(turbo_base * mult, 0.99)
        else:
            turbo_energy = min(turbo_base, 0.93)

        # 6. Generate the correlation matrix with thermodynamic shifts
        # Under normal conditions, matrix is close to healthy_corr.
        # Under active faults, correlations shift (we perturb the matrix).
        current_corr = self.healthy_corr.copy()
        
        perturbation = 0.0
        if fault_zone != "Healthy" and severity != "None":
            factor = 0.35 if severity == "Critical" else (0.22 if severity == "Medium" else 0.10)
            perturbation = factor
            
            # Apply shifts based on fault zone
            if fault_zone == "Zone 2": # Cooler fault -> shift coolant and combustion temp relations
                current_corr[3, 4] -= factor * 1.5  # Combustion Temp <-> Coolant Temp shifts
                current_corr[4, 3] -= factor * 1.5
            elif fault_zone == "Zone 3": # Combustion/Injector -> shift load and temp relation
                current_corr[1, 3] -= factor * 1.8
                current_corr[3, 1] -= factor * 1.8
            elif fault_zone == "Zone 5": # Turbo -> shift RPM and boost relation
                current_corr[0, 2] -= factor * 1.6
                current_corr[2, 0] -= factor * 1.6
        
        # Add slight random noise to correlations to feel alive
        noise = np.random.uniform(-0.02, 0.02, size=current_corr.shape)
        current_corr = np.clip(current_corr + noise, -1.0, 1.0)
        np.fill_diagonal(current_corr, 1.00) # diagonal is always 1.0
        
        # Compute summary metrics
        global_deviation = float(np.mean(np.abs(current_corr - self.healthy_corr)) * 10.0 + perturbation * 5.0)
        global_deviation = min(global_deviation, 10.0) # Scale 0 to 10
        
        # Cosine similarity between flat representations of matrices
        flat_healthy = self.healthy_corr.flatten()
        flat_current = current_corr.flatten()
        cosine_sim = float(np.dot(flat_healthy, flat_current) / (np.linalg.norm(flat_healthy) * np.linalg.norm(flat_current)))
        
        # Identify most disrupted sensor relation
        diff = np.abs(current_corr - self.healthy_corr)
        sensor_names = ["RPM", "Load", "Boost", "Exhaust Temp", "Coolant Temp", "Oil Pressure"]
        max_idx = np.unravel_index(np.argmax(diff), diff.shape)
        most_disrupted = f"{sensor_names[max_idx[0]]} vs {sensor_names[max_idx[1]]}"
        if fault_zone == "Healthy":
            most_disrupted = "None (Stable)"
        
        return {
            "bearing": float(bearing_energy),
            "cooling": float(cooling_energy),
            "combustion": float(combustion_energy),
            "oil": float(oil_energy),
            "turbo": float(turbo_energy),
            "correlation_matrix": current_corr.tolist(),
            "global_deviation": float(global_deviation),
            "cosine_similarity": float(cosine_sim),
            "most_disrupted_sensor": most_disrupted
        }
