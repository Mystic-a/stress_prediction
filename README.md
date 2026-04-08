# Stress Predictor (Wearables Health)

Stress Predictor is a full-stack application that predicts daily stress level from wearable/lifestyle inputs.

- Frontend: React (user auth, input form, results, history, insights)
- Backend: FastAPI (prediction + auth + history APIs)
- ML: scikit-learn Linear Regression model serialized with Joblib
- Database: PostgreSQL (Render) or MySQL (compatible fallback)

---

## 1. Setup Instructions

### 1.1 Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL database (Render recommended)
- Git

### 1.2 Clone Repository

```powershell
cd D:\
git clone https://github.com/Mystic-a/stress_prediction.git jiovio
cd D:\jiovio
```

### 1.3 Backend Setup

```powershell
cd D:\jiovio
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set database URL:

```powershell
$env:DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require"
```

Notes:
- Backend auto-normalizes `postgres://` and `postgresql://` URLs.
- For Render backend + Render Postgres, use Internal Database URL.

Start backend:

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8010
```

### 1.4 Frontend Setup

```powershell
cd D:\jiovio\frontend
npm install
```

Set API base (recommended):

```powershell
$env:REACT_APP_API_BASE="https://stress-prediction-gvlf.onrender.com"
```

Start frontend:

```powershell
npm start
```

If port 3000 is busy, run on 3001:

```powershell
$env:PORT="3001"
npm start
```

### 1.5 Access URLs

- Backend health: https://stress-prediction-gvlf.onrender.com/health
- Backend docs: https://stress-prediction-gvlf.onrender.com/docs
- Local frontend (example): http://127.0.0.1:3001

---

## 2. API Details

Base URL (production): https://stress-prediction-gvlf.onrender.com

### 2.1 Health and Model

#### GET /health
Returns backend and DB status.

Example response:

```json
{
  "status": "ok",
  "database_connected": true,
  "database_url": "postgresql+psycopg2://***:***@host/db",
  "database_error": null
}
```

#### GET /model-info
Returns active model artifact details.

- model_file
- feature_names
- allowed_mood_values

### 2.2 Authentication

#### POST /users/register
Registers new user.

Request:

```json
{
  "username": "demo_user",
  "email": "demo@example.com",
  "password": "DemoPass123!",
  "full_name": "Demo User"
}
```

Validation:
- password minimum 8 chars
- username and email unique

#### POST /users/login
Logs in existing user.

Request:

```json
{
  "username": "demo_user",
  "password": "DemoPass123!"
}
```

### 2.3 User Endpoints

- GET /users/{user_id:int}
- GET /users/{user_id:int}/history
- GET /users/{user_id:int}/login-history

Note: routes use integer path converter to avoid collision with `/users/register`.

### 2.4 Prediction

#### POST /predict
Returns stress score + category.

Request:

```json
{
  "user_id": 1,
  "caffeine_mg": 120,
  "alcohol_units": 0,
  "screen_time_min": 180,
  "sleep_duration_hours": 7.2,
  "calories_kcal": 2100,
  "resting_hr_bpm": 60,
  "workout_minutes": 30,
  "working_hours": 8,
  "spo2_avg_pct": 97,
  "mood": "good"
}
```

Response:

```json
{
  "predicted_stress_score": 58.34,
  "stress_level": "Medium",
  "category": "medium",
  "saved_record_id": 42,
  "input_used": {
    "user_id": 1,
    "caffeine_mg": 120,
    "alcohol_units": 0,
    "screen_time_min": 180,
    "sleep_duration_hours": 7.2,
    "calories_kcal": 2100,
    "resting_hr_bpm": 60,
    "workout_minutes": 30,
    "working_hours": 8,
    "spo2_avg_pct": 97,
    "mood": "good"
  }
}
```

Stress thresholds:
- Low: score < 46
- Medium: 46 <= score < 73
- High: score >= 73

---

## 3. ML Model Explanation

### 3.1 Training Pipeline

Implemented in [train_and_export_model.py](train_and_export_model.py).

Pipeline summary:
- Load dataset: [wearables_health_6mo_daily.csv](wearables_health_6mo_daily.csv)
- Drop non-required columns
- Encode mood:
  - very_bad=1
  - bad=2
  - neutral=3
  - good=4
  - very_good=5
- Fill missing values (`sleep_duration_hours`, `calories_kcal`) using mean
- Split data (`train_test_split`, random_state=42)
- Train LinearRegression
- Save artifact to [new_model.joblib](new_model.joblib)

### 3.2 Model Artifact Contents

The artifact is a dict containing:
- model
- feature_names
- mood_map

### 3.3 Inference Behavior

Implemented in [app.py](app.py):
- Load artifact
- Map mood text to numeric using artifact mood_map
- Align input to strict feature_names order
- Fill missing optional features with 0.0
- Predict stress score
- Classify to Low/Medium/High
- Persist to DB if `user_id` is provided

### 3.4 Retraining

```powershell
cd D:\jiovio
.\.venv\Scripts\Activate.ps1
python train_and_export_model.py
```

---

## 4. System Architecture

### 4.1 High-Level Architecture

```text
React Frontend
   |
   | HTTPS JSON requests
   v
FastAPI Backend (Render)
   |  \
   |   \-- ML artifact: new_model.joblib
   |
   +------ PostgreSQL (Render)
```

### 4.2 Backend Components

- [app.py](app.py)
  - FastAPI routes
  - SQLAlchemy models
  - DB init + schema patching
  - auth password hashing/verification
  - prediction logic

- [train_and_export_model.py](train_and_export_model.py)
  - data preprocessing
  - model training
  - artifact export

- [render.yaml](render.yaml)
  - Render web service blueprint

### 4.3 Frontend Components

- [frontend/src/App.js](frontend/src/App.js)
  - auth flow
  - prediction requests
  - history loading
  - tab navigation

- [frontend/src/components](frontend/src/components)
  - LoginRegister
  - PredictionForm
  - ResultsDisplay
  - History
  - Insights
  - VoiceAssistant

### 4.4 Data Flow

1. User registers/logs in from React.
2. Frontend calls FastAPI auth endpoints.
3. User submits wearable metrics.
4. Backend preprocesses request and runs model inference.
5. Backend returns score/category.
6. Backend stores prediction and login events in DB.
7. Frontend reads user history and insights.

---

## 5. Deployment Notes

### Backend (Render)

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- Required env var: `DATABASE_URL`
- Optional env var: `ALLOWED_ORIGINS`

### Frontend (GitHub Pages)

- Workflow file: [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml)
- Required build var: `REACT_APP_API_BASE`

---

## 6. Tech Stack

- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- pandas
- scikit-learn
- joblib
- React (CRA)
- GitHub Actions
- Render (Web Service + PostgreSQL)
