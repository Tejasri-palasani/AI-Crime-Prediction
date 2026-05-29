import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier
import sys
import os

sys.path.append(os.path.dirname(__file__))
from preprocess import load_and_clean


def train(data_path="data/chicago_crimes.csv", model_path="model.pkl"):
    """
    Train an XGBoost classifier to predict crime risk level per zone.
    """
    print("Loading and preprocessing data...")
    df = load_and_clean(data_path)

    features = ["hour", "day_of_week", "month", "lat_zone", "lon_zone"]
    target = "risk_level"

    df = df.dropna(subset=features + [target])

    X = df[features]
    y = df[target]

    print(f"Training on {len(X):,} records with features: {features}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42
    )

    print("Training XGBoost model...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50
    )

    y_pred = model.predict(X_test)

    print("\n=== Model Evaluation ===")
    print(classification_report(
        y_test, y_pred,
        target_names=["Low", "Medium", "High"]
    ))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save model
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")

    return model


if __name__ == "__main__":
    train()
