import pandas as pd
import numpy as np


def load_and_clean(path="data/chicago_crimes.csv"):
    """
    Load and clean the Chicago crime dataset.
    Downloads from Chicago Open Data Portal if file not found.
    """
    try:
        df = pd.read_csv(path)
    except FileNotFoundError:
        print("Dataset not found locally. Downloading from Chicago Open Data Portal...")
        url = "https://data.cityofchicago.org/resource/ijzp-q8t2.csv?$limit=100000"
        df = pd.read_csv(url)
        df.to_csv(path, index=False)
        print(f"Dataset saved to {path}")

    # Drop rows with missing coordinates or date
    df = df.dropna(subset=["latitude", "longitude", "date"])

    # Parse datetime features
    df["date"] = pd.to_datetime(df["date"])
    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.dayofweek   # 0=Monday, 6=Sunday
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year

    # Assign risk labels based on crime type severity
    high_risk = ["HOMICIDE", "ASSAULT", "ROBBERY", "BATTERY", "KIDNAPPING", "SEX OFFENSE"]
    med_risk = ["BURGLARY", "THEFT", "MOTOR VEHICLE THEFT", "ARSON", "WEAPONS VIOLATION"]

    def label_risk(crime):
        if str(crime).upper() in high_risk:
            return 2   # High
        elif str(crime).upper() in med_risk:
            return 1   # Medium
        else:
            return 0   # Low

    df["risk_level"] = df["primary_type"].apply(label_risk)

    # Create spatial grid zones by binning lat/lon
    df["lat_zone"] = pd.cut(df["latitude"], bins=10, labels=False)
    df["lon_zone"] = pd.cut(df["longitude"], bins=10, labels=False)
    df["zone_id"] = df["lat_zone"].astype(str) + "_" + df["lon_zone"].astype(str)

    # Drop rows where zoning failed
    df = df.dropna(subset=["lat_zone", "lon_zone"])
    df["lat_zone"] = df["lat_zone"].astype(int)
    df["lon_zone"] = df["lon_zone"].astype(int)

    return df


if __name__ == "__main__":
    df = load_and_clean()
    print(f"Loaded {len(df):,} records")
    print(df[["primary_type", "risk_level", "hour", "zone_id"]].head(10))
    print("\nRisk level distribution:")
    print(df["risk_level"].value_counts().rename({0: "Low", 1: "Medium", 2: "High"}))
