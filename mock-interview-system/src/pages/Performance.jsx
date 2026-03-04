import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useUser } from '@clerk/clerk-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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

        {/* Score Trend Chart */}
        {interviewHistory.length > 0 && (
          <div className="chart-section">
            <h2>Score Trend Over Time</h2>
            <p className="chart-subtitle">Track your improvement across interviews</p>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={interviewHistory.slice().reverse().map((interview, idx) => ({
                    name: `Interview ${idx + 1}`,
                    date: new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    score: interview.score,
                    fullDate: interview.date
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#colorScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
