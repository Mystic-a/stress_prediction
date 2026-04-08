from pathlib import Path
from typing import Literal
import os
from datetime import datetime
import hashlib
import hmac
import secrets

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, text, Index, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


MODEL_FILE_CANDIDATES = [
    Path(__file__).parent / "new_model.joblib",
    Path(__file__).parent / "new_model",
    Path(__file__).parent / "model.joblib",
]

app = FastAPI(title="Wearables Stress Prediction API", version="1.0.0")

# Enable CORS for React frontend.
# Set ALLOWED_ORIGINS (comma-separated) to override the defaults.
# Defaults include local dev origins and GitHub Pages origins for Mystic-a.
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://127.0.0.1:3000,http://localhost:3000,"
    "https://Mystic-a.github.io,https://mystic-a.github.io,"
    "https://Mystic-a.github.io/stress_prediction,https://mystic-a.github.io/stress_prediction",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQL database configuration. Set DATABASE_URL in environment.
# Example (PostgreSQL): postgresql+psycopg2://postgres:password@localhost:5432/stress_app
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:password@localhost:5432/stress_app",
)

# Normalize common provider URLs so SQLAlchemy uses an explicit driver.
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
DB_INIT_ERROR = None
DB_READY = False


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("StressPrediction", back_populates="user", cascade="all, delete-orphan")


class StressPrediction(Base):
    __tablename__ = "stress_predictions"
    __table_args__ = (
        Index("ix_stress_predictions_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    predicted_stress_score = Column(Float, nullable=False)
    stress_level = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)

    caffeine_mg = Column(Float, nullable=False)
    alcohol_units = Column(Float, nullable=False)
    screen_time_min = Column(Float, nullable=False)
    sleep_duration_hours = Column(Float, nullable=False)
    calories_kcal = Column(Float, nullable=False)
    mood = Column(String(50), nullable=False)

    # Collected fields even if not used by current model.
    resting_hr_bpm = Column(Float, nullable=True)
    workout_minutes = Column(Float, nullable=True)
    working_hours = Column(Float, nullable=True)
    spo2_avg_pct = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="predictions")


class LoginEvent(Base):
    __tablename__ = "login_events"
    __table_args__ = (
        Index("ix_login_events_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(20), nullable=False, default="login")
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


def ensure_db_ready() -> None:
    global DB_READY, DB_INIT_ERROR
    if DB_READY:
        return
    try:
        Base.metadata.create_all(bind=engine)
        DB_READY = True
        DB_INIT_ERROR = None
    except Exception as exc:
        DB_INIT_ERROR = str(exc)
        raise

    # Lightweight schema patching for existing databases created before auth fields were added.
    inspector = inspect(engine)
    with engine.begin() as conn:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        prediction_columns = {
            column["name"] for column in inspector.get_columns("stress_predictions")
        }

        if "password_hash" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"))
            conn.execute(text("UPDATE users SET password_hash = '' WHERE password_hash IS NULL"))
            if engine.dialect.name == "mysql":
                conn.execute(text("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL"))
            else:
                conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL"))

        if "working_hours" not in prediction_columns:
            conn.execute(text("ALTER TABLE stress_predictions ADD COLUMN working_hours FLOAT NULL"))


def hash_password(password: str) -> str:
    iterations = 120000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    ).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, stored_digest = password_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        calc_digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations)
        ).hex()
        return hmac.compare_digest(calc_digest, stored_digest)
    except Exception:
        return False


