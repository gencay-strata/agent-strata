import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Results.css';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, questions, submissions, timeSpent } = location.state || {};

  if (!submissions || !questions) {
    navigate('/');
    return null;
  }

  // Calculate overall score
  const totalScore = submissions.reduce((sum, sub) => {
    return sum + (sub.result?.correct ? 1 : 0);
  }, 0);
  const scorePercentage = Math.round((totalScore / questions.length) * 100);
  const scoreOutOf10 = ((totalScore / questions.length) * 10).toFixed(1);

  // Calculate percentile (mock data)
  const percentile = scorePercentage >= 90 ? 87 : scorePercentage >= 70 ? 73 : scorePercentage >= 50 ? 55 : 35;

  // Format time spent
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Category scores (mock data based on performance)
  const technicalSkill = Math.min(10, Math.round(scoreOutOf10 * 1.1));
  const codeQuality = Math.min(10, Math.round(scoreOutOf10 * 0.95));
  const communication = Math.min(10, Math.round(scoreOutOf10 * 0.9));

  return (
    <div className="results-container">
      {/* Navigation Bar */}
      <div className="strata-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <span className="strata-logo">stratascratch</span>
            <nav className="navbar-links">
              <span>Coding Questions</span>
              <span>Non-coding Questions</span>
              <span>Data Projects</span>
              <span>Tools</span>
              <span>Guides</span>
            </nav>
          </div>
          <div className="navbar-right">
            <span>Login</span>
            <span className="register-btn">Register</span>
          </div>
        </div>
      </div>

      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>Interview Complete! <span className="submitted-badge">✓ Submitted</span></h1>
          <div className="interview-info">
            <span className="interview-type">{filters.jobPosition} - {filters.company || 'General'}</span>
            <span className="completion-time">Completed: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
          </div>
        </div>

        {/* Main Score Card */}
        <div className="score-card">
          <div className="score-circle">
            <svg viewBox="0 0 200 200" className="circle-svg">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray={`${scorePercentage * 5.65} 565`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="score-text">
              <div className="score-number">{scoreOutOf10}</div>
              <div className="score-total">/10</div>
            </div>
          </div>
          <div className="score-details">
            <div className="percentile-badge">
              <span className="percentile-number">{scorePercentage}%</span>
              <span className="percentile-text">Beats {percentile}% of all users</span>
              <span className="rank-badge">🏆 Almost There</span>
            </div>
            <div className="time-spent">
              <span className="time-icon">⏱️</span> Time Spent
              <div className="time-value">{formatTime(timeSpent || 0)}</div>
              <div className="time-allocated">/ {filters.duration}:00 allotted</div>
              <div className="time-bar">
                <div
                  className="time-bar-fill"
                  style={{ width: `${Math.min(100, (timeSpent / (filters.duration * 60)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="distribution-card">
          <h3>Score Distribution</h3>
          <div className="distribution-chart">
            <div className="distribution-bars">
              {['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'].map((range, idx) => {
                const height = Math.random() * 60 + 20; // Mock data
                const isYourScore = parseFloat(scoreOutOf10) >= idx && parseFloat(scoreOutOf10) < idx + 1;
                return (
                  <div key={range} className="bar-container">
                    <div
                      className={`bar ${isYourScore ? 'your-score' : ''}`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="bar-label">{range}</span>
                  </div>
                );
              })}
            </div>
            <div className="distribution-legend">
              <span className="legend-item"><span className="legend-dot all-users"></span> All Users</span>
              <span className="legend-item"><span className="legend-dot your-score"></span> Your Score</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="category-breakdown">
          <h3>Category Breakdown</h3>

          <div className="category-card technical">
            <div className="category-header">
              <span className="category-name">Technical Skill</span>
              <span className="category-score">{technicalSkill}<span className="score-max">/10</span></span>
            </div>
            <div className="category-stats">
              <span className="stat-item">↗ +{Math.round(Math.random() * 20)}% vs. previous</span>
              <span className="stat-item">👥 +{Math.round(Math.random() * 50)}% vs. others</span>
            </div>
          </div>

          <div className="category-card quality">
            <div className="category-header">
              <span className="category-name">Code Quality</span>
              <span className="category-score">{codeQuality}<span className="score-max">/10</span></span>
            </div>
            <div className="category-stats">
              <span className="stat-item">↗ +{Math.round(Math.random() * 20)}% vs. previous</span>
              <span className="stat-item">👥 +{Math.round(Math.random() * 50)}% vs. others</span>
            </div>
          </div>

          <div className="category-card communication">
            <div className="category-header">
              <span className="category-name">Communication</span>
              <span className="category-score">{communication}<span className="score-max">/10</span></span>
            </div>
            <div className="category-stats">
              <span className="stat-item">↗ +{Math.round(Math.random() * 20)}% vs. previous</span>
              <span className="stat-item">👥 +{Math.round(Math.random() * 50)}% vs. others</span>
            </div>
          </div>
        </div>

        {/* Question Summary */}
        <div className="question-summary">
          <h3>Question Summary</h3>
          {submissions.map((submission, idx) => {
            const question = questions[idx];
            return (
              <div key={idx} className={`question-item ${submission.result?.correct ? 'correct' : 'incorrect'}`}>
                <div className="question-number">Q{idx + 1}</div>
                <div className="question-details">
                  <div className="question-title-row">
                    <span className="question-title">{question.title || question.question_short}</span>
                    <span className="question-score">
                      {submission.result?.correct ? '9' : Math.floor(Math.random() * 5 + 3)}<span className="score-max">/10</span>
                    </span>
                  </div>
                  <div className="question-meta">
                    <span className={`difficulty-badge ${question.difficulty === '2' ? 'medium' : question.difficulty === '1' ? 'easy' : 'hard'}`}>
                      {question.difficulty === '2' ? 'Medium' : question.difficulty === '1' ? 'Easy' : 'Hard'}
                    </span>
                    <span className="test-cases">Test Cases: {submission.result?.correct ? '5/5' : '3/5'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            🔄 Try Another Interview
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            📊 Share Results
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="results-footer">
        © 2026 StrataScratch. All rights reserved.
      </div>
    </div>
  );
};

export default Results;
