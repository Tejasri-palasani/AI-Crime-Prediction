# AI Crime Prediction Map

An end-to-end machine learning project that predicts crime risk levels across city zones and visualizes them on an interactive map.

---

## Features

- **XGBoost classifier** — predicts High / Medium / Low crime risk per zone
- **LSTM forecaster** — forecasts daily crime counts for next N days
- **spaCy NLP extractor** — extracts structured info from police report text
- **Folium heatmap** — interactive color-coded crime risk map
- **Streamlit dashboard** — full web app with map, charts, and NLP tab

---

## Project Structure

```
crime_prediction/
├── data/
│   └── chicago_crimes.csv        # Auto-downloaded on first run
├── src/
│   ├── preprocess.py             # Data loading & feature engineering
│   ├── train_model.py            # XGBoost training
│   ├── predict.py                # Zone-level risk prediction
│   ├── map_builder.py            # Folium map generation
│   ├── nlp_extractor.py          # spaCy NLP pipeline
│   └── lstm_forecaster.py        # LSTM time-series model
├── app/
│   └── dashboard.py              # Streamlit dashboard
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Train the model

```bash
cd src
python train_model.py
```

This will:
- Auto-download the Chicago crime dataset (100,000 records)
- Train the XGBoost classifier
- Save `model.pkl` to the project root

### 3. Run the dashboard

```bash
streamlit run app/dashboard.py
```

Open `http://localhost:8501` in your browser.

---

## Step-by-Step Usage

### Predict zone risks from command line

```python
from src.predict import predict_zone_risk

# Predict risk at 10pm on a Friday
zones = predict_zone_risk(hour=22, day_of_week=4, month=6)
print(zones.head())
```

### Generate a standalone HTML map

```python
from src.map_builder import build_map

build_map(hour=22, day_of_week=4, output_path="crime_map.html")
# Open crime_map.html in your browser
```

### Extract info from a police report

```python
from src.nlp_extractor import extract_crime_info

report = "At 11pm officers responded to a robbery on Michigan Avenue. \
          The suspect was armed and fled northbound."

result = extract_crime_info(report)
print(result)
# {crime_type: 'Robbery', severity: 'High', locations: ['Michigan Avenue'], ...}
```

### Train the LSTM forecaster

```python
from src.lstm_forecaster import train_lstm, forecast_next_days

train_lstm()                    # Train and save model
forecast_next_days(n_days=7)    # Forecast next 7 days
```

---

## Dataset

| Source | Records | Link |
|--------|---------|------|
| Chicago Open Data Portal | 7M+ | https://data.cityofchicago.org/resource/ijzp-q8t2.csv |
| Kaggle Chicago Crime | 1.4M | https://www.kaggle.com/datasets/chicago/chicago-crime |
| LA Crime Data | 800K+ | https://data.lacity.org |
| UK Police Data | varies | https://data.police.uk |

The dataset is auto-downloaded on first run (100K records). For the full 7M+ dataset, use the Kaggle version.

---

## ML Features Used

| Feature | Description |
|---------|-------------|
| `hour` | Hour of the day (0–23) |
| `day_of_week` | Day index (0=Monday, 6=Sunday) |
| `month` | Month (1–12) |
| `lat_zone` | Latitude grid bucket (0–9) |
| `lon_zone` | Longitude grid bucket (0–9) |

**Target:** `risk_level` — 0 (Low), 1 (Medium), 2 (High)

---

## Enhancements (Next Steps)

- [ ] Add weather API features (OpenWeatherMap) — crime correlates with temperature
- [ ] Add patrol route optimizer using shortest-path on high-risk zones
- [ ] Add real-time crime feed via Chicago Open Data streaming API
- [ ] Deploy to Streamlit Cloud (free hosting)
- [ ] Add user authentication for law enforcement dashboard

---

## Tech Stack

- **Python 3.10+**
- **XGBoost** — gradient boosted classifier
- **TensorFlow / Keras** — LSTM time-series model
- **spaCy** — NLP entity extraction
- **Folium** — interactive Leaflet.js maps
- **Streamlit** — web dashboard
- **Plotly** — charts and scatter maps
- **Pandas / NumPy / Scikit-learn** — data processing

---

## License

MIT License — free to use for academic and personal projects.