INDEX_HTML = """
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Stress Predictor</title>
        <style>
            :root {
                color-scheme: light;
                --bg: #f4f7fb;
                --panel: #ffffff;
                --text: #16202a;
                --muted: #5b6b7a;
                --accent: #1457ff;
                --accent-strong: #0f46cf;
                --border: #d7e0ea;
                --good: #0f8a4b;
                --bad: #b42318;
            }

            * { box-sizing: border-box; }

            body {
                margin: 0;
                font-family: Arial, Helvetica, sans-serif;
                background: linear-gradient(180deg, #edf3ff 0%, var(--bg) 45%, #eef2f7 100%);
                color: var(--text);
            }

            .wrap {
                max-width: 980px;
                margin: 0 auto;
                padding: 32px 18px 40px;
            }

            .hero {
                display: grid;
                gap: 12px;
                margin-bottom: 20px;
            }

            h1 {
                margin: 0;
                font-size: clamp(28px, 4vw, 44px);
                letter-spacing: -0.03em;
            }

            .subtitle {
                margin: 0;
                color: var(--muted);
                max-width: 60ch;
                line-height: 1.5;
            }

            .status {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                border-radius: 999px;
                width: fit-content;
                background: var(--panel);
                border: 1px solid var(--border);
                box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
            }

            .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #9ca3af;
            }

            .dot.ok { background: var(--good); }
            .dot.bad { background: var(--bad); }

            .grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
            }

            .card {
                background: var(--panel);
                border: 1px solid var(--border);
                border-radius: 18px;
                padding: 20px;
                box-shadow: 0 14px 40px rgba(17, 24, 39, 0.07);
            }

            .field {
                display: grid;
                gap: 8px;
                margin-bottom: 14px;
            }

            label {
                font-size: 14px;
                color: var(--muted);
            }

            input, select, button {
                font: inherit;
            }

            input, select {
                width: 100%;
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 12px 14px;
                background: #fff;
                color: var(--text);
            }

            input:focus, select:focus {
                outline: 2px solid rgba(20, 87, 255, 0.16);
                border-color: var(--accent);
            }

            .actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 18px;
            }

            button {
                border: 0;
                border-radius: 12px;
                padding: 12px 16px;
                cursor: pointer;
            }

            .primary {
                background: var(--accent);
                color: #fff;
                font-weight: 700;
            }

            .primary:hover { background: var(--accent-strong); }

            .secondary {
                background: #eef3ff;
                color: var(--accent-strong);
            }

            .result {
                margin-top: 16px;
                padding: 14px;
                background: #f8fafc;
                border: 1px solid var(--border);
                border-radius: 14px;
                white-space: pre-wrap;
                min-height: 72px;
            }

            .note {
                color: var(--muted);
                font-size: 14px;
                line-height: 1.5;
            }

            @media (max-width: 760px) {
                .grid { grid-template-columns: 1fr; }
            }
        </style>
    </head>
    <body>
        <div class="wrap">
            <div class="hero">
                <h1>Stress Predictor</h1>
                <p class="subtitle">Enter values, click predict, and confirm the model is loaded. The page checks the API health and sends your inputs to the FastAPI model endpoint.</p>
                <div class="status" id="statusBox"><span class="dot" id="statusDot"></span><span id="statusText">Checking model...</span></div>
            </div>

            <div class="grid">
                <div class="card">
                    <h2 style="margin-top:0">Model Inputs</h2>
                    <form id="predictForm">
                        <div class="field">
                            <label for="caffeine_mg">Caffeine mg</label>
                            <input id="caffeine_mg" type="number" step="any" value="120" required />
                        </div>
                        <div class="field">
                            <label for="alcohol_units">Alcohol units</label>
                            <input id="alcohol_units" type="number" step="any" value="0" required />
                        </div>
                        <div class="field">
                            <label for="screen_time_min">Screen time min</label>
                            <input id="screen_time_min" type="number" step="any" value="180" required />
                        </div>
                        <div class="field">
                            <label for="sleep_duration_hours">Sleep duration hours</label>
                            <input id="sleep_duration_hours" type="number" step="any" value="7.2" required />
                        </div>
                        <div class="field">
                            <label for="calories_kcal">Calories kcal</label>
                            <input id="calories_kcal" type="number" step="any" value="2100" required />
                        </div>
                        <div class="field">
                            <label for="mood">Mood</label>
                            <select id="mood">
                                <option value="very_bad">very_bad</option>
                                <option value="bad">bad</option>
                                <option value="neutral">neutral</option>
                                <option value="good" selected>good</option>
                                <option value="very_good">very_good</option>
                            </select>
                        </div>
                        <div class="field">
                            <label for="resting_hr_bpm">Resting heart rate (bpm)</label>
                            <input id="resting_hr_bpm" type="number" step="any" value="60" />
                        </div>
                        <div class="field">
                            <label for="workout_minutes">Workout minutes</label>
                            <input id="workout_minutes" type="number" step="any" value="30" />
                        </div>
                        <div class="field">
                            <label for="working_hours">Working hours</label>
                            <input id="working_hours" type="number" step="any" value="8" />
                        </div>
                        <div class="field">
                            <label for="spo2_avg_pct">Blood oxygen level - Spo2 (%)</label>
                            <input id="spo2_avg_pct" type="number" step="any" value="97" />
                        </div>
                        <div class="actions">
                            <button class="primary" type="submit">Predict stress score</button>
                            <button class="secondary" type="button" id="refreshButton">Refresh status</button>
                        </div>
                    </form>
                </div>

                <div class="card">
                    <h2 style="margin-top:0">Result</h2>
                    <div class="note">If the model is running, this panel will show a predicted stress score after you submit the form.</div>
                    <div class="result" id="resultBox">Waiting for input...</div>
                    <div class="note" style="margin-top:14px">You can also check <a href="/model-info">/model-info</a> and <a href="/docs">/docs</a>.</div>
                </div>
            </div>
        </div>

        <script>
            const statusText = document.getElementById('statusText');
            const statusDot = document.getElementById('statusDot');
            const resultBox = document.getElementById('resultBox');
            const form = document.getElementById('predictForm');
            const refreshButton = document.getElementById('refreshButton');

            async function refreshStatus() {
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    if (data.status === 'ok') {
                        statusText.textContent = 'Model/API is running';
                        statusDot.className = 'dot ok';
                    } else {
                        statusText.textContent = 'API responded, but status is unexpected';
                        statusDot.className = 'dot bad';
                    }
                } catch (error) {
                    statusText.textContent = 'Model/API is not reachable';
                    statusDot.className = 'dot bad';
                }
            }

            async function runPrediction(event) {
                event.preventDefault();
                resultBox.textContent = 'Predicting...';

                const payload = {
                    caffeine_mg: Number(document.getElementById('caffeine_mg').value),
                    alcohol_units: Number(document.getElementById('alcohol_units').value),
                    screen_time_min: Number(document.getElementById('screen_time_min').value),
                    sleep_duration_hours: Number(document.getElementById('sleep_duration_hours').value),
                    calories_kcal: Number(document.getElementById('calories_kcal').value),
                    mood: document.getElementById('mood').value,
                    working_hours: Number(document.getElementById('working_hours').value),
                };

                try {
                    const response = await fetch('/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.detail || 'Prediction failed');
                    }
                    const categoryColor = {
                        'low': '#0f8a4b',
                        'medium': '#b8a100',
                        'high': '#b42318'
                    };
                    const color = categoryColor[data.category] || '#5b6b7a';
                    resultBox.innerHTML = `<strong style="color: ${color}; font-size: 18px;">${data.stress_level}</strong><br/><br/>Score: ${data.predicted_stress_score.toFixed(2)}<br/>Range: 19 (Low) to 100 (High)`;
                } catch (error) {
                    resultBox.textContent = 'Error: ' + error.message;
                }
            }

            form.addEventListener('submit', runPrediction);
            refreshButton.addEventListener('click', refreshStatus);
            refreshStatus();
        </script>
    </body>
</html>
"""


