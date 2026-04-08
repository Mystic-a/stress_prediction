# Stress Predictor (Wearables Health)

A full-stack stress prediction system built with:
- FastAPI backend for auth, predictions, and history APIs
- Scikit-learn regression model exported as a Joblib artifact
- React frontend for login, input capture, prediction results, insights, and history
- MySQL storage for users, login events, and prediction history

## 1. Setup Instructions

### 1.1 Prerequisites

Install the following on Windows:
- Python 3.10+
- Node.js 18+ and npm
- MySQL 8+

### 1.2 Clone and open project

```powershell
cd D:\
git clone <your-repo-url> jiovio
cd D:\jiovio
```

### 1.3 Python backend setup

```powershell
cd D:\jiovio
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 1.4 Frontend setup

```powershell
cd D:\jiovio\frontend
npm install
```

### 1.5 Database setup

Create a MySQL database and user:

```sql
CREATE DATABASE stress_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stress_user'@'localhost' IDENTIFIED BY 'StressApp123';
GRANT ALL PRIVILEGES ON stress_app.* TO 'stress_user'@'localhost';
FLUSH PRIVILEGES;
```

Set the backend connection string in PowerShell before running the API:

```powershell
$env:DATABASE_URL="mysql+pymysql://stress_user:StressApp123@127.0.0.1:3306/stress_app?charset=utf8mb4"
```

### 1.6 Run the app

Option A: one command launcher

```powershell
cd D:\jiovio
.\run_app.ps1
```

Option B: run services separately (recommended for debugging)

Terminal 1 (backend):

```powershell
cd D:\jiovio
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="mysql+pymysql://stress_user:StressApp123@127.0.0.1:3306/stress_app?charset=utf8mb4"
python -m uvicorn app:app --host 127.0.0.1 --port 8010
```

Terminal 2 (frontend):

```powershell
cd D:\jiovio\frontend
npm start
```

### 1.7 Access points

- Frontend UI: http://127.0.0.1:3000
- Backend API: http://127.0.0.1:8010
- OpenAPI docs: http://127.0.0.1:8010/docs
- Health check: http://127.0.0.1:8010/health

---

## 2. API Details

Base URL: `http://127.0.0.1:8010`

### 2.1 Health and model info

#### `GET /health`
Returns API/database status.

Response fields:
- `status`
- `database_connected`
- `database_url`
- `database_error`

#### `GET /model-info`
Returns loaded model artifact metadata.

Response fields:
- `model_file`
- `feature_names`
- `allowed_mood_values`

### 2.2 Authentication

#### `POST /users/register`
Register a new user.

