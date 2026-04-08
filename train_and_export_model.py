from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split


DATA_FILE = Path(__file__).parent / "wearables_health_6mo_daily.csv"
MODEL_FILE = Path(__file__).parent / "new_model.joblib"


def build_training_dataframe() -> pd.DataFrame:
    df = pd.read_csv(DATA_FILE)

    cols_to_drop_1 = [
        "user_id",
        "date",
        "region",
        "device_model",
        "height_cm",
        "weight_kg",
        "avg_hr_day_bpm",
        "hrv_rmssd_ms",
        "sbp_mmHg",
        "dbp_mmHg",
        "sleep_latency_min",
        "wake_after_sleep_onset_min",
        "steps",
        "sleep_efficiency",
        "sleep_stage_rem_pct",
        "sleep_stage_deep_pct",
        "gender",
        "sleep_stage_light_pct",
        "mindfulness_minutes",
        "distance_km",
        "workout_type",
    ]
    df = df.drop(columns=cols_to_drop_1)

    mood_map = {
        "very_bad": 1,
        "bad": 2,
        "neutral": 3,
        "good": 4,
        "very_good": 5,
    }
    df["mood"] = df["mood"].map(mood_map)

    df["sleep_duration_hours"] = df["sleep_duration_hours"].fillna(
        df["sleep_duration_hours"].mean()
    )

    cols_to_drop_2 = ["age", "bmi", "resting_hr_bpm", "workout_minutes", "spo2_avg_pct"]
    df = df.drop(columns=cols_to_drop_2)

    df["calories_kcal"] = df["calories_kcal"].fillna(df["calories_kcal"].mean())

    return df


def train_and_save_model() -> None:
    df = build_training_dataframe()

    X = df.drop("stress_score", axis=1)
    y = df["stress_score"]

    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)

    model = LinearRegression()
    model.fit(X_train, y_train)

    artifact = {
        "model": model,
        "feature_names": list(X.columns),
        "mood_map": {
            "very_bad": 1,
            "bad": 2,
            "neutral": 3,
            "good": 4,
            "very_good": 5,
        },
    }

    joblib.dump(artifact, MODEL_FILE)
    print(f"Saved model to: {MODEL_FILE}")
    print("Expected feature order:", artifact["feature_names"])


if __name__ == "__main__":
    train_and_save_model()
