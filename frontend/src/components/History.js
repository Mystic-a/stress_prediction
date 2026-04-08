import React from 'react';
import './History.css';

function History({ predictions }) {
  if (predictions.length === 0) {
    return (
      <div className="history-container">
        <h2>Your Prediction History</h2>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Start Tracking Your Stress</h3>
          <p>Once you make your first prediction, your history will appear here.</p>
          <p className="empty-state-hint">Click on the "Predict" tab to analyze your daily health data.</p>
        </div>
      </div>
    );
  }

  const getColor = (category) => {
    switch (category) {
      case 'low':
        return '#0f8a4b';
      case 'medium':
        return '#856404';
      case 'high':
        return '#721c24';
      default:
        return '#666';
    }
  };

  return (
    <div className="history-container">
      <h2>Your Prediction History</h2>
      <div className="history-stats">
        <div className="stat-card">
          <div className="stat-number">{predictions.length}</div>
          <div className="stat-label">Total Predictions</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {(predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length).toFixed(1)}
          </div>
          <div className="stat-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {predictions.filter(p => p.category === 'low').length}
          </div>
          <div className="stat-label">Low Stress Days</div>
        </div>
      </div>

      <div className="history-list">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="history-item">
            <div className="history-date">
              {new Date(prediction.timestamp).toLocaleDateString()} 
              {' '}
              {new Date(prediction.timestamp).toLocaleTimeString()}
            </div>
            <div className="history-level" style={{ color: getColor(prediction.category) }}>
              {prediction.level}
            </div>
            <div className="history-score">{prediction.score.toFixed(2)}</div>
            <div className="history-mood">
              Mood: {prediction.mood}
              {prediction.working_hours !== undefined && prediction.working_hours !== null ? ` | Working hours: ${prediction.working_hours}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
