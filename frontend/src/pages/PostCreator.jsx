import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';

function PostCreator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [postTopic, setPostTopic] = useState('');
  const [postContent, setPostContent] = useState('');
  const [platform, setPlatform] = useState('Twitter');
  const [scheduleTime, setScheduleTime] = useState('');
  const [preview, setPreview] = useState('Your post preview appears here...');

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      setIsLoginModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (postContent) {
      setPreview(postContent);
    }
  }, [postContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    showNotification('Post created successfully!', 'success');
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      notification.addEventListener('transitionend', () => {
        notification.remove();
      });
    }, 3000);
  };

  return (
    <>
      <Navbar />
      
      <section className={`agent-hero ${!isLoggedIn ? 'blur' : ''}`} id="agentContent">
        <div className="hero-content">
          <div className="hero-badge">
            <i className="fas fa-feather-alt"></i> AI-Powered Social Media
          </div>
          <h1 className="hero-title">Post Creator</h1>
          <p className="hero-subtitle">
            Craft viral social media posts with AI-driven content and hashtag optimization.
          </p>
        </div>
      </section>

      <section className={`agent-page quantum-postmaster ${!isLoggedIn ? 'blur' : ''}`} id="configure">
        <h2 className="holo-title">Create Your Post</h2>
        <p className="agent-description">
          Craft engaging social media content with AI suggestions. Optimize for platforms, add hashtags, and schedule posts for maximum reach.
        </p>

        <div className="agent-config-grid">
          <div className="agent-form-container">
            <form className="holo-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">
                  Post Topic <i className="fas fa-info-circle tooltip" title="Describe the post's main idea"></i>
                </label>
                <input
                  type="text"
                  placeholder="Enter post topic"
                  className="holo-input"
                  value={postTopic}
                  onChange={(e) => setPostTopic(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">
                  Post Content <i className="fas fa-info-circle tooltip" title="Write your post or let AI enhance it"></i>
                </label>
                <textarea
                  placeholder="Your post content..."
                  className="holo-textarea"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="input-group">
                <label className="input-label">
                  Platform <i className="fas fa-info-circle tooltip" title="Select target platform"></i>
                </label>
                <select className="holo-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option>Twitter</option>
                  <option>LinkedIn</option>
                  <option>Instagram</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">
                  Schedule Post Time <i className="fas fa-info-circle tooltip" title="Choose when to post"></i>
                </label>
                <input
                  type="datetime-local"
                  className="holo-input"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              <button type="submit" className="holo-btn generate-btn">Create Post</button>
            </form>
          </div>

          <div className="preview-panel">
            <h3>Post Preview</h3>
            <div className="preview-content" style={{ textAlign: 'left', padding: '20px' }}>
              {preview}
            </div>
          </div>
        </div>

        <section className="agent-features">
          <h3 className="feature-title">Key Features</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-feather-alt"></i></div>
              <h4>AI Content Suggestions</h4>
              <p>Generate engaging post ideas with AI.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-hashtag"></i></div>
              <h4>Hashtag Optimization</h4>
              <p>Boost reach with AI-recommended hashtags.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-clock"></i></div>
              <h4>Smart Scheduling</h4>
              <p>Post at optimal times for max engagement.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
              <h4>Performance Tracking</h4>
              <p>Monitor post engagement in real-time.</p>
            </div>
          </div>
        </section>

        <Link to="/" className="back-btn">
          <i className="fas fa-arrow-left"></i> Back to Home
        </Link>
      </section>

      {!isLoggedIn && (
        <div className="login-overlay" style={{ display: 'flex' }}>
          <div>
            <i className="fas fa-lock"></i>
            <p>Please <strong>log in</strong> to access Post Creator</p>
            <button className="login-overlay-btn" onClick={() => setIsLoginModalOpen(true)}>
              Log In
            </button>
          </div>
        </div>
      )}

      <Footer />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => setIsLoggedIn(true)}
      />
    </>
  );
}

export default PostCreator;
