import os
import json
import random
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from twin_model import C18TwinModel

class C18XGBoostModel:
    FEATURE_NAMES = [
        "rpm", "load", "intake_pressure_res", "combustion_temp_res",
        "coolant_temp_res", "oil_pressure_res", "vibration_res", "battery_voltage_res"
    ]
    
    CLASS_LABELS = {
        0: "Healthy",
        1: "Zone 1",
        2: "Zone 2",
        3: "Zone 3",
        4: "Zone 4",
        5: "Zone 5",
        6: "Zone 6"
    }

    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(model_dir, "c18_xgboost.json")
        self.status_path = os.path.join(model_dir, "c18_xgboost_status.json")
        self.model = None
        self.is_trained = False
        self.metadata = {}
        
        # Try loading pre-trained model if it exists
        if os.path.exists(self.model_path) and os.path.exists(self.status_path):
            try:
                self.model = xgb.XGBClassifier()
                self.model.load_model(self.model_path)
                with open(self.status_path, "r") as f:
                    self.metadata = json.load(f)
                self.is_trained = True
            except Exception as e:
                print(f"Error loading XGBoost model: {e}")
                self.model = None
                self.is_trained = False

    def train(self, num_samples_per_class=1200) -> dict:
        """
        Generate synthetic data, train the XGBoost classifier, save model and status metadata.
        """
        X, y = generate_synthetic_data(num_samples_per_class)
        
        # Split data into train and test sets
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Initialize and train XGBoost Classifier
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            objective="multi:softprob",
            num_class=7,
            random_state=42,
            eval_metric="mlogloss"
        )
        
        model.fit(X_train, y_train)
        
        # Evaluate performance on test set
        preds = model.predict(X_test)
        accuracy = float(accuracy_score(y_test, preds))
        
        # Retrieve feature importances
        importances = model.feature_importances_
        feature_importance_dict = {
            self.FEATURE_NAMES[i]: float(importances[i]) for i in range(len(self.FEATURE_NAMES))
        }
        
        # Serialize model structure
        model.save_model(self.model_path)
        
        # Write metadata status file
        import datetime
        self.metadata = {
            "accuracy": accuracy,
            "trained_at": datetime.datetime.now().isoformat(),
            "num_samples": int(X.shape[0]),
            "feature_importances": feature_importance_dict
        }
        
        with open(self.status_path, "w") as f:
            json.dump(self.metadata, f, indent=4)
            
        self.model = model
        self.is_trained = True
        
        return self.metadata

    def predict_probabilities(self, actual: dict, expected: dict) -> dict:
        """
        Runs real-time prediction of class probabilities from current telemetry values.
        """
        if not self.is_trained or self.model is None:
            # Return dummy probabilities (100% Healthy) if not trained
            probs = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
            return {self.CLASS_LABELS[i]: float(probs[i]) for i in range(7)}
            
        # Compute raw residuals
        res_intake = actual.get("intake_pressure", 0.0) - expected.get("intake_pressure", 0.0)
        res_comb = actual.get("combustion_temp", 0.0) - expected.get("combustion_temp", 0.0)
        res_cool = actual.get("coolant_temp", 0.0) - expected.get("coolant_temp", 0.0)
        res_oil = actual.get("oil_pressure", 0.0) - expected.get("oil_pressure", 0.0)
        res_vib = actual.get("vibration", 0.0) - expected.get("vibration", 0.0)
        res_batt = actual.get("battery_voltage", 0.0) - expected.get("battery_voltage", 0.0)
        
        features = [
            float(actual.get("rpm", 1800.0)),
            float(actual.get("load", 60.0)),
            float(res_intake),
            float(res_comb),
            float(res_cool),
            float(res_oil),
            float(res_vib),
            float(res_batt)
        ]
        
        # Reshape for single prediction
        X = np.array([features])
        probs = self.model.predict_proba(X)[0]
        
        return {self.CLASS_LABELS[i]: float(probs[i]) for i in range(7)}


def generate_synthetic_data(num_samples_per_class=1200):
    """
    Generates tabular dataset simulating sensor deviations across healthy operation and 6 fault zones.
    """
    X = []
    y = []
    
    for label in range(7):
        for _ in range(num_samples_per_class):
            # 1. Base Context: RPM and Load (randomized across operational ranges)
            rpm = random.uniform(800.0, 2200.0)
            load = random.uniform(10.0, 100.0)
            
            # 2. Get expected healthy baseline
            expected = C18TwinModel.predict_healthy(rpm, load)
            
            # 3. Add base white noise to build standard actual measurements
            actual = {}
            for k in expected:
                actual[k] = expected[k] + random.normalvariate(0, expected[k] * 0.015)
            actual["vibration"] = expected["vibration"] + random.normalvariate(0, 0.03)
            actual["battery_voltage"] = expected["battery_voltage"] + random.normalvariate(0, 0.02)
            
            # 4. Inject specific fault offsets if label > 0
            if label > 0:
                severity = random.choice(["Small", "Medium", "Critical"])
                if severity == "Small":
                    sev_factor = random.uniform(1.0, 1.4)
                elif severity == "Medium":
                    sev_factor = random.uniform(1.6, 2.4)
                else: # Critical
                    sev_factor = random.uniform(3.0, 4.0)
                
                zone_name = f"Zone {label}"
                
                # Apply zone-specific offset signatures
                if zone_name == "Zone 1":
                    actual["intake_pressure"] -= 10.0 * sev_factor
                    actual["vibration"] += 0.15 * sev_factor
                elif zone_name == "Zone 2":
                    actual["coolant_temp"] += 4.0 * sev_factor
                    actual["combustion_temp"] += 12.0 * sev_factor
                elif zone_name == "Zone 3":
                    actual["combustion_temp"] += 35.0 * sev_factor
                    actual["vibration"] += 0.3 * sev_factor
                elif zone_name == "Zone 4":
                    actual["oil_pressure"] -= 6.0 * sev_factor
                    actual["coolant_temp"] += 2.0 * sev_factor
                elif zone_name == "Zone 5":
                    actual["intake_pressure"] -= 25.0 * sev_factor
                    actual["combustion_temp"] += 20.0 * sev_factor
                elif zone_name == "Zone 6":
                    actual["combustion_temp"] += 25.0 * sev_factor
                    actual["vibration"] += 0.2 * sev_factor
            
            # Apply slight additional sensor fluctuation noise
            for k in actual:
                actual[k] += random.normalvariate(0, expected[k] * 0.005)
                
            # Enforce physical constraints
            actual["coolant_temp"] = max(20.0, actual["coolant_temp"])
            actual["oil_pressure"] = max(5.0, actual["oil_pressure"])
            actual["vibration"] = max(0.05, actual["vibration"])
            actual["intake_pressure"] = max(50.0, actual["intake_pressure"])
            
            # Calculate residuals
            res_intake = actual["intake_pressure"] - expected["intake_pressure"]
            res_comb = actual["combustion_temp"] - expected["combustion_temp"]
            res_cool = actual["coolant_temp"] - expected["coolant_temp"]
            res_oil = actual["oil_pressure"] - expected["oil_pressure"]
            res_vib = actual["vibration"] - expected["vibration"]
            res_batt = actual["battery_voltage"] - expected["battery_voltage"]
            
            # Build feature row
            feat = [
                float(rpm),
                float(load),
                float(res_intake),
                float(res_comb),
                float(res_cool),
                float(res_oil),
                float(res_vib),
                float(res_batt)
            ]
            
            X.append(feat)
            y.append(label)
            
    return np.array(X), np.array(y)
