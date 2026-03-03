import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

import '../assets/css/PostCreator.css'; // Import the newly created CSS

function PostCreator({ initialData }) {
  const context = useOutletContext();
  const { isLoggedIn, setIsLoginModalOpen } = context || {};

  // Inputs
  const [theme, setTheme] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    twitter: true,
    instagram: true
  });

  // Generated Content
  const [generatedContent, setGeneratedContent] = useState(null); // { captions: {...}, image_prompt: str }
  const [generatedImage, setGeneratedImage] = useState(null); // base64
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Editable Captions
  const [captions, setCaptions] = useState({
    twitter: '',
    instagram: ''
  });

  // Credentials
  const [showCredentials, setShowCredentials] = useState(false);
  const [twApiKey, setTwApiKey] = useState('');
  const [twApiSecret, setTwApiSecret] = useState('');
  const [twAccessToken, setTwAccessToken] = useState('');
  const [twAccessSecret, setTwAccessSecret] = useState('');
  const [igUsername, setIgUsername] = useState('agentify_mp');
  const [igPassword, setIgPassword] = useState('');

  useEffect(() => {
    if (!isLoggedIn && setIsLoginModalOpen) {
      setIsLoginModalOpen(true);
    }
  }, [isLoggedIn, setIsLoginModalOpen]);

  const handlePlatformChange = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const API_BASE = "http://localhost:5000";

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!theme || !topic || !description) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    const platforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
    if (platforms.length === 0) {
      showNotification('Select at least one platform', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setGeneratedImage(null);

    try {
      // 1. Generate Text
      const res = await fetch(`${API_BASE}/social/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, topic, description, platforms })
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.detail || 'Generation failed');

      setGeneratedContent(data.content);
      setCaptions(data.content.captions);

      // 2. Generate Image (if prompt exists and instagram is selected)
      if (data.content.image_prompt && selectedPlatforms.instagram) {
        showNotification('Generating visual assets...', 'info');
        const imgRes = await fetch(`${API_BASE}/social/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: data.content.image_prompt })
        });
        const imgData = await imgRes.json();
        if (imgData.success) {
          setGeneratedImage(`data:image/png;base64,${imgData.image_base64}`);
        } else {
          showNotification(`Image Gen Failed: ${imgData.detail}`, 'error');
        }
      }

      showNotification('Content generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    const platforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);

    setIsPosting(true);
    try {
      // The backend expects specific captions for specific platforms now
      // We send one request per platform or a unified one if backend supports it.
      // Based on my updated main.py, it handles multiple platforms but one caption?
      // Wait, let me check main.py again. 
      // In my updated main.py: request.caption is used for all platforms.
      // If we want different captions, we should send separate requests.

      for (const platform of platforms) {
        const caption = captions[platform] || (generatedContent && generatedContent.captions[platform]);
        const body = {
          caption: caption,
          platforms: [platform],
          image_base64: generatedImage ? generatedImage : null,
          tw_api_key: twApiKey,
          tw_api_secret: twApiSecret,
          tw_access_token: twAccessToken,
          tw_access_secret: twAccessSecret,
          ig_username: igUsername,
          ig_password: igPassword
        };

        const res = await fetch(`${API_BASE}/social/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success && data.results && data.results[0].result.success) {
          showNotification(`Posted to ${platform} successfully!`, 'success');
        } else {
          const errMsg = data.results ? data.results[0].result.error : data.detail;
          showNotification(`Failed to post to ${platform}: ${errMsg}`, 'error');
        }
      }
    } catch (err) {
      showNotification(`Posting error: ${err.message}`, 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    // Using the improved toast notification system if available, 
    // otherwise fallback to the local one defined here.
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      const existing = document.querySelectorAll('.notification:not(.fade-out)');
      const stackIndex = existing.length;
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.style.top = `calc(1.5rem + ${stackIndex * 70}px)`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('fade-out');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
      }, 3500);
    }
  };

  return (
    <>

      <section className={`modern-hero social-hero ${!isLoggedIn ? 'blur' : ''}`} id="agentContent">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-tag">
              <i className="fas fa-share-alt"></i>
              <span>Social Media</span>
            </div>
            <h1 className="hero-heading">
              Create Viral
              <span className="gradient-text"> Social Content</span>
            </h1>
            <p className="hero-description">
              AI-generated captions, stunning visuals, and multi-platform posting. Turn ideas into engagement in seconds.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">2</div>
                <div className="stat-label">Platforms</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">1</div>
                <div className="stat-label">Click</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">∞</div>
                <div className="stat-label">Reach</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-visual">
              <div className="visual-icon">
                <i className="fas fa-hashtag"></i>
              </div>
              <div className="visual-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`agent-page quantum-postmaster ${!isLoggedIn ? 'blur' : ''}`} id="configure">
        <div className="agent-config-grid">

          {/* LEFT COLUMN: INPUTS */}
          <div className="agent-form-container">
            <h2 className="holo-title">Campaign Details</h2>
            <form className="holo-form" onSubmit={handleGenerate}>
              <div className="input-group">
                <label className="input-label">Theme</label>
                <input
                  type="text"
                  placeholder="e.g., Sustainable Fashion"
                  className="holo-input"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Topic</label>
                <input
                  type="text"
                  placeholder="e.g., Summer Collection Launch"
                  className="holo-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  placeholder="Describe key points, tone, goals..."
                  className="holo-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="input-group">
                <label className="input-label">Select Platforms</label>
                <div className="platform-selector">
                  <label className={`platform-card ${selectedPlatforms.twitter ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.twitter}
                      onChange={() => handlePlatformChange('twitter')}
                    />
                    <i className="fab fa-twitter"></i>
                    <span>Twitter</span>
                  </label>
                  <label className={`platform-card ${selectedPlatforms.instagram ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.instagram}
                      onChange={() => handlePlatformChange('instagram')}
                    />
                    <i className="fab fa-instagram"></i>
                    <span>Instagram</span>
                  </label>
                </div>
              </div>

              {/* CREDENTIALS SECTION */}
              <div className="credentials-section">
                <div
                  className="expander-header"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  <div className="header-left">
                    <i className="fas fa-key"></i>
                    <span>Platform Credentials</span>
                  </div>
                  <i className={`fas fa-chevron-${showCredentials ? 'up' : 'down'}`}></i>
                </div>

                {showCredentials && (
                  <div className="expander-content">
                    <div className="cred-group">
                      <p className="cred-title">Twitter / X</p>
                      <input
                        type="password"
                        placeholder="API Key"
                        className="holo-input small"
                        value={twApiKey}
                        onChange={(e) => setTwApiKey(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="API Secret"
                        className="holo-input small"
                        value={twApiSecret}
                        onChange={(e) => setTwApiSecret(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Access Token"
                        className="holo-input small"
                        value={twAccessToken}
                        onChange={(e) => setTwAccessToken(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Access Secret"
                        className="holo-input small"
                        value={twAccessSecret}
                        onChange={(e) => setTwAccessSecret(e.target.value)}
                      />
                    </div>

                    <div className="cred-group" style={{ marginTop: '15px' }}>
                      <p className="cred-title">Instagram</p>
                      <input
                        type="text"
                        placeholder="Username"
                        className="holo-input small"
                        value={igUsername}
                        onChange={(e) => setIgUsername(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        className="holo-input small"
                        value={igPassword}
                        onChange={(e) => setIgPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="holo-btn generate-btn" disabled={isGenerating}>
                {isGenerating ? 'Generating...' : '✨ Generate Content'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: PREVIEW */}
          <div className="preview-panel">
            <h3>Content Preview</h3>

            {!generatedContent && !isGenerating && (
              <div className="preview-content" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <i className="fas fa-magic" style={{ fontSize: '2em', marginBottom: '10px' }}></i>
                <p>Generated content will appear here</p>
              </div>
            )}

            {isGenerating && (
              <div className="preview-content" style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loader"></div>
                <p>Brainstorming captions & designing visuals...</p>
              </div>
            )}

            {generatedContent && (
              <div className="preview-content" style={{ textAlign: 'left', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* IMAGE PREVIEW */}
                {generatedImage ? (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={generatedImage} alt="AI Generated" style={{ width: '100%', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', textAlign: 'center' }}>
                    {generatedContent.image_prompt ? "Generating Image..." : "No image prompt generated"}
                  </div>
                )}

                {/* CAPTIONS */}
                {Object.keys(selectedPlatforms).map(platform => {
                  if (!selectedPlatforms[platform]) return null;
                  return (
                    <div key={platform}>
                      <label className="input-label" style={{ textTransform: 'capitalize' }}>{platform}</label>
                      <textarea
                        className="holo-textarea"
                        value={captions[platform]}
                        onChange={(e) => setCaptions({ ...captions, [platform]: e.target.value })}
                        rows="4"
                      ></textarea>
                    </div>
                  );
                })}

                <button className="holo-btn" onClick={handlePost} disabled={isPosting} style={{ marginTop: '10px' }}>
                  {isPosting ? 'Posting...' : '🚀 Approve & Post'}
                </button>

              </div>
            )}

          </div>
        </div>

      </section>
      <div className="back-nav" style={{ marginTop: '40px' }}>
        <Link to="/" className="back-link">
          <i className="fas fa-arrow-left"></i> Back to Home
        </Link>
      </div>
    </>
  );
}

export default PostCreator;
