import React from 'react';
import './ResultsDisplay.css';

function ResultsDisplay({ prediction }) {
  if (!prediction) {
    return (
      <div className="results-container">
        <h2>Your Stress Prediction Results</h2>
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <h3>Ready to Get Started?</h3>
          <p>Enter your daily health data in the "Predict" tab to see your personalized stress analysis here.</p>
          <p className="empty-state-hint">It takes less than a minute to get your first prediction.</p>
        </div>
      </div>
    );
  }

  const getBgColor = (category) => {
    switch (category) {
      case 'low':
        return '#d4edda';
      case 'medium':
        return '#fff3cd';
      case 'high':
        return '#f8d7da';
      default:
        return '#f0f0f0';
    }
  };

  const getTextColor = (category) => {
    switch (category) {
      case 'low':
        return '#0f8a4b';
      case 'medium':
        return '#856404';
      case 'high':
        return '#721c24';
      default:
        return '#333';
    }
  };

  return (
    <div className="results-container">
      <h2>Prediction Results</h2>
      <div
        className="result-card"
        style={{
          background: getBgColor(prediction.category),
        }}
      >
        <div className="result-level" style={{ color: getTextColor(prediction.category) }}>
          {prediction.level}
        </div>
        <div className="result-score">Score: {prediction.score.toFixed(2)}</div>
        <div className="result-range">Range: 19 (Low) to 100 (High)</div>
        
        <div className="result-details">
          <h3>Your Input Data:</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Caffeine</span>
              <span className="detail-value">{prediction.caffeine_mg} mg</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Alcohol</span>
              <span className="detail-value">{prediction.alcohol_units} units</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Screen Time</span>
              <span className="detail-value">{prediction.screen_time_min} min</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sleep Duration</span>
              <span className="detail-value">{prediction.sleep_duration_hours} hrs</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Calories</span>
              <span className="detail-value">{prediction.calories_kcal} kcal</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mood</span>
              <span className="detail-value">{prediction.mood}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Resting Heart Rate</span>
              <span className="detail-value">{prediction.resting_hr_bpm} bpm</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Workout</span>
              <span className="detail-value">{prediction.workout_minutes} min</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Blood Oxygen (SpO2)</span>
              <span className="detail-value">{prediction.spo2_avg_pct}%</span>
            </div>
          </div>
        </div>

        <div className="result-tips">
          <h3>Quick Tips:</h3>
          <ul>
            {prediction.category === 'high' && (
              <>
                <li>Consider reducing caffeine intake</li>
                <li>Try relaxation techniques like meditation</li>
                <li>Ensure you're getting enough sleep (7-8 hours)</li>
                <li>Reduce screen time in the evening</li>
              </>
            )}
            {prediction.category === 'medium' && (
              <>
                <li>Maintain your current sleep schedule</li>
                <li>Consider a short walk or light exercise</li>
                <li>Practice mindfulness for 5-10 minutes</li>
              </>
            )}
            {prediction.category === 'low' && (
              <>
                <li>Great job maintaining healthy habits!</li>
                <li>Keep up with your current routine</li>
                <li>Continue managing stress effectively</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ResultsDisplay;
