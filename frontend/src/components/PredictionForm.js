import React, { useState } from 'react';
import './PredictionForm.css';

function PredictionForm({ onPredict, loading }) {
  const [formData, setFormData] = useState({
    caffeine_mg: '',
    alcohol_units: '',
    screen_time_min: '',
    sleep_duration_hours: '',
    calories_kcal: '',
    resting_hr_bpm: '',
    workout_minutes: '',
    working_hours: '',
    spo2_avg_pct: '',
    mood: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const requiredFields = [
      'caffeine_mg',
      'alcohol_units',
      'screen_time_min',
      'sleep_duration_hours',
      'calories_kcal',
      'mood',
    ];

    const missing = requiredFields.find((field) => formData[field] === '');
    if (missing) {
      alert('Please fill all required fields before predicting.');
      return;
    }

    const payload = {
      ...formData,
      caffeine_mg: parseFloat(formData.caffeine_mg),
      alcohol_units: parseFloat(formData.alcohol_units),
      screen_time_min: parseFloat(formData.screen_time_min),
      sleep_duration_hours: parseFloat(formData.sleep_duration_hours),
      calories_kcal: parseFloat(formData.calories_kcal),
      resting_hr_bpm: formData.resting_hr_bpm === '' ? null : parseFloat(formData.resting_hr_bpm),
      workout_minutes: formData.workout_minutes === '' ? null : parseFloat(formData.workout_minutes),
      working_hours: formData.working_hours === '' ? null : parseFloat(formData.working_hours),
      spo2_avg_pct: formData.spo2_avg_pct === '' ? null : parseFloat(formData.spo2_avg_pct),
    };

    onPredict(payload);
  };

  return (
    <div className="prediction-form-container">
      <h2>Enter Your Daily Health Data</h2>
      <p className="form-intro">Update your daily health metrics to get a personalized stress prediction. All fields are important for accuracy.</p>
      
      <form onSubmit={handleSubmit} className="prediction-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="caffeine">Caffeine (mg)</label>
            <input
              id="caffeine"
              type="number"
              name="caffeine_mg"
              value={formData.caffeine_mg}
              onChange={handleChange}
              step="any"
              min="0"
              aria-label="Caffeine intake in milligrams"
            />
            <span className="field-hint">e.g., 1 cup of coffee = 95 mg</span>
          </div>

          <div className="form-group">
            <label htmlFor="alcohol">Alcohol Units</label>
            <input
              id="alcohol"
              type="number"
              name="alcohol_units"
              value={formData.alcohol_units}
              onChange={handleChange}
              step="0.1"
              min="0"
              aria-label="Alcohol consumption in units"
            />
            <span className="field-hint">1 unit = 1 drink (std serving)</span>
          </div>

          <div className="form-group">
            <label htmlFor="screenTime">Screen Time (min)</label>
            <input
              id="screenTime"
              type="number"
              name="screen_time_min"
              value={formData.screen_time_min}
              onChange={handleChange}
              step="any"
              min="0"
              aria-label="Daily screen time in minutes"
            />
            <span className="field-hint">Total TV, phone, computer use</span>
          </div>

          <div className="form-group">
            <label htmlFor="sleep">Sleep Duration (hours)</label>
            <input
              id="sleep"
              type="number"
              name="sleep_duration_hours"
              value={formData.sleep_duration_hours}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="24"
              aria-label="Nightly sleep duration in hours"
            />
            <span className="field-hint">Aim for 7-9 hours for best health</span>
          </div>

          <div className="form-group">
            <label htmlFor="calories">Daily Calories (kcal)</label>
            <input
              id="calories"
              type="number"
              name="calories_kcal"
              value={formData.calories_kcal}
              onChange={handleChange}
              step="any"
              min="0"
              aria-label="Daily calorie intake"
            />
            <span className="field-hint">Total energy consumed</span>
          </div>

          <div className="form-group">
            <label htmlFor="mood">How's Your Mood?</label>
            <select 
              id="mood"
              name="mood" 
              value={formData.mood} 
              onChange={handleChange}
              aria-label="Current mood"
            >
              <option value="" disabled>Select mood</option>
              <option value="very_bad">Very Bad</option>
              <option value="bad">Bad</option>
              <option value="neutral">Neutral</option>
              <option value="good">Good</option>
              <option value="very_good">Very Good</option>
            </select>
            <span className="field-hint">Self-reported emotional state</span>
          </div>

          <div className="form-group">
            <label htmlFor="heartRate">Resting Heart Rate (bpm)</label>
            <input
              id="heartRate"
              type="number"
              name="resting_hr_bpm"
              value={formData.resting_hr_bpm}
              onChange={handleChange}
              step="any"
              min="0"
              aria-label="Resting heart rate in beats per minute"
            />
            <span className="field-hint">Measured after 5+ min relaxation</span>
          </div>

          <div className="form-group">
            <label htmlFor="workout">Workout Time (min)</label>
            <input
              id="workout"
              type="number"
              name="workout_minutes"
              value={formData.workout_minutes}
              onChange={handleChange}
              step="any"
              min="0"
              aria-label="Exercise duration in minutes"
            />
            <span className="field-hint">Physical activity/exercise today</span>
          </div>

          <div className="form-group">
            <label htmlFor="workingHours">Working Hours</label>
            <input
              id="workingHours"
              type="number"
              name="working_hours"
              value={formData.working_hours}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="24"
              aria-label="Total working hours today"
            />
            <span className="field-hint">Hours spent on work/study today</span>
          </div>

          <div className="form-group">
            <label htmlFor="spo2">Blood Oxygen Level (SpO2 %)</label>
            <input
              id="spo2"
              type="number"
              name="spo2_avg_pct"
              value={formData.spo2_avg_pct}
              onChange={handleChange}
              step="0.1"
              min="70"
              max="100"
              aria-label="Blood oxygen saturation percentage"
            />
            <span className="field-hint">Normal range: 95-100%. Use pulse oximeter.</span>
          </div>
        </div>

        <button type="submit" className="predict-btn" disabled={loading} aria-busy={loading}>
          {loading ? 'Analyzing your data...' : 'Predict Stress Level'}
        </button>

        <p className="form-note">Your data is securely stored and used only for your predictions.</p>
      </form>
    </div>
  );
}

export default PredictionForm;
