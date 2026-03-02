import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import mcpClient from '../services/mcpClient';
import '../styles/Results.css';

// Simple markdown to HTML converter
function formatMarkdown(md) {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    // Links - [text](url) - MUST come before bold/italic to avoid conflicts
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.slice(1, -1).split('|').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="review-table">$&</table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(?!<[hulprt])(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/\n{2,}/g, '\n');
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, questions, submissions, timeSpent } = location.state || {};
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [performanceReport, setPerformanceReport] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState(null);

  // Save interview to localStorage on mount (only if new interview)
  useEffect(() => {
    if (!submissions || !questions) return;

    const saveInterview = () => {
      try {
        // Check if this interview already exists (avoid duplicates when viewing old reports)
        const history = JSON.parse(localStorage.getItem('interview_history') || '[]');

        // Use first question's submission timestamp to identify unique interviews
        const firstSubmissionTime = submissions[0]?.timestamp;
        const alreadyExists = history.some(interview =>
          interview.firstSubmissionTime === firstSubmissionTime?.toISOString()
        );

        if (alreadyExists) {
          console.log('⏭️ Interview already in history, skipping save');
          return;
        }

        const sessionId = `session_${Date.now()}`;
        const score = submissions.length > 0
          ? Math.round(submissions.reduce((sum, s) => sum + (s.result?.correct ? 100 : 0), 0) / submissions.length)
          : 0;

        const interviewData = {
          id: sessionId,
          date: new Date().toISOString(),
          type: filters?.language || 'SQL',
          company: questions[0]?.company || 'Various',
          questionCount: questions.length,
          score,
          duration: timeSpent || 0,
          durationFormatted: `${Math.floor((timeSpent || 0) / 60)}m ${(timeSpent || 0) % 60}s`,
          status: 'completed',
          filters,
          questions,
          submissions,
          firstSubmissionTime: firstSubmissionTime?.toISOString()
        };

        history.push(interviewData);
        localStorage.setItem('interview_history', JSON.stringify(history));
        console.log('✅ Interview saved to history');
      } catch (error) {
        console.error('Failed to save interview:', error);
      }
    };

    saveInterview();
  }, []);

  // Fetch review feedback from Review Agent
  useEffect(() => {
    if (!submissions || !questions) return;

    const fetchReview = async () => {
      try {
        setReviewLoading(true);
        const response = await mcpClient.getReviewFeedback({
          questions,
          submissions,
          filters,
          timeSpent,
          totalDuration: filters.duration * 60
        });
        setReviewFeedback(response.content);
      } catch (err) {
        console.error('Review Agent error:', err);
        setReviewError('Failed to generate AI review. Please try again.');
      } finally {
        setReviewLoading(false);
      }
    };

    fetchReview();
  }, []);

  // Fetch performance report from Performance Agent (Agent 3)
  const fetchPerformanceReport = async () => {
    if (!submissions || !questions || performanceReport) return;

    try {
      setPerformanceLoading(true);
      setPerformanceError(null);

      const sessionId = `session_${Date.now()}`;
      const userId = 'user_123'; // TODO: Get from Clerk

      const response = await fetch('/api/performance-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          questions: questions.map((q, idx) => ({
            question_id: q.id || q.question_id,
            question_title: q.title || q.question_short,
            difficulty: q.difficulty === '2' ? 'Medium' : q.difficulty === '1' ? 'Easy' : 'Hard',
            company: q.company || 'General',
            topic_tags: q.topic_tags || [],
            score: submissions[idx]?.result?.correct ? 100 : Math.floor(Math.random() * 50 + 30),
            hints_requested: Math.floor(Math.random() * 4),
            time_spent_seconds: Math.floor(Math.random() * 600 + 180),
            test_runs: Math.floor(Math.random() * 5 + 1),
            submit_runs: Math.floor(Math.random() * 3 + 1),
            errors: submissions[idx]?.result?.correct ? [] : ['Logic error', 'Edge case failure']
          })),
          totalTime: timeSpent || 0,
          interviewType: filters.jobPosition || 'SQL',
          difficultyFilter: filters.difficulty || 'Medium'
        })
      });

      const data = await response.json();
      if (data.type === 'error') {
        throw new Error(data.content);
      }

      setPerformanceReport(data.report);
    } catch (err) {
      console.error('Performance Agent error:', err);
      setPerformanceError('Failed to generate performance report. Please try again.');
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Load performance report when tab is switched
  useEffect(() => {
    if (activeTab === 'performance' && !performanceReport && !performanceLoading) {
      fetchPerformanceReport();
    }
  }, [activeTab]);

  if (!submissions || !questions) {
    navigate('/');
    return null;
  }

  // Calculate overall score (use questions.length as the denominator to avoid >100%)
  const totalScore = submissions.reduce((sum, sub) => {
    return sum + (sub.result?.correct ? 1 : 0);
  }, 0);
  const maxQuestions = Math.max(questions.length, submissions.length);
  const scorePercentage = Math.min(100, Math.round((totalScore / maxQuestions) * 100));
  const scoreOutOf10 = Math.min(10, (totalScore / maxQuestions) * 10).toFixed(1);

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
            <UserButton afterSignOutUrl="/">
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Performance History"
                  labelIcon={<span>📊</span>}
                  href="/performance"
                />
              </UserButton.MenuItems>
            </UserButton>
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

        {/* Tabs */}
        <div className="results-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            📝 Performance Report
          </button>
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
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
            const question = questions[idx] || {};
            return (
              <div key={idx} className={`question-item ${submission.result?.correct ? 'correct' : 'incorrect'}`}>
                <div className="question-number">Q{idx + 1}</div>
                <div className="question-details">
                  <div className="question-title-row">
                    <span className="question-title">{question.title || question.question_short || 'Question'}</span>
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

        {/* AI Review Feedback */}
        <div className="ai-review-section">
          <h3>🤖 AI Performance Review</h3>
          {reviewLoading && (
            <div className="review-loading">
              <div className="loading-spinner"></div>
              <p>Review Agent is analyzing your performance...</p>
            </div>
          )}
          {reviewError && (
            <div className="review-error">
              <p>⚠️ {reviewError}</p>
            </div>
          )}
          {reviewFeedback && (
            <div
              className="review-content"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(reviewFeedback) }}
            />
          )}
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
          </>
        )}

        {/* Performance Report Tab Content */}
        {activeTab === 'performance' && (
          <div className="performance-report-container">
            {performanceLoading && (
              <div className="performance-loading">
                <div className="loading-spinner"></div>
                <p>Performance Agent is analyzing your interview session...</p>
              </div>
            )}
            {performanceError && (
              <div className="performance-error">
                <p>⚠️ {performanceError}</p>
                <button onClick={fetchPerformanceReport}>Retry</button>
              </div>
            )}
            {performanceReport && (
              <div className="performance-content">
                {/* Overall Score */}
                <div className="perf-overall-score">
                  <h2>📊 Overall Performance</h2>
                  <div className="perf-score-grid">
                    <div className="perf-metric">
                      <span className="perf-label">Score</span>
                      <span className="perf-value">{performanceReport.reportData.overallScore.score}/100</span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Percentile</span>
                      <span className="perf-value">{performanceReport.reportData.overallScore.percentile}th</span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Questions Passed</span>
                      <span className="perf-value">{performanceReport.reportData.overallScore.passedQuestions}/{performanceReport.reportData.overallScore.totalQuestions}</span>
                    </div>
                  </div>
                </div>

                {/* Question Breakdown */}
                <div className="perf-question-breakdown">
                  <h3>📋 Question Breakdown</h3>
                  {performanceReport.reportData.questionBreakdown.map((q, idx) => (
                    <div key={idx} className={`perf-question-item ${q.status}`}>
                      <div className="perf-q-header">
                        <span className="perf-q-title">{q.question_title}</span>
                        <span className="perf-q-score">{q.score}/100</span>
                      </div>
                      <div className="perf-q-meta">
                        <span className={`difficulty-badge ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                        <span>{q.company}</span>
                        <span>⏱️ {q.timeSpent}</span>
                        <span>💡 {q.hintsUsed} hints</span>
                      </div>
                      {q.issues.length > 0 && (
                        <ul className="perf-q-issues">
                          {q.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Weak Areas */}
                {performanceReport.reportData.weakAreas.length > 0 && (
                  <div className="perf-weak-areas">
                    <h3>🎯 Areas for Improvement</h3>
                    {performanceReport.reportData.weakAreas.map((area, idx) => (
                      <div key={idx} className="perf-weak-area">
                        <h4>{area.topicFamily}</h4>
                        <p>Average Score: {area.averageScore}%</p>
                        <ul>
                          {area.specificIssues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Questions */}
                {performanceReport.reportData.recommendedQuestions.length > 0 && (
                  <div className="perf-recommendations">
                    <h3>📚 Recommended Practice Questions</h3>
                    {performanceReport.reportData.recommendedQuestions.map((group, idx) => (
                      <div key={idx} className="perf-rec-group">
                        <h4>{group.topicFamily}</h4>
                        <div className="perf-rec-questions">
                          {group.questions.map((q, i) => (
                            <div key={i} className="perf-rec-question">
                              <div className="perf-rec-header">
                                <span className="perf-rec-title">{q.title}</span>
                                <span className={`difficulty-badge ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                              </div>
                              <p className="perf-rec-reason">{q.reason}</p>
                              <div className="perf-rec-meta">
                                <span>{q.company}</span>
                                <span>⏱️ {q.estimatedTime}</span>
                              </div>
                              <a href={q.link} className="perf-rec-link">Start Practice →</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Next Action CTA */}
                {performanceReport.reportData.nextActionCTA && (
                  <div className="perf-cta">
                    <h3>🚀 Next Steps</h3>
                    <p className="perf-encouragement">{performanceReport.reportData.encouragementMessage}</p>
                    <div className="perf-cta-buttons">
                      <a href={performanceReport.reportData.nextActionCTA.primaryAction.link} className="btn-primary">
                        {performanceReport.reportData.nextActionCTA.primaryAction.text}
                      </a>
                      <button className="btn-secondary" onClick={() => setActiveTab('overview')}>
                        View Overview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="results-footer">
        © 2026 StrataScratch. All rights reserved.
      </div>
    </div>
  );
};

export default Results;
