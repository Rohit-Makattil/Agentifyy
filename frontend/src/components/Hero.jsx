function Hero({ onLoginClick }) {
  return (
    <section className="hero" id="home">
      <div className="hero-content-wrapper">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-icon">
                <i className="fas fa-robot"></i>
              </span>
              <span className="badge-text">AI-Powered Control Deck</span>
            </div>
            <h1 className="hero-title">
              Launch Your AI Agent <br />
              <span className="gradient-text">in Minutes</span>
            </h1>
            <p className="hero-subtitle">
              Describe your mission. Watch our AI break it down, plan, and execute—no code needed.
            </p>
            <div className="hero-actions">
              <button className="hero-cta primary" onClick={onLoginClick}>
                <span>Start Creating</span>
                <i className="fas fa-arrow-right"></i>
              </button>
              <a href="#demo" className="hero-cta secondary">
                <i className="fas fa-play"></i>
                <span>Watch Demo</span>
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card card-1">
              <i className="fas fa-envelope"></i>
              <span>Mail Automation</span>
            </div>
            <div className="floating-card card-2">
              <i className="fas fa-globe"></i>
              <span>Website Builder</span>
            </div>
            <div className="floating-card card-3">
              <i className="fas fa-pen"></i>
              <span>Post Creator</span>
            </div>
            <div className="hero-circle"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