Request body:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "StrongPass123",
  "full_name": "Alice Doe"
}
```

Validation notes:
- Password must be at least 8 characters
- Username and email must be unique

#### `POST /users/login`
Login with username/password and log login event.

Request body:

```json
{
  "username": "alice",
  "password": "StrongPass123"
}
```

### 2.3 User resources

#### `GET /users/{user_id}`
Return profile details for a user.

#### `GET /users/{user_id}/login-history`
Return login events for a user.

#### `GET /users/{user_id}/history`
Return saved prediction history for a user.

### 2.4 Prediction

#### `POST /predict`
Generate stress score prediction from daily metrics.

Request body:

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

Required fields:
- `caffeine_mg`
- `alcohol_units`
- `screen_time_min`
- `sleep_duration_hours`
- `calories_kcal`
- `mood` (`very_bad | bad | neutral | good | very_good`)

Response body:

```json
{
  "predicted_stress_score": 58.34,
  "stress_level": "Medium",
  "category": "medium",
  "saved_record_id": 42,
  "input_used": {
    "caffeine_mg": 120,
    "alcohol_units": 0,
    "screen_time_min": 180,
    "sleep_duration_hours": 7.2,
    "calories_kcal": 2100,
    "resting_hr_bpm": 60,
    "workout_minutes": 30,
    "working_hours": 8,
    "spo2_avg_pct": 97,
    "mood": "good",
    "user_id": 1
  }
}
```

Stress level thresholds used by backend:
- Low: score < 46
- Medium: 46 <= score < 73
- High: score >= 73

---

## 3. ML Model Explanation

### 3.1 Training pipeline

Implemented in `train_and_export_model.py`:
- Loads dataset: `wearables_health_6mo_daily.csv`
- Drops non-target/unused columns
- Encodes mood using ordinal map:
  - `very_bad=1`, `bad=2`, `neutral=3`, `good=4`, `very_good=5`
- Fills missing values for:
  - `sleep_duration_hours` (mean)
  - `calories_kcal` (mean)
- Splits data using `train_test_split(test_size=0.2, random_state=42)`
- Trains `LinearRegression`
- Saves artifact to `new_model.joblib`

### 3.2 Artifact structure

Saved Joblib artifact is a dictionary with:
- `model`: trained scikit-learn model
- `feature_names`: strict feature order used for inference
- `mood_map`: categorical mood to numeric mapping

### 3.3 Inference behavior

In `POST /predict`:
- Backend loads artifact dynamically
- Converts `mood` to numeric using `mood_map`
- Reorders request payload to exactly match `feature_names`
- Fills missing optional model features with `0.0`
- Predicts numeric stress score
- Maps score to category (`low|medium|high`) and label (`Low|Medium|High`)
- If `user_id` is present and valid, prediction is stored in MySQL

### 3.4 Retraining the model

```powershell
cd D:\jiovio
.\.venv\Scripts\Activate.ps1
python train_and_export_model.py
```

This regenerates `new_model.joblib` used by the API.

---

## 4. System Architecture

### 4.1 High-level view

```text
React Frontend (port 3000)
  |
  | HTTP/JSON
  v
FastAPI Backend (port 8010)
  |\
  | \-- Loads model artifact (new_model.joblib)
  |
  \---- MySQL (users, login_events, stress_predictions)
```

### 4.2 Backend components

- `app.py`
  - FastAPI app and route handlers
  - SQLAlchemy models (`User`, `StressPrediction`, `LoginEvent`)
  - Database initialization and lightweight schema patching
  - Password hashing/verification using PBKDF2-HMAC-SHA256
  - Model loading and prediction logic

- `run_app.ps1`
  - Checks backend health
  - Starts backend if not running
  - Starts frontend if not running

- `train_and_export_model.py`
  - End-to-end preprocessing + training + artifact export

### 4.3 Data flow

1. User registers/logs in from React UI.
2. Frontend calls backend auth endpoints.
3. User submits health metrics.
4. Backend transforms payload and runs model inference.
5. Backend returns score + category.
6. If logged in, prediction record is persisted.
7. Frontend loads historical records for trends/insights.

---

## 5. Project Structure

```text
jiovio/
  app.py
  train_and_export_model.py
  run_app.ps1
  requirements.txt
  new_model.joblib
  wearables_health_6mo_daily.csv
  frontend/
    package.json
    src/
      App.js
      components/
        LoginRegister.js
        PredictionForm.js
        ResultsDisplay.js
        History.js
        Insights.js
        VoiceAssistant.js
```

---

## 6. Troubleshooting

### Backend not starting
- Verify MySQL service is running
- Verify `DATABASE_URL` credentials and database name
- Confirm Python venv is active and requirements installed

### Frontend cannot call backend
- Confirm backend is running on `127.0.0.1:8010`
- Frontend reads the API base URL from `REACT_APP_API_BASE` (falls back to `http://127.0.0.1:8010` for local dev)

### Model errors
- Ensure `new_model.joblib` exists in project root
- Regenerate using `python train_and_export_model.py`

---

## 7. Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, Uvicorn
- ML: pandas, scikit-learn, joblib
- Database: MySQL (via PyMySQL)
- Frontend: React (Create React App)

---

## 8. Public Deployment (GitHub + Render)

