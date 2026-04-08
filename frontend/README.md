# Frontend - Stress Predictor

This React app is the UI for the Wearables Stress Prediction system.

For complete project documentation (backend setup, API details, ML model explanation, and full system architecture), see:
- [../README.md](../README.md)

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- Backend API running on `http://127.0.0.1:8010`

### Install dependencies

```powershell
cd D:\jiovio\frontend
npm install
```

### Run in development mode

```powershell
cd D:\jiovio\frontend
npm start
```

Frontend runs at:
- `http://127.0.0.1:3000`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API_BASE` | `http://127.0.0.1:8010` | Base URL of the FastAPI backend. Set at build time for production. |

For local development, copy `frontend/.env.example` to `frontend/.env`:

```bash
cp .env.example .env
```

For production (GitHub Pages), set `REACT_APP_API_BASE` to your deployed backend URL at build time:

```bash
REACT_APP_API_BASE="https://your-backend.onrender.com" npm run build
```

## Available Scripts

- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Create production build in `build/`
- `npm run deploy` - Build and deploy to GitHub Pages (`gh-pages` branch)

## Deploying to GitHub Pages

The `homepage` field in `package.json` is set to `https://Mystic-a.github.io/stress_prediction`.

To deploy manually:

```bash
REACT_APP_API_BASE="https://your-backend.onrender.com" npm run deploy
```

To deploy automatically on every push to `main`, see the GitHub Actions workflow at `.github/workflows/deploy-frontend.yml`. Set the `REACT_APP_API_BASE` repository variable in **Settings → Secrets and variables → Actions → Variables**.

## Frontend-Backend Integration

- API base URL is read from `REACT_APP_API_BASE` (falls back to `http://127.0.0.1:8010` for local dev)
- Main integration points are in:
	- `src/App.js` (auth, predict, history calls)
	- `src/components/LoginRegister.js`
	- `src/components/PredictionForm.js`

## Features

- User registration and login
- Stress prediction form with required and optional health inputs
- Result display with stress category
- Prediction history for logged-in users
- Insights view from historical predictions
- Voice assistant UI component

## Troubleshooting

- If login/predict fails, ensure backend is running on port `8010` (or that `REACT_APP_API_BASE` is set correctly)
- If frontend fails to start, remove `node_modules` and reinstall:

```powershell
cd D:\jiovio\frontend
Remove-Item -Recurse -Force node_modules
npm install
npm start
```
