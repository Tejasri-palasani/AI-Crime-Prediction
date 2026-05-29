import folium
from folium.plugins import HeatMap, MarkerCluster
import pandas as pd
import sys
import os

sys.path.append(os.path.dirname(__file__))
from predict import predict_zone_risk


def build_map(hour=20, day_of_week=4, month=6,
              output_path="crime_map.html",
              data_path="data/chicago_crimes.csv",
              model_path="model.pkl"):
    """
    Build an interactive Folium heatmap with predicted crime risk zones.

    Args:
        hour        : Hour of the day (0-23)
        day_of_week : Day index (0=Monday, 6=Sunday)
        month       : Month (1-12)
        output_path : Where to save the HTML map

    Returns:
        folium.Map object
    """
    zones = predict_zone_risk(
        hour=hour,
        day_of_week=day_of_week,
        month=month,
        data_path=data_path,
        model_path=model_path
    )

    # Initialize map centered on Chicago
    m = folium.Map(
        location=[41.8781, -87.6298],
        zoom_start=11,
        tiles="CartoDB positron"
    )

    # --- Heatmap layer ---
    heat_data = zones[["lat", "lon", "incidents"]].values.tolist()
    HeatMap(
        heat_data,
        radius=20,
        blur=15,
        max_zoom=13,
        name="Crime Heatmap"
    ).add_to(m)

    # --- Color-coded risk markers ---
    risk_layer = folium.FeatureGroup(name="Risk Zones")

    for _, row in zones.iterrows():
        popup_html = f"""
        <div style="font-family: sans-serif; font-size: 13px; min-width: 160px;">
            <b>Zone:</b> {row['zone_id']}<br>
            <b>Risk Level:</b>
            <span style="color: {'red' if row['risk_label']=='High'
                                  else 'orange' if row['risk_label']=='Medium'
                                  else 'green'}; font-weight: bold;">
                {row['risk_label']}
            </span><br>
            <b>Confidence:</b> {row['risk_proba']*100:.0f}%<br>
            <b>Incidents (historical):</b> {row['incidents']:,}
        </div>
        """
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=9,
            color=row["color"],
            fill=True,
            fill_color=row["color"],
            fill_opacity=0.75,
            weight=1.5,
            popup=folium.Popup(popup_html, max_width=220),
            tooltip=f"{row['risk_label']} risk — {row['incidents']} incidents"
        ).add_to(risk_layer)

    risk_layer.add_to(m)

    # --- Legend ---
    legend_html = """
    <div style="position: fixed; bottom: 30px; left: 30px; z-index: 1000;
                background: white; padding: 12px 16px; border-radius: 8px;
                border: 1px solid #ccc; font-family: sans-serif; font-size: 13px;">
        <b>Crime Risk Level</b><br>
        <span style="color:red;">&#9679;</span> High Risk<br>
        <span style="color:orange;">&#9679;</span> Medium Risk<br>
        <span style="color:green;">&#9679;</span> Low Risk
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    # Layer control toggle
    folium.LayerControl().add_to(m)

    m.save(output_path)
    print(f"Map saved to {output_path}")

    return m


if __name__ == "__main__":
    build_map(hour=22, day_of_week=5, output_path="crime_map.html")