GitHub stores your source code. To expose APIs publicly, deploy the backend from GitHub to a hosting platform (Render recommended for this project).

### 8.1 Push project to GitHub

```powershell
cd D:\jiovio
git init
git add .
git commit -m "Initial upload"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 8.2 Deploy backend on Render

1. Create a Render account and connect GitHub.
2. Use Blueprint deploy with `render.yaml` in this repo, or create a Web Service manually.
3. Set environment variable `DATABASE_URL` to your hosted MySQL connection string.
4. Deploy.

Render runtime settings used by this repo:
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- Health endpoint: `/health`

### 8.3 API docs (public)

After backend deployment:
- API base: `https://<your-backend-domain>`
- Swagger docs: `https://<your-backend-domain>/docs`
- Health check: `https://<your-backend-domain>/health`

### 8.4 Deploy frontend to GitHub Pages (recommended)

The React frontend can be deployed to GitHub Pages as a static site.

#### Required environment variables

| Variable | Where | Description |
|---|---|---|
| `REACT_APP_API_BASE` | Build-time env var (or GitHub Actions repo variable) | Public HTTPS URL of the deployed FastAPI backend. Example: `https://your-backend.onrender.com` |
| `DATABASE_URL` | Backend server env var | MySQL connection string for the FastAPI backend |
| `ALLOWED_ORIGINS` | Backend server env var (optional) | Comma-separated CORS origins. Defaults already include `https://Mystic-a.github.io` and `https://Mystic-a.github.io/stress_prediction` |

#### Manual deploy (one-time or local)

```bash
cd frontend
npm install
REACT_APP_API_BASE="https://your-backend.onrender.com" npm run deploy
```

On Windows PowerShell:

```powershell
cd frontend
npm install
$env:REACT_APP_API_BASE="https://your-backend.onrender.com"
npm run deploy
```

This builds the app and pushes the `build/` folder to the `gh-pages` branch.  
In GitHub repo settings, set **Pages → Source = `gh-pages` branch**.

#### Automatic deploy via GitHub Actions

The workflow `.github/workflows/deploy-frontend.yml` automatically builds and deploys the frontend to GitHub Pages on every push to `main` that touches `frontend/`.

1. In your GitHub repo, go to **Settings → Secrets and variables → Actions → Variables**.
2. Create a repository variable named `REACT_APP_API_BASE` with the value of your deployed backend URL.
3. In **Settings → Pages**, set source to the `gh-pages` branch (the workflow handles this automatically after first deploy).
4. Push to `main` – the workflow runs and your site is live at `https://Mystic-a.github.io/stress_prediction`.

### 8.5 Submission checklist (what to provide)

- Backend deployment link: `https://<your-backend-domain>`
- API documentation: `https://<your-backend-domain>/docs`
- Test credentials:
  - Username: `demo_user`
  - Password: `DemoPass123!`
- Sample payload for `/predict`:

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

- Frontend deployment link (optional): `https://<your-frontend-domain>`

### 8.6 Cloud-only launch plan (no local runtime)

You can keep everything live in cloud services and not run the app locally.

1. GitHub repo (already done):
  - `https://github.com/Mystic-a/stress_prediction`
2. Create managed MySQL (Railway, Aiven, PlanetScale, or similar).
3. In Render:
  - New Blueprint -> select this GitHub repo
  - Confirm service from `render.yaml`
  - Add env var `DATABASE_URL` from your managed MySQL
  - Deploy and copy backend URL
4. In Vercel/Netlify (optional but recommended):
  - Import `frontend` from same GitHub repo
  - Add env var `REACT_APP_API_BASE=https://<render-backend-url>`
  - Deploy and copy frontend URL
5. Create demo user using deployed backend:
  - `POST https://<render-backend-url>/users/register`
  - Save username/password for evaluator

Final deliverables to share:
- Backend link
- API docs link (`/docs`)
- Test credentials
- Sample predict payload
- Frontend link (optional)
