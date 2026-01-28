import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* StrataScratch Header */}
      <header className="strata-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo">stratascratch</span>
            <nav className="main-nav">
              <a href="#coding">Coding Questions</a>
              <a href="#non-coding">Non-coding Questions</a>
              <a href="#projects">Data Projects</a>
              <a href="#tools">Tools β</a>
              <a href="#guides">Guides</a>
              <a href="#blog">Blog</a>
              <a href="#pricing">Pricing</a>
            </nav>
          </div>
          <div className="header-actions">
            <button className="search-btn">🔍 Search ⌘K</button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-content">
          <div className="trust-badge">
            🌟 Trusted by 500,000+ members worldwide
          </div>

          <h1 className="hero-title">
            Master Data Skills<br />
            <span className="hero-subtitle">Through Practice</span>
          </h1>

          <p className="hero-description">
            Practice real interview questions, build portfolio projects, and validate your<br />
            code — everything you need to land your dream data role.
          </p>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">1,000+</div>
              <div className="stat-label">Questions</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100+</div>
              <div className="stat-label">Free</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500K+</div>
              <div className="stat-label">Members</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">200+</div>
              <div className="stat-label">Companies</div>
            </div>
          </div>

          <div className="cta-buttons">
            <button
              className="cta-primary"
              onClick={() => navigate('/interview-setup')}
            >
              🎯 Ace Interview Questions →
            </button>
            <button className="cta-secondary">
              📊 Build Portfolio →
            </button>
            <button className="cta-tertiary">
              🔮 Try AI StrataTools →
            </button>
          </div>

          <div className="company-logos">
            <p className="companies-title">INTERVIEW SUCCESS STORIES FROM</p>
            <div className="logos-row">
              <span className="company-logo">facebook</span>
              <span className="company-logo">Google</span>
              <span className="company-logo">airbnb</span>
              <span className="company-logo">twitch</span>
              <span className="company-logo">Postmates</span>
              <span className="company-logo">stripe</span>
              <span className="company-logo">amazon</span>
              <span className="company-logo">Microsoft</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
