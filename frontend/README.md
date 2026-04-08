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

## Available Scripts

- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Create production build in `build/`

## Frontend-Backend Integration

- API base URL is currently hardcoded to `http://127.0.0.1:8010`
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

- If login/predict fails, ensure backend is running on port `8010`
- If frontend fails to start, remove `node_modules` and reinstall:

```powershell
cd D:\jiovio\frontend
Remove-Item -Recurse -Force node_modules
npm install
npm start
```
