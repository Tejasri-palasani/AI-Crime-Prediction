import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
import sys
import os

sys.path.append(os.path.dirname(__file__))
from preprocess import load_and_clean


def prepare_sequences(series: np.ndarray, seq_len: int = 7):
    """Create sliding window sequences for LSTM training."""
    X, y = [], []
    for i in range(len(series) - seq_len):
        X.append(series[i:i + seq_len])
        y.append(series[i + seq_len])
    return np.array(X), np.array(y)


def train_lstm(data_path="data/chicago_crimes.csv",
               model_path="lstm_model",
               seq_len=7, epochs=20, batch_size=32):
    """
    Train an LSTM model to forecast daily crime counts.

    Args:
        data_path  : Path to crime CSV
        model_path : Where to save the trained model
        seq_len    : Number of past days used to predict next day
        epochs     : Training epochs
        batch_size : Batch size

    Returns:
        model, scaler
    """
    # Lazy import TensorFlow to avoid slow startup when not needed
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping

    print("Loading data...")
    df = load_and_clean(data_path)

    # Aggregate daily crime counts city-wide
    daily = (
        df.groupby(df["date"].dt.date)
        .size()
        .reset_index(name="crime_count")
    )
    daily = daily.sort_values("date")
    print(f"Daily records: {len(daily)} days")

    # Scale
    scaler = MinMaxScaler()
    counts = scaler.fit_transform(daily[["crime_count"]])

    # Build sequences
    X, y = prepare_sequences(counts, seq_len=seq_len)
    X = X.reshape(X.shape[0], seq_len, 1)

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"Training samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Model
    model = Sequential([
        LSTM(64, input_shape=(seq_len, 1), return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(1)
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    model.summary()

    early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)

    print("Training LSTM...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=[early_stop],
        verbose=1
    )

    # Save model and scaler
    model.save(model_path)
    joblib.dump(scaler, "lstm_scaler.pkl")
    print(f"LSTM model saved to {model_path}")
    print(f"Scaler saved to lstm_scaler.pkl")

    return model, scaler, history


def forecast_next_days(n_days=7, model_path="lstm_model",
                       scaler_path="lstm_scaler.pkl",
                       data_path="data/chicago_crimes.csv",
                       seq_len=7):
    """
    Forecast crime counts for the next N days using the trained LSTM.

    Returns:
        List of predicted crime counts
    """
    from tensorflow.keras.models import load_model

    model  = load_model(model_path)
    scaler = joblib.load(scaler_path)

    df = load_and_clean(data_path)
    daily = (
        df.groupby(df["date"].dt.date)
        .size()
        .reset_index(name="crime_count")
        .sort_values("date")
    )

    counts = scaler.transform(daily[["crime_count"]])
    last_seq = counts[-seq_len:].reshape(1, seq_len, 1)

    predictions = []
    current_seq = last_seq.copy()

    for _ in range(n_days):
        pred = model.predict(current_seq, verbose=0)[0][0]
        predictions.append(pred)
        # Slide window forward
        current_seq = np.append(current_seq[:, 1:, :],
                                [[[pred]]], axis=1)

    # Inverse transform to get actual crime count estimates
    pred_array = np.array(predictions).reshape(-1, 1)
    predicted_counts = scaler.inverse_transform(pred_array).flatten()

    print(f"\nForecasted crime counts for next {n_days} days:")
    for i, count in enumerate(predicted_counts, 1):
        print(f"  Day {i}: {int(count):,} crimes")

    return predicted_counts.tolist()


if __name__ == "__main__":
    model, scaler, history = train_lstm()
    forecast_next_days(n_days=7)
