import pandas as pd
import joblib
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(__file__))
from preprocess import load_and_clean

RISK_MAP = {0: "Low", 1: "Medium", 2: "High"}
COLOR_MAP = {"High": "red", "Medium": "orange", "Low": "green"}


def predict_zone_risk(hour=20, day_of_week=4, month=6,
                      data_path="data/chicago_crimes.csv",
                      model_path="model.pkl"):
    """
    Predict crime risk level for each spatial zone given time parameters.

    Args:
        hour        : Hour of the day (0-23)
        day_of_week : Day index (0=Monday, 6=Sunday)
        month       : Month (1-12)

    Returns:
        DataFrame with zone_id, lat, lon, incidents, risk_label, risk_proba, color
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run train_model.py first."
        )

    model = joblib.load(model_path)
    df = load_and_clean(data_path)

    # Aggregate zone centroids and incident counts
    zones = df.groupby(["zone_id", "lat_zone", "lon_zone"]).agg(
        lat=("latitude", "mean"),
        lon=("longitude", "mean"),
        incidents=("risk_level", "count")
    ).reset_index()

    # Add time features for prediction
    zones["hour"] = hour
    zones["day_of_week"] = day_of_week
    zones["month"] = month

    X_pred = zones[["hour", "day_of_week", "month", "lat_zone", "lon_zone"]]

    zones["predicted_risk"] = model.predict(X_pred)
    proba = model.predict_proba(X_pred)
    zones["risk_proba"] = proba.max(axis=1).round(2)

    zones["risk_label"] = zones["predicted_risk"].map(RISK_MAP)
    zones["color"] = zones["risk_label"].map(COLOR_MAP)

    return zones[["zone_id", "lat", "lon", "incidents",
                  "risk_label", "risk_proba", "color"]].sort_values(
                      "predicted_risk", ascending=False
                  ).reset_index(drop=True)


if __name__ == "__main__":
    results = predict_zone_risk(hour=22, day_of_week=5)
    print(results.head(15))
    print(f"\nHigh risk zones:   {len(results[results['risk_label']=='High'])}")
    print(f"Medium risk zones: {len(results[results['risk_label']=='Medium'])}")
    print(f"Low risk zones:    {len(results[results['risk_label']=='Low'])}")
