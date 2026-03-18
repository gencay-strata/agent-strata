import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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

  // Calculate overall score using actual scores (0-100 per question)
  const totalScore = submissions.reduce((sum, sub) => {
    return sum + (sub.result?.score || 0);
  }, 0);
  const maxQuestions = Math.max(questions.length, submissions.length);
  const averageScore = totalScore / maxQuestions; // 0-100 range
  const scorePercentage = Math.min(100, Math.round(averageScore));
  const scoreOutOf10 = Math.min(10, (averageScore / 10)).toFixed(1);

  // Calculate percentile (mock data)
  const percentile = scorePercentage >= 90 ? 87 : scorePercentage >= 70 ? 73 : scorePercentage >= 50 ? 55 : 35;

  // Format time spent
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Category scores (calculated from real data)
  const technicalSkill = Math.min(10, Math.round(scoreOutOf10)); // Based on actual scores
  const timeUsagePercent = (timeSpent / (filters.duration * 60)) * 100;
  const timeManagement = timeUsagePercent < 60 ? 9 :  // Fast completion
                         timeUsagePercent < 85 ? 7 :  // Good time usage
                         timeUsagePercent < 100 ? 5 : // Close to limit
                         3; // Time ran out

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
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📈 Performance History
          </button>
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
        {/* Interviewer's Decision */}
        <div className={`interviewer-decision ${
          scoreOutOf10 >= 8 ? 'strong-pass' :
          scoreOutOf10 >= 6 ? 'pass' :
          scoreOutOf10 >= 4 ? 'borderline' : 'not-ready'
        }`}>
          <div className="decision-icon">
            {scoreOutOf10 >= 8 ? '✅' : scoreOutOf10 >= 6 ? '✅' : scoreOutOf10 >= 4 ? '⚠️' : '📚'}
          </div>
          <div className="decision-content">
            <h2 className="decision-title">
              {scoreOutOf10 >= 8 ? '✅ Strong Pass - You\'re interview ready!' :
               scoreOutOf10 >= 6 ? '✅ Pass - Just a few things to polish.' :
               scoreOutOf10 >= 4 ? '⚠️ Getting Close - A bit more practice will get you there.' :
               '📚 Keep Practicing - Review the basics and give it another go.'}
            </h2>
            <p className="decision-subtitle">
              {scoreOutOf10 >= 8 ? 'Excellent work! You demonstrate strong technical skills and problem-solving ability.' :
               scoreOutOf10 >= 6 ? 'Good performance overall. Polish a few areas and you\'ll be ready.' :
               scoreOutOf10 >= 4 ? 'You\'re on the right track but need more practice to build confidence.' :
               'Focus on understanding core concepts before tackling more complex problems.'}
            </p>
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

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => navigate('/interview-setup')}>
            🔄 Try Another Interview
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            📊 Share Results
          </button>
        </div>

        {/* Logic & Output Breakdown */}
        <div className="score-breakdown-section">
          <h3>Score Breakdown</h3>

          {/* Logic Summary */}
          <div className="breakdown-card logic">
            <div className="breakdown-header">
              <span className="breakdown-icon">💡</span>
              <div className="breakdown-title">
                <h4>Logic Score (75% weight)</h4>
                <div className="breakdown-score">
                  {(() => {
                    const logicScores = submissions.map(s => s.result?.logicScore || 0);
                    const avgLogic = logicScores.reduce((sum, score) => sum + score, 0) / logicScores.length;
                    return (avgLogic / 10).toFixed(1);
                  })()}<span className="score-max">/10</span>
                </div>
              </div>
            </div>
            <div className="breakdown-summary">
              <p>
                {(() => {
                  const logicScores = submissions.map(s => s.result?.logicScore || 0);
                  const avgLogic = logicScores.reduce((sum, score) => sum + score, 0) / logicScores.length;
                  if (avgLogic >= 80) return "Excellent problem-solving approach and code structure. Your logic demonstrates strong understanding of core concepts.";
                  if (avgLogic >= 60) return "Good logic overall. Some areas could be optimized for better efficiency and readability.";
                  return "Logic needs improvement. Focus on understanding the problem requirements and structuring your approach before coding.";
                })()}
              </p>
            </div>
          </div>

          {/* Output Summary */}
          <div className="breakdown-card output">
            <div className="breakdown-header">
              <span className="breakdown-icon">✅</span>
              <div className="breakdown-title">
                <h4>Output Score (25% weight)</h4>
                <div className="breakdown-score">
                  {(() => {
                    const outputScores = submissions.map(s => s.result?.outputScore || 0);
                    const avgOutput = outputScores.reduce((sum, score) => sum + score, 0) / outputScores.length;
                    return (avgOutput / 10).toFixed(1);
                  })()}<span className="score-max">/10</span>
                </div>
              </div>
            </div>
            <div className="breakdown-summary">
              <p>
                {(() => {
                  const outputScores = submissions.map(s => s.result?.outputScore || 0);
                  const avgOutput = outputScores.reduce((sum, score) => sum + score, 0) / outputScores.length;
                  if (avgOutput >= 80) return "Your solutions produce correct outputs. Great attention to detail and accuracy.";
                  if (avgOutput >= 60) return "Most outputs are correct. Double-check edge cases and result formatting.";
                  return "Output accuracy needs work. Verify your results match expected format and handle all test cases.";
                })()}
              </p>
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
              <span className="stat-item">📊 Based on solution correctness</span>
            </div>
          </div>

          <div className="category-card quality">
            <div className="category-header">
              <span className="category-name">Time Management</span>
              <span className="category-score">{timeManagement}<span className="score-max">/10</span></span>
            </div>
            <div className="category-stats">
              <span className="stat-item">⏱️ Used {Math.round(timeUsagePercent)}% of allocated time</span>
            </div>
          </div>
        </div>

        {/* Question Summary */}
        <div className="question-summary">
          <h3>Question Summary</h3>
          {submissions.map((submission, idx) => {
            const question = questions[idx] || {};
            const finalScore = submission.result?.finalScore || submission.result?.score || 0;
            const logicScore = submission.result?.logicScore || 0;
            const outputScore = submission.result?.outputScore || 0;
            const logicExplanation = submission.result?.logicExplanation || '';
            const outputExplanation = submission.result?.outputExplanation || '';
            const scoreOutOf10 = (finalScore / 10).toFixed(1);

            return (
              <div key={idx} className={`question-item ${finalScore >= 60 ? 'correct' : 'incorrect'}`}>
                <div className="question-number">Q{idx + 1}</div>
                <div className="question-details">
                  <div className="question-title-row">
                    <span className="question-title">{question.title || question.question_short || 'Question'}</span>
                    <span className="question-score">
                      {scoreOutOf10}<span className="score-max">/10</span>
                    </span>
                  </div>
                  <div className="question-meta">
                    <span className={`difficulty-badge ${question.difficulty === '2' ? 'medium' : question.difficulty === '1' ? 'easy' : 'hard'}`}>
                      {question.difficulty === '2' ? 'Medium' : question.difficulty === '1' ? 'Easy' : 'Hard'}
                    </span>
                  </div>

                  {/* Score Breakdown */}
                  <div className="question-breakdown">
                    <div className="breakdown-item">
                      <span className="breakdown-label">💡 Logic (75%):</span>
                      <span className="breakdown-value">{(logicScore / 10).toFixed(1)}/10</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">✅ Output (25%):</span>
                      <span className="breakdown-value">{(outputScore / 10).toFixed(1)}/10</span>
                    </div>
                  </div>

                  {/* Explanations */}
                  {logicExplanation && (
                    <div className="question-explanation logic">
                      <strong>Logic Feedback:</strong>
                      <p>{logicExplanation}</p>
                    </div>
                  )}
                  {outputExplanation && (
                    <div className="question-explanation output">
                      <strong>Output:</strong>
                      <p>{outputExplanation}</p>
                    </div>
                  )}
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

        {/* Performance History Tab Content */}
        {activeTab === 'history' && (
          <div className="history-tab-content">
            {(() => {
              const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
              const sortedHistory = history.slice().reverse(); // Most recent first

              if (sortedHistory.length === 0) {
                return (
                  <div className="empty-history">
                    <h3>📊 No Interview History Yet</h3>
                    <p>Complete more mock interviews to track your progress over time.</p>
                    <button className="btn-primary" onClick={() => navigate('/')}>
                      Start New Interview
                    </button>
                  </div>
                );
              }

              // Prepare chart data (chronological order for chart)
              const chartData = history.slice().map((interview, idx) => ({
                name: `#${idx + 1}`,
                date: new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: interview.score,
                fullDate: interview.date
              }));

              // Calculate stats
              const avgScore = Math.round(sortedHistory.reduce((sum, i) => sum + i.score, 0) / sortedHistory.length);
              const bestScore = Math.max(...sortedHistory.map(i => i.score));
              const recentTrend = sortedHistory.length >= 2
                ? sortedHistory[0].score - sortedHistory[1].score
                : 0;

              return (
                <>
                  {/* Summary Stats */}
                  <div className="history-stats">
                    <div className="history-stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-info">
                        <div className="stat-value">{avgScore}/100</div>
                        <div className="stat-label">Average Score</div>
                      </div>
                    </div>
                    <div className="history-stat-card">
                      <div className="stat-icon">🏆</div>
                      <div className="stat-info">
                        <div className="stat-value">{bestScore}/100</div>
                        <div className="stat-label">Best Score</div>
                      </div>
                    </div>
                    <div className="history-stat-card">
                      <div className="stat-icon">📈</div>
                      <div className="stat-info">
                        <div className="stat-value" style={{ color: recentTrend >= 0 ? '#10b981' : '#ef4444' }}>
                          {recentTrend >= 0 ? '+' : ''}{recentTrend}
                        </div>
                        <div className="stat-label">Recent Trend</div>
                      </div>
                    </div>
                    <div className="history-stat-card">
                      <div className="stat-icon">🎯</div>
                      <div className="stat-info">
                        <div className="stat-value">{sortedHistory.length}</div>
                        <div className="stat-label">Total Interviews</div>
                      </div>
                    </div>
                  </div>

                  {/* Score Trend Chart */}
                  <div className="history-chart-section">
                    <h3>Score Trend Over Time</h3>
                    <p className="chart-subtitle">Track your improvement across interviews</p>
                    <div className="history-chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorScoreHistory" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="date"
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value) => [`${value}/100`, 'Score']}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#4F46E5"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorScoreHistory)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Interview History Table */}
                  <div className="history-table-section">
                    <h3>Interview History</h3>
                    <div className="history-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Questions</th>
                            <th>Score</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedHistory.map((interview, idx) => (
                            <tr key={idx}>
                              <td>{new Date(interview.date).toLocaleDateString()}</td>
                              <td>{interview.type}</td>
                              <td>{interview.questionCount}</td>
                              <td>
                                <span className={`score-badge ${interview.score >= 70 ? 'good' : 'needs-work'}`}>
                                  {interview.score}/100
                                </span>
                              </td>
                              <td>{interview.durationFormatted || `${Math.floor(interview.duration / 60)}m`}</td>
                              <td>
                                <span className={`status-badge ${interview.status}`}>
                                  {interview.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn-view-report"
                                  onClick={() => {
                                    navigate('/results', {
                                      state: {
                                        filters: interview.filters,
                                        questions: interview.questions,
                                        submissions: interview.submissions,
                                        timeSpent: interview.duration
                                      }
                                    });
                                  }}
                                >
                                  View Report
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
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
