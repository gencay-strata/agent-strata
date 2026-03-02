import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useUser } from '@clerk/clerk-react';
import '../styles/Performance.css';

function Performance() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [interviewHistory, setInterviewHistory] = useState([]);

  useEffect(() => {
    // Load interview history from localStorage
    const loadHistory = () => {
      try {
        const history = localStorage.getItem('interview_history');
        if (history) {
          const parsed = JSON.parse(history);
          setInterviewHistory(parsed.reverse()); // Most recent first
        }
      } catch (error) {
        console.error('Failed to load interview history:', error);
      }
    };

    loadHistory();
  }, []);

  // Calculate summary stats
  const totalInterviews = interviewHistory.length;
  const avgScore = totalInterviews > 0
    ? Math.round(interviewHistory.reduce((sum, i) => sum + i.score, 0) / totalInterviews)
    : 0;
  const bestScore = totalInterviews > 0
    ? Math.max(...interviewHistory.map(i => i.score))
    : 0;
  const completionRate = totalInterviews > 0
    ? Math.round((interviewHistory.filter(i => i.status === 'completed').length / totalInterviews) * 100)
    : 0;

  const handleViewReport = (interview) => {
    // Navigate to results page with interview data
    navigate('/results', {
      state: {
        filters: interview.filters,
        questions: interview.questions,
        submissions: interview.submissions,
        timeSpent: interview.duration
      }
    });
  };

  const handleDeleteInterview = (interviewId) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) return;

    try {
      const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
      const updatedHistory = history.filter(i => i.id !== interviewId);
      localStorage.setItem('interview_history', JSON.stringify(updatedHistory));
      setInterviewHistory(updatedHistory.reverse());
      console.log('🗑️ Interview deleted');
    } catch (error) {
      console.error('Failed to delete interview:', error);
    }
  };

  return (
    <div className="performance-container">
      {/* Header */}
      <div className="performance-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <span className="logo" onClick={() => navigate('/')}>stratascratch</span>
            <nav className="nav-links">
              <span onClick={() => navigate('/')}>Home</span>
              <span>Coding Questions</span>
              <span>Data Projects</span>
              <span>Tools</span>
            </nav>
          </div>
          <div className="navbar-right">
            <UserButton>
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

      <div className="performance-content">
        {/* Page Header */}
        <div className="performance-header">
          <h1>Interview Performance</h1>
          <p>Track your progress over time</p>
        </div>

        {/* Summary Stats */}
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{totalInterviews}</div>
            <div className="stat-label">Total Interviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{avgScore}/100</div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{bestScore}/100</div>
            <div className="stat-label">Best Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        {/* Interview History Table */}
        <div className="history-section">
          <h2>Interview History</h2>
          {interviewHistory.length === 0 ? (
            <div className="empty-state">
              <p>No interviews yet. Start your first mock interview!</p>
              <button className="btn-primary" onClick={() => navigate('/interview-setup')}>
                Start Interview
              </button>
            </div>
          ) : (
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
                  {interviewHistory.map((interview, idx) => (
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
                        <div className="action-buttons">
                          <button
                            className="btn-view-report"
                            onClick={() => handleViewReport(interview)}
                          >
                            View Report
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteInterview(interview.id)}
                            title="Delete interview"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Performance;
