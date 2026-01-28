import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Code, Briefcase, Target, ChevronDown } from 'lucide-react';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [filters, setFilters] = useState({
    language: 'SQL',
    jobPosition: 'Data Analyst',
    skillLevel: 'Medium',
    company: '',
    interviewType: 'Technical',
    duration: 60,
    questionCount: 2
  });

  const filterOptions = {
    language: ['SQL', 'Python', 'R'],
    jobPosition: ['Data Analyst', 'Data Scientist', 'Data Engineer', 'ML Engineer', 'Business Analyst'],
    skillLevel: ['Easy', 'Medium', 'Hard'],
    company: ['', 'Meta', 'Google', 'Amazon', 'Microsoft', 'Netflix', 'Apple', 'Uber', 'Airbnb'],
    interviewType: ['Technical', 'Behavioral', 'Case Study', 'Mixed'],
    duration: [30, 45, 60, 90, 120],
    questionCount: [1, 2, 3, 4, 5]
  };

  const handleQuickStart = () => {
    const defaultFilters = {
      language: 'SQL',
      jobPosition: 'Data Analyst',
      skillLevel: 'Medium',
      company: '',
      interviewType: 'Technical',
      duration: 60,
      questionCount: 2
    };
    navigate('/interview', { state: { filters: defaultFilters } });
  };

  const handleCustomStart = () => {
    navigate('/interview', { state: { filters } });
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1>StrataScratch Mock Interview</h1>
        <p className="subtitle">Practice data science interviews with AI-powered feedback</p>
      </header>

      <div className="content-wrapper">
        {/* Quick Start Section */}
        <section className="quick-start-section">
          <div className="section-header">
            <Target size={24} />
            <h2>Quick Start</h2>
          </div>
          <p className="section-description">
            Start immediately with our recommended settings for most candidates
          </p>
          <div className="quick-start-card">
            <div className="quick-settings">
              <div className="setting-item">
                <Code size={18} />
                <span>SQL Questions</span>
              </div>
              <div className="setting-item">
                <Briefcase size={18} />
                <span>Data Analyst Level</span>
              </div>
              <div className="setting-item">
                <Target size={18} />
                <span>Medium Difficulty</span>
              </div>
              <div className="setting-item">
                <Clock size={18} />
                <span>60 Minutes • 2 Questions</span>
              </div>
            </div>
            <button className="btn-primary" onClick={handleQuickStart}>
              Start Interview Now
            </button>
          </div>
        </section>

        {/* Advanced Filters Section */}
        <section className="advanced-section">
          <button
            className="section-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h2>Advanced Filters</h2>
            <ChevronDown
              size={24}
              className={`chevron ${showAdvanced ? 'rotated' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="filters-container">
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Language</label>
                  <select
                    value={filters.language}
                    onChange={(e) => updateFilter('language', e.target.value)}
                  >
                    {filterOptions.language.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Job Position</label>
                  <select
                    value={filters.jobPosition}
                    onChange={(e) => updateFilter('jobPosition', e.target.value)}
                  >
                    {filterOptions.jobPosition.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Skill Level</label>
                  <select
                    value={filters.skillLevel}
                    onChange={(e) => updateFilter('skillLevel', e.target.value)}
                  >
                    {filterOptions.skillLevel.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Company (Optional)</label>
                  <select
                    value={filters.company}
                    onChange={(e) => updateFilter('company', e.target.value)}
                  >
                    {filterOptions.company.map(comp => (
                      <option key={comp} value={comp}>
                        {comp || 'Any Company'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Interview Type</label>
                  <select
                    value={filters.interviewType}
                    onChange={(e) => updateFilter('interviewType', e.target.value)}
                  >
                    {filterOptions.interviewType.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Duration (minutes)</label>
                  <select
                    value={filters.duration}
                    onChange={(e) => updateFilter('duration', parseInt(e.target.value))}
                  >
                    {filterOptions.duration.map(dur => (
                      <option key={dur} value={dur}>{dur} min</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Number of Questions</label>
                  <select
                    value={filters.questionCount}
                    onChange={(e) => updateFilter('questionCount', parseInt(e.target.value))}
                  >
                    {filterOptions.questionCount.map(count => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="btn-secondary" onClick={handleCustomStart}>
                Start Custom Interview
              </button>
            </div>
          )}
        </section>

        {/* Features Section */}
        <section className="features-section">
          <h2>What You'll Get</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Real Interview Questions</h3>
              <p>Practice with actual questions from top tech companies</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h3>Timed Sessions</h3>
              <p>Simulate real interview pressure with countdown timers</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI Feedback</h3>
              <p>Get detailed analysis and improvement suggestions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>Monitor your improvement over time</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
