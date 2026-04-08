import React, { useState } from 'react';
import './Insights.css';

function Insights({ predictions, user, currentPrediction }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (predictions.length === 0 && !currentPrediction) {
    return (
      <div className="insights-container">
        <h2>Performance Insights</h2>
        <div className="no-data">No predictions yet. Make predictions to see insights!</div>
      </div>
    );
  }

  const toTime = (value) => new Date(value).getTime();
  const allPoints = [...predictions].sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));

  const resolvedCurrent = currentPrediction || allPoints[allPoints.length - 1];
  const currentIdentity = `${resolvedCurrent?.id ?? 'no-id'}|${resolvedCurrent?.timestamp ?? 'no-time'}`;
  let removedCurrent = false;
  const history = allPoints.filter((point) => {
    if (removedCurrent) return true;
    const identity = `${point.id ?? 'no-id'}|${point.timestamp ?? 'no-time'}`;
    if (identity === currentIdentity) {
      removedCurrent = true;
      return false;
    }
    return true;
  });

  const historyPool = history.length > 0 ? history : allPoints;
  const historyCount = history.length;

  const average = (arr, key) => arr.reduce((sum, row) => sum + (Number(row?.[key]) || 0), 0) / Math.max(arr.length, 1);
  const scoreAvg = average(historyPool, 'score');
  const caffeineAvg = average(historyPool, 'caffeine_mg');
  const sleepAvg = average(historyPool, 'sleep_duration_hours');
  const screenAvg = average(historyPool, 'screen_time_min');

  const currentScore = resolvedCurrent?.score ?? scoreAvg;
  const scoreDelta = currentScore - scoreAvg;
  const improvementPercent = scoreAvg === 0 ? 0 : ((scoreAvg - currentScore) / scoreAvg) * 100;

  const lowCount = historyPool.filter((point) => point.category === 'low').length;
  const medCount = historyPool.filter((point) => point.category === 'medium').length;
  const highCount = historyPool.filter((point) => point.category === 'high').length;
  const totalDistribution = Math.max(historyPool.length, 1);

  const scoreValues = historyPool.map((point) => Number(point.score) || 0);
  const histogramValues = scoreValues.length > 0 ? scoreValues : [currentScore];

  const histogramBins = 6;
  const histogramMin = Math.min(...histogramValues, 0);
  const histogramMax = Math.max(...histogramValues, 100);
  const histogramRange = Math.max(histogramMax - histogramMin, 1);
  const histogramCounts = Array.from({ length: histogramBins }, () => 0);
  histogramValues.forEach((value) => {
    const rawIndex = Math.floor(((value - histogramMin) / histogramRange) * histogramBins);
    const index = Math.min(Math.max(rawIndex, 0), histogramBins - 1);
    histogramCounts[index] += 1;
  });
  const histogramMaxCount = Math.max(...histogramCounts, 1);

  const scatterPoints = historyPool
    .map((point) => ({
      x: Number(point.screen_time_min) || 0,
      y: Number(point.score) || 0,
      category: point.category || 'unknown',
    }))
    .filter((point) => point.x > 0 || point.y > 0);

  const scatterMaxX = Math.max(...scatterPoints.map((point) => point.x), Number(resolvedCurrent?.screen_time_min) || 0, 1);
  const scatterMaxY = Math.max(...scatterPoints.map((point) => point.y), Number(currentScore) || 0, 1);

  const trendWindow = allPoints.slice(-14);
  const yMin = Math.min(...trendWindow.map((point) => Number(point.score) || 0), 19);
  const yMax = Math.max(...trendWindow.map((point) => Number(point.score) || 0), 100);
  const chartW = 720;
  const chartH = 220;
  const padX = 24;
  const padY = 22;
  const denom = Math.max(trendWindow.length - 1, 1);

  const trendPolyline = trendWindow
    .map((point, idx) => {
      const x = padX + (idx / denom) * (chartW - padX * 2);
      const y = chartH - padY - (((Number(point.score) || 0) - yMin) / Math.max(yMax - yMin, 1)) * (chartH - padY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const lastPoint = trendWindow[trendWindow.length - 1];
  const lineDirection = trendWindow.length > 1
    ? (Number(trendWindow[trendWindow.length - 1].score) || 0) - (Number(trendWindow[trendWindow.length - 2].score) || 0)
    : 0;

  const formatDelta = (value, unit = '', reverseGood = false) => {
    const sign = value > 0 ? '+' : '';
    const good = reverseGood ? value <= 0 : value >= 0;
    return {
      text: `${sign}${value.toFixed(1)}${unit}`,
      className: good ? 'delta-good' : 'delta-bad',
    };
  };

  const caffeineDelta = formatDelta((resolvedCurrent?.caffeine_mg ?? caffeineAvg) - caffeineAvg, ' mg', true);
  const sleepDelta = formatDelta((resolvedCurrent?.sleep_duration_hours ?? sleepAvg) - sleepAvg, ' h', false);
  const screenDelta = formatDelta((resolvedCurrent?.screen_time_min ?? screenAvg) - screenAvg, ' min', true);

  const trendMessage = lineDirection > 0
    ? 'Latest score is trending upward versus the previous entry.'
    : lineDirection < 0
      ? 'Latest score is trending downward versus the previous entry.'
      : 'Latest score is stable compared to the previous entry.';

  const keyInsight = scoreDelta < -5
    ? 'Current stress is materially lower than your historical baseline.'
    : scoreDelta > 5
      ? 'Current stress is above your historical baseline and needs attention.'
      : 'Current stress is in line with your historical baseline.';

  const speakRecommendations = () => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const recommendations = [
      `Maintain or improve sleep consistency. Current sleep is ${resolvedCurrent?.sleep_duration_hours?.toFixed(1) || '0.0'} hours versus historical ${sleepAvg.toFixed(1)} hours.`,
      `Keep caffeine below your stress-triggering threshold. Current intake is ${resolvedCurrent?.caffeine_mg?.toFixed(0) || '0'} milligrams versus historical ${caffeineAvg.toFixed(0)} milligrams.`,
      `Optimize evening screen exposure. Current screen time is ${resolvedCurrent?.screen_time_min?.toFixed(0) || '0'} minutes versus historical ${screenAvg.toFixed(0)} minutes.`,
      `Review weekly score trend rather than one-off values. Your dataset currently has ${allPoints.length} total records, with ${historyCount} historical points used for baseline comparison.`,
    ];

    const utterance = new SpeechSynthesisUtterance(recommendations.join(' '));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const scoreCategoryColor = (category) => {
    if (category === 'low') return '#0f8a4b';
    if (category === 'medium') return '#856404';
    if (category === 'high') return '#721c24';
    return '#1f4ab8';
  };

  const scatterWidth = 560;
  const scatterHeight = 320;
  const scatterMargin = { top: 24, right: 24, bottom: 48, left: 60 };
  const scatterPlotWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
  const scatterPlotHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;
  const scatterMaxXDomain = Math.max(scatterMaxX, 1);
  const scatterMaxYDomain = Math.max(scatterMaxY, 1);
  const scatterXTicks = 4;
  const scatterYTicks = 4;

  const toScatterX = (value) => scatterMargin.left + ((value / scatterMaxXDomain) * scatterPlotWidth);
  const toScatterY = (value) => scatterMargin.top + scatterPlotHeight - ((value / scatterMaxYDomain) * scatterPlotHeight);

  return (
    <div className="insights-container">
      <h2>Performance Insights</h2>

      <div className="welcome-section">
        <h3>Hello, {user.username}!</h3>
        <p>
          Current prediction is separated from your historical trend so you can evaluate improvement
          objectively over time.
        </p>
      </div>

      <div className="kpi-grid">
        <div className="insight-card">
          <div className="card-title">Current Stress Score</div>
          <div className="card-value">{currentScore.toFixed(1)}</div>
          <div className="card-range">(19-100)</div>
        </div>
        <div className="insight-card">
          <div className="card-title">Historical Average</div>
          <div className="card-value">{scoreAvg.toFixed(1)}</div>
          <div className="card-range">based on {historyPool.length} record(s)</div>
        </div>
        <div className="insight-card">
          <div className="card-title">Improvement vs History</div>
          <div className={`card-value ${improvementPercent >= 0 ? 'positive' : 'negative'}`}>
            {improvementPercent >= 0 ? '+' : ''}{improvementPercent.toFixed(1)}%
          </div>
          <div className="card-range">positive means lower stress score</div>
        </div>
      </div>

      <div className="trend-panel">
        <h3>Stress Trend (Last {trendWindow.length} Points)</h3>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="trend-chart" role="img" aria-label="Stress trend chart">
          <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} className="axis-line" />
          <line x1={padX} y1={padY} x2={padX} y2={chartH - padY} className="axis-line" />
          <polyline points={trendPolyline} className="trend-line" />
          {trendWindow.map((point, idx) => {
            const x = padX + (idx / denom) * (chartW - padX * 2);
            const y = chartH - padY - (((Number(point.score) || 0) - yMin) / Math.max(yMax - yMin, 1)) * (chartH - padY * 2);
            return <circle key={`${point.id}-${idx}`} cx={x} cy={y} r="3" className="trend-dot" />;
          })}
        </svg>
        <p className="trend-caption">
          {trendMessage} Latest score: {lastPoint?.score?.toFixed(1)}.
        </p>
      </div>

      <div className="viz-card histogram-card">
        <h3>Histogram: Stress Score Frequency</h3>
        <div className="histogram-grid">
          {histogramCounts.map((count, index) => {
            const barHeight = (count / histogramMaxCount) * 100;
            const binStart = histogramMin + (index * histogramRange) / histogramBins;
            const binEnd = histogramMin + ((index + 1) * histogramRange) / histogramBins;
            return (
              <div key={index} className="histogram-bar-group">
                <div className="histogram-bar-track">
                  <div className="histogram-bar" style={{ height: `${barHeight}%` }} />
                </div>
                <div className="histogram-label">{binStart.toFixed(0)}-{binEnd.toFixed(0)}</div>
                <div className="histogram-count">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scatter-note">
        The scatter plot uses screen time on the horizontal axis and stress score on the vertical axis.
      </div>

      <div className="viz-card scatter-card">
        <h3>Scatter Plot: Screen Time vs Stress Score</h3>
        <svg viewBox={`0 0 ${scatterWidth} ${scatterHeight}`} className="scatter-chart" role="img" aria-label="Scatter plot of screen time and stress score">
          <defs>
            <pattern id="scatter-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d={`M 0 0 L ${scatterWidth} 0`} className="scatter-grid-line" />
            </pattern>
          </defs>
          {Array.from({ length: scatterYTicks + 1 }).map((_, index) => {
            const value = (scatterMaxYDomain / scatterYTicks) * index;
            const y = toScatterY(value);
            return (
              <g key={`scatter-y-${index}`}>
                <line x1={scatterMargin.left} y1={y} x2={scatterWidth - scatterMargin.right} y2={y} className="scatter-grid-line" />
                <text x={scatterMargin.left - 12} y={y + 4} className="scatter-tick-label" textAnchor="end">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
          {Array.from({ length: scatterXTicks + 1 }).map((_, index) => {
            const value = (scatterMaxXDomain / scatterXTicks) * index;
            const x = toScatterX(value);
            return (
              <g key={`scatter-x-${index}`}>
                <line x1={x} y1={scatterMargin.top} x2={x} y2={scatterHeight - scatterMargin.bottom} className="scatter-grid-line" />
                <text x={x} y={scatterHeight - 18} className="scatter-tick-label" textAnchor="middle">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
          <line x1={scatterMargin.left} y1={scatterHeight - scatterMargin.bottom} x2={scatterWidth - scatterMargin.right} y2={scatterHeight - scatterMargin.bottom} className="scatter-axis" />
          <line x1={scatterMargin.left} y1={scatterMargin.top} x2={scatterMargin.left} y2={scatterHeight - scatterMargin.bottom} className="scatter-axis" />
          {scatterPoints.map((point, index) => {
            const x = toScatterX(point.x);
            const y = toScatterY(point.y);
            return (
              <g key={`${point.category}-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5.5"
                  className="scatter-point"
                  style={{ fill: scoreCategoryColor(point.category) }}
                >
                  <title>{`Screen time: ${point.x} min, Stress score: ${point.y.toFixed(1)}`}</title>
                </circle>
              </g>
            );
          })}
          <circle
            cx={toScatterX(Number(resolvedCurrent?.screen_time_min) || 0)}
            cy={toScatterY(Number(currentScore) || 0)}
            r="8.5"
            className="scatter-current"
          >
            <title>Current point</title>
          </circle>
          <text x={scatterWidth / 2} y={scatterHeight - 8} className="scatter-axis-label" textAnchor="middle">
            Screen time (minutes)
          </text>
          <text
            x={16}
            y={scatterHeight / 2}
            className="scatter-axis-label"
            textAnchor="middle"
            transform={`rotate(-90 16 ${scatterHeight / 2})`}
          >
            Stress score
          </text>
        </svg>
        <div className="scatter-legend">
          <span><span className="legend-dot low" />Low</span>
          <span><span className="legend-dot medium" />Medium</span>
          <span><span className="legend-dot high" />High</span>
          <span><span className="legend-dot current" />Current</span>
        </div>
      </div>

      <div className="comparison-grid">
        <div className="comparison-card">
          <h3>Current vs Past Baseline</h3>
          <div className="comparison-row">
            <span>Stress score delta</span>
            <span className={scoreDelta <= 0 ? 'delta-good' : 'delta-bad'}>{scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}</span>
          </div>
          <div className="comparison-row">
            <span>Caffeine delta</span>
            <span className={caffeineDelta.className}>{caffeineDelta.text}</span>
          </div>
          <div className="comparison-row">
            <span>Sleep delta</span>
            <span className={sleepDelta.className}>{sleepDelta.text}</span>
          </div>
          <div className="comparison-row">
            <span>Screen time delta</span>
            <span className={screenDelta.className}>{screenDelta.text}</span>
          </div>
          <div className="insight-summary">{keyInsight}</div>
        </div>

        <div className="comparison-card">
          <h3>Historical Distribution</h3>
          <div className="distribution-bars">
            <div className="bar-item">
              <div className="bar-label"><span className="label-text">Low</span><span className="bar-count">{lowCount}</span></div>
              <div className="bar-container"><div className="bar low-bar" style={{ width: `${(lowCount / totalDistribution) * 100}%` }} /></div>
            </div>
            <div className="bar-item">
              <div className="bar-label"><span className="label-text">Medium</span><span className="bar-count">{medCount}</span></div>
              <div className="bar-container"><div className="bar medium-bar" style={{ width: `${(medCount / totalDistribution) * 100}%` }} /></div>
            </div>
            <div className="bar-item">
              <div className="bar-label"><span className="label-text">High</span><span className="bar-count">{highCount}</span></div>
              <div className="bar-container"><div className="bar high-bar" style={{ width: `${(highCount / totalDistribution) * 100}%` }} /></div>
            </div>
            <div className="distribution-footnote">Current category: <strong>{resolvedCurrent?.level || 'N/A'}</strong></div>
          </div>
        </div>
      </div>

      <div className="recommendations professional-note">
        <div className="recommendations-header">
          <h3>Recommendation</h3>
          <button
            className={`speak-btn ${isSpeaking ? 'speaking' : ''}`}
            onClick={speakRecommendations}
            disabled={isSpeaking}
            title="Read recommendations aloud"
            aria-label={isSpeaking ? 'Speaking recommendations' : 'Speak recommendations'}
          >
            {isSpeaking ? 'Speaking...' : 'Read Aloud'}
          </button>
        </div>
        <ul>
          <li>
            Maintain or improve sleep consistency. Current sleep is {resolvedCurrent?.sleep_duration_hours?.toFixed(1) || '0.0'}h
            versus historical {sleepAvg.toFixed(1)}h.
          </li>
          <li>
            Keep caffeine below your stress-triggering threshold. Current intake is {resolvedCurrent?.caffeine_mg?.toFixed(0) || '0'}mg
            versus historical {caffeineAvg.toFixed(0)}mg.
          </li>
          <li>
            Optimize evening screen exposure. Current screen time is {resolvedCurrent?.screen_time_min?.toFixed(0) || '0'} minutes
            versus historical {screenAvg.toFixed(0)} minutes.
          </li>
          <li>
            Review weekly score trend rather than one-off values. Your dataset currently has {allPoints.length} total records,
            with {historyCount} historical points used for baseline comparison.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Insights;
