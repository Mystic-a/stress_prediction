import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LoginRegister from './components/LoginRegister';
import PredictionForm from './components/PredictionForm';
import ResultsDisplay from './components/ResultsDisplay';
import History from './components/History';
import Insights from './components/Insights';
import VoiceAssistant from './components/VoiceAssistant';

function App() {
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [currentTab, setCurrentTab] = useState('predict');
  const [loading, setLoading] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const userId = user?.id;

  const API_BASE = (
    process.env.REACT_APP_API_BASE
    || (isDevelopment
      ? 'http://127.0.0.1:8010'
      : 'https://stress-prediction-gvlf.onrender.com')
  ).replace(/\/$/, '');

  // Load user and predictions from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedPredictions = localStorage.getItem('predictions');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedPredictions) setPredictions(JSON.parse(savedPredictions));
  }, []);

  const loadUserHistory = useCallback(async (userId) => {
    const response = await fetch(`${API_BASE}/users/${userId}/history`);
    if (!response.ok) {
      throw new Error('Unable to load history from SQL database');
    }
    const data = await response.json();
    const mapped = data.records.map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      ...r.inputs,
      score: r.predicted_stress_score,
      level: r.stress_level,
      category: r.category,
    }));
    setPredictions(mapped);
    if (mapped.length > 0) {
      setLastPrediction(mapped[0]);
    }
  }, [API_BASE]);

  // When user logs in, load their history from backend
  useEffect(() => {
    if (userId) {
      loadUserHistory(userId).catch((err) => {
        console.error('Failed to load history on login:', err);
      });
    }
  }, [userId, loadUserHistory]);

  // Save predictions to localStorage whenever they change.
  useEffect(() => {
    localStorage.setItem('predictions', JSON.stringify(predictions));
  }, [predictions]);

  const handleAuth = async ({ username, email, password, fullName, isLogin }) => {
    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin
      ? { username, password }
      : { username, email, password, full_name: fullName || null };

    const response = await fetch(`${API_BASE}/users/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Unable to ${isLogin ? 'login' : 'register'}`);
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Load user history, but don't prevent login if it fails
    try {
      await loadUserHistory(data.user.id);
    } catch (historyError) {
      console.error('Failed to load history:', historyError);
      // History load failure won't prevent successful login
      // User can still see the app, history will be empty or load on next action
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPredictions([]);
    setLastPrediction(null);
    localStorage.removeItem('user');
    localStorage.removeItem('predictions');
    setCurrentTab('predict');
  };

  const handlePredict = async (formData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          caffeine_mg: formData.caffeine_mg,
          alcohol_units: formData.alcohol_units,
          screen_time_min: formData.screen_time_min,
          sleep_duration_hours: formData.sleep_duration_hours,
          calories_kcal: formData.calories_kcal,
          resting_hr_bpm: formData.resting_hr_bpm,
          workout_minutes: formData.workout_minutes,
          working_hours: formData.working_hours,
          spo2_avg_pct: formData.spo2_avg_pct,
          mood: formData.mood,
        }),
      });

      if (!response.ok) throw new Error('Prediction failed');

      const data = await response.json();
      if (user?.id && data.saved_record_id) {
        await loadUserHistory(user.id);
      } else {
        const prediction = {
          id: data.saved_record_id || Date.now(),
          timestamp: new Date().toISOString(),
          ...formData,
          score: data.predicted_stress_score,
          level: data.stress_level,
          category: data.category,
        };
        setLastPrediction(prediction);
        setPredictions((prev) => [...prev, prediction]);
      }
      setCurrentTab('results');
    } catch (error) {
      alert('Error making prediction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoginRegister onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stress Predictor</h1>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${currentTab === 'predict' ? 'active' : ''}`}
          onClick={() => setCurrentTab('predict')}
        >
          Predict
        </button>
        <button
          className={`nav-btn ${currentTab === 'results' ? 'active' : ''}`}
          onClick={() => setCurrentTab('results')}
        >
          Results
        </button>
        <button
          className={`nav-btn ${currentTab === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentTab('history')}
        >
          History
        </button>
        <button
          className={`nav-btn ${currentTab === 'insights' ? 'active' : ''}`}
          onClick={() => setCurrentTab('insights')}
        >
          Insights
        </button>
      </nav>

      <main className="app-content">
        {currentTab === 'predict' && (
          <PredictionForm onPredict={handlePredict} loading={loading} />
        )}
        {currentTab === 'results' && lastPrediction && (
          <ResultsDisplay prediction={lastPrediction} />
        )}
        {currentTab === 'history' && (
          <History predictions={predictions} />
        )}
        {currentTab === 'insights' && (
          <Insights predictions={predictions} user={user} currentPrediction={lastPrediction} />
        )}
      </main>

      <VoiceAssistant
        predictions={predictions}
        onCommand={(result) => {
          if (result.tab) setCurrentTab(result.tab);
        }}
      />
    </div>
  );
}

export default App;