class PredictRequest(BaseModel):
    user_id: int | None = None
    caffeine_mg: float
    alcohol_units: float
    screen_time_min: float
    sleep_duration_hours: float
    calories_kcal: float
    resting_hr_bpm: float | None = None
    workout_minutes: float | None = None
    working_hours: float | None = None
    spo2_avg_pct: float | None = None
    mood: Literal["very_bad", "bad", "neutral", "good", "very_good"]


class RegisterUserRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str | None = None


class LoginUserRequest(BaseModel):
    username: str
    password: str


def load_artifact() -> dict:
    selected_model_file = next((path for path in MODEL_FILE_CANDIDATES if path.exists()), None)
    if selected_model_file is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "No model artifact found. Add 'new_model.joblib' (preferred) or 'model.joblib' "
                "to this folder."
            ),
        )
    artifact = joblib.load(selected_model_file)
    artifact["_model_file_name"] = selected_model_file.name
    return artifact


@app.get("/health")
def health() -> dict:
    db_ok = True
    db_error = DB_INIT_ERROR
    try:
        ensure_db_ready()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_ok = False
        db_error = str(exc)
    return {
        "status": "ok",
        "database_connected": db_ok,
        "database_url": DATABASE_URL,
        "database_error": db_error,
    }


@app.get("/", response_class=HTMLResponse)
def home() -> HTMLResponse:
    return HTMLResponse(INDEX_HTML)


@app.get("/model-info")
def model_info() -> dict:
    artifact = load_artifact()
    return {
        "model_file": artifact.get("_model_file_name", "unknown"),
        "feature_names": artifact["feature_names"],
        "allowed_mood_values": list(artifact["mood_map"].keys()),
    }


@app.post("/users/register")
def register_user(payload: RegisterUserRequest) -> dict:
    ensure_db_ready()
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    db = SessionLocal()
    try:
        user = User(
            username=payload.username.strip(),
            email=payload.email.strip().lower(),
            password_hash=hash_password(payload.password),
            full_name=payload.full_name.strip() if payload.full_name else None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            "message": "User registered successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at,
            },
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already exists")
    finally:
        db.close()


@app.post("/users/login")
def login_user(payload: LoginUserRequest, request: Request) -> dict:
    ensure_db_ready()
    db = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(User.username == payload.username.strip())
            .first()
        )
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        login_event = LoginEvent(
            user_id=user.id,
            event_type="login",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(login_event)
        db.commit()

        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at,
            },
        }
    finally:
        db.close()


@app.get("/users/{user_id}/login-history")
def get_user_login_history(user_id: int) -> dict:
    ensure_db_ready()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        rows = (
            db.query(LoginEvent)
            .filter(LoginEvent.user_id == user_id)
            .order_by(LoginEvent.created_at.desc())
            .all()
        )

        return {
            "user_id": user_id,
            "count": len(rows),
            "records": [
                {
                    "id": r.id,
                    "event_type": r.event_type,
                    "ip_address": r.ip_address,
                    "user_agent": r.user_agent,
                    "created_at": r.created_at,
                }
                for r in rows
            ],
        }
    finally:
        db.close()


@app.get("/users/{user_id}")
def get_user(user_id: int) -> dict:
    ensure_db_ready()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at,
        }
    finally:
        db.close()


@app.get("/users/{user_id}/history")
def get_user_history(user_id: int) -> dict:
    ensure_db_ready()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        rows = (
            db.query(StressPrediction)
            .filter(StressPrediction.user_id == user_id)
            .order_by(StressPrediction.created_at.desc())
            .all()
        )
        return {
            "user_id": user_id,
            "count": len(rows),
            "records": [
                {
                    "id": r.id,
                    "predicted_stress_score": r.predicted_stress_score,
                    "stress_level": r.stress_level,
                    "category": r.category,
                    "inputs": {
                        "caffeine_mg": r.caffeine_mg,
                        "alcohol_units": r.alcohol_units,
                        "screen_time_min": r.screen_time_min,
                        "sleep_duration_hours": r.sleep_duration_hours,
                        "calories_kcal": r.calories_kcal,
                        "mood": r.mood,
                        "resting_hr_bpm": r.resting_hr_bpm,
                        "workout_minutes": r.workout_minutes,
                        "working_hours": r.working_hours,
                        "spo2_avg_pct": r.spo2_avg_pct,
                    },
                    "created_at": r.created_at,
                }
                for r in rows
            ],
        }
    finally:
        db.close()


def categorize_stress_level(score: float) -> dict:
    """Categorize stress score (19-100) into Low, Medium, or High."""
    if score < 46:
        return {"level": "Low", "category": "low"}
    elif score < 73:
        return {"level": "Medium", "category": "medium"}
    else:
        return {"level": "High", "category": "high"}


@app.post("/predict")
def predict(payload: PredictRequest) -> dict:
    artifact = load_artifact()
    model = artifact["model"]
    mood_map = artifact["mood_map"]
    feature_names = artifact["feature_names"]

    # Convert mood category to numeric exactly as training used and align with
    # feature_names from the selected artifact.
    raw_row = payload.model_dump()
    numeric_row = dict(raw_row)
    numeric_row["mood"] = mood_map[raw_row["mood"]]

    row = {}
    for feature in feature_names:
        value = numeric_row.get(feature)
        row[feature] = 0.0 if value is None else value

    input_df = pd.DataFrame([row])
    input_df = input_df[feature_names]

    prediction = float(model.predict(input_df)[0])
    stress_category = categorize_stress_level(prediction)

    saved_record_id = None
    if payload.user_id is not None:
        ensure_db_ready()
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == payload.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            saved = StressPrediction(
                user_id=payload.user_id,
                predicted_stress_score=prediction,
                stress_level=stress_category["level"],
                category=stress_category["category"],
                caffeine_mg=payload.caffeine_mg,
                alcohol_units=payload.alcohol_units,
                screen_time_min=payload.screen_time_min,
                sleep_duration_hours=payload.sleep_duration_hours,
                calories_kcal=payload.calories_kcal,
                mood=payload.mood,
                resting_hr_bpm=payload.resting_hr_bpm,
                workout_minutes=payload.workout_minutes,
                working_hours=payload.working_hours,
                spo2_avg_pct=payload.spo2_avg_pct,
            )
            db.add(saved)
            db.commit()
            db.refresh(saved)
            saved_record_id = saved.id
        finally:
            db.close()

    return {
        "predicted_stress_score": prediction,
        "stress_level": stress_category["level"],
        "category": stress_category["category"],
        "saved_record_id": saved_record_id,
        "input_used": raw_row,
    }
