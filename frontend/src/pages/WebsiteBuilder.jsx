import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import axios from 'axios';

function WebsiteBuilder() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [theme, setTheme] = useState('Sci-Fi Dark');
  const [preview, setPreview] = useState('');
  const [generatedCode, setGeneratedCode] = useState({ 'index.html': '', 'style.css': '', 'script.js': '' });
  const [activeTab, setActiveTab] = useState('index.html');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const abortControllerRef = useRef(null);

  // Two separate iframe refs
  const previewIframeRef = useRef(null);
  const fullscreenIframeRef = useRef(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      setIsLoginModalOpen(true);
    }
  }, []);

  // Handle iframe load to intercept navigation
  const handleIframeLoad = (iframeRef) => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      try {
        const iframeDoc = iframeRef.current.contentDocument;
        const iframeWindow = iframeRef.current.contentWindow;

        // Intercept all link clicks
        iframeDoc.addEventListener('click', (e) => {
          const target = e.target.closest('a, button');
          if (target && target.tagName === 'A') {
            const href = target.getAttribute('href');
            if (href && !href.startsWith('#')) {
              e.preventDefault();
              e.stopPropagation();
              showPopup('Links are disabled in preview. Download the code to deploy your website.', 'info');
            }
          }
        }, true);

        // Intercept form submissions
        const forms = iframeDoc.querySelectorAll('form');
        forms.forEach((form) => {
          form.addEventListener('submit', (e) => {
            const action = form.getAttribute('action');
            if (action && !action.startsWith('#') && !action.includes('javascript:')) {
              e.preventDefault();
              e.stopPropagation();
              showPopup('Form submissions are disabled in preview.', 'info');
            }
          }, true);
        });

        // Override navigation methods
        const handler = {
          set(target, prop, value) {
            if (prop === 'href' || prop === 'pathname') {
              console.log('Navigation attempt blocked:', value);
              return true;
            }
            target[prop] = value;
            return true;
          }
        };
        iframeWindow.location = new Proxy(iframeWindow.location, handler);

      } catch (error) {
        console.log('Iframe sandbox prevents full manipulation (expected for security)');
      }
    }
  };

  // Generate Blob URL for preview iframe
  useEffect(() => {
    if (preview && !isFullscreen && previewIframeRef.current) {
      const blob = new Blob([preview], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      previewIframeRef.current.src = blobUrl;

      // Cleanup on unmount or update
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }
  }, [preview, isFullscreen]);

  // Generate Blob URL for fullscreen iframe
  useEffect(() => {
    if (preview && isFullscreen && fullscreenIframeRef.current) {
      const blob = new Blob([preview], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      fullscreenIframeRef.current.src = blobUrl;

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }
  }, [preview, isFullscreen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    const prompt = `Create a ${theme} theme website titled "${websiteTitle}" with the following description: ${websiteDescription}`;

    try {
      const response = await axios.post('http://localhost:5000/generate',
        { prompt },
        { signal: abortControllerRef.current.signal }
      );
      const files = response.data.files;

      setGeneratedCode(files);

      const processedHtml = processGeneratedHtml(files['index.html'] || '<h1>No HTML generated</h1>');

      const fullHtml = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${files['style.css'] || ''}
    a[href^="http"], a[href^="https"], a[href^="/"] {
      pointer-events: none;
      opacity: 0.6;
      cursor: not-allowed;
    }
    a[href^="#"] {
      pointer-events: auto;
      opacity: 1;
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${processedHtml}
  <script>
    (function() {
      'use strict';
      document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
          const href = e.target.getAttribute('href');
          if (href && !href.startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      }, true);

      document.addEventListener('submit', function(e) {
        const form = e.target;
        const action = form.getAttribute('action');
        if (action && action.trim() !== '' && !action.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }, true);

      window.open = function() { return null; };
      const originalAssign = window.location.assign;
      const originalReplace = window.location.replace;
      window.location.assign = function() {};
      window.location.replace = function() {};
      Object.defineProperty(Location.prototype, 'href', {
        set: function() {},
        get: function() { return window.location.href; }
      });
    })();
  </script>
  <script>${files['script.js'] || ''}</script>
</body>
</html>`;

      setPreview(fullHtml);
      setShowCodePanel(true);
      showPopup('Website created successfully!', 'success');
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        showPopup('Website generation has been terminated.', 'warning');
      } else {
        console.error(error);
        showNotification('Error generating website. Make sure backend is running.', 'error');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleTerminate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const processGeneratedHtml = (html) => {
    let processed = html;
    processed = processed.replace(/href="\/(?!\/)/g, 'href="#');
    processed = processed.replace(/href="(?!#|http|javascript)/g, 'href="#');
    return processed;
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    popup.className = `center-popup ${type}`;
    popup.innerHTML = `
      <div class="popup-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 3000);
  };

  const downloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedCode['index.html']], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = 'index.html';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification('Code downloaded!', 'success');
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
  };

  const themes = [
    { value: 'Sci-Fi Dark', icon: 'fa-rocket', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { value: 'Minimalist', icon: 'fa-layer-group', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { value: 'Corporate', icon: 'fa-building', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
  ];

  return (
    <>
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />

      <section className={`agent-hero website-builder-hero ${!isLoggedIn ? 'blur' : ''}`}>
        <div className="floating-shapes">
          <div className="floating-shape"></div>
          <div className="floating-shape"></div>
          <div className="floating-shape"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge-animated">
            <span className="badge-glow"></span>
            <i className="fas fa-globe"></i>
            <span>AI-Powered Web Creation</span>
          </div>
          <h1 className="hero-title-enhanced">
            <span className="gradient-text-animated">Website Builder</span>
          </h1>
          <p className="hero-subtitle-enhanced">
            Generate stunning, responsive websites with AI-driven design.<br />
            No coding required—just describe your vision and watch it come to life.
          </p>
        </div>
      </section>

      <section className={`agent-page website-builder-page ${!isLoggedIn ? 'blur' : ''}`} id="configure">
        <div className="builder-container">
          <div className="section-header-builder">
            <span className="section-badge-builder">
              <i className="fas fa-wand-magic-sparkles"></i> AI Generator
            </span>
            <h2 className="section-title-builder">Build Your Dream Website</h2>
            <p className="section-subtitle-builder">
              Describe your vision and watch AI create a beautiful website in seconds
            </p>
          </div>

          <div className="builder-grid">
            {/* Left Panel - Configuration */}
            <div className="config-panel">
              <div className="panel-header-enhanced">
                <div className="header-icon-wrapper">
                  <i className="fas fa-sliders-h"></i>
                </div>
                <div className="header-text">
                  <h3>Configuration</h3>
                  <p>Customize your website details</p>
                </div>
              </div>

              <form className="builder-form" onSubmit={handleSubmit}>
                <div className="form-group-enhanced">
                  <label className="label-enhanced">
                    <i className="fas fa-heading"></i>
                    <span>Website Title</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., My Awesome Portfolio"
                    className="input-enhanced"
                    value={websiteTitle}
                    onChange={(e) => setWebsiteTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-enhanced">
                  <label className="label-enhanced">
                    <i className="fas fa-align-left"></i>
                    <span>Description</span>
                  </label>
                  <textarea
                    placeholder="Describe your website purpose, content, and features..."
                    className="textarea-enhanced"
                    value={websiteDescription}
                    onChange={(e) => setWebsiteDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group-enhanced">
                  <label className="label-enhanced">
                    <i className="fas fa-palette"></i>
                    <span>Choose Theme</span>
                  </label>
                  <div className="theme-selector">
                    {themes.map((themeOption) => (
                      <div
                        key={themeOption.value}
                        className={`theme-card ${theme === themeOption.value ? 'active' : ''}`}
                        onClick={() => setTheme(themeOption.value)}
                      >
                        <div className="theme-icon" style={{ background: themeOption.color }}>
                          <i className={`fas ${themeOption.icon}`}></i>
                        </div>
                        <span className="theme-name">{themeOption.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="generate-btn-enhanced" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Generating Magic...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic"></i>
                        <span>Generate Website</span>
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <button
                      type="button"
                      className="terminate-btn"
                      onClick={handleTerminate}
                    >
                      <i className="fas fa-times-circle"></i>
                      <span>Terminate Generation</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Panel - Preview */}
            <div className="preview-panel-enhanced">
              <div className="panel-header-enhanced">
                <div className="header-icon-wrapper">
                  <i className="fas fa-eye"></i>
                </div>
                <div className="header-text">
                  <h3>Live Preview</h3>
                  <p>See your website come to life</p>
                </div>
                {preview && (
                  <button className="fullscreen-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                    <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
                  </button>
                )}
              </div>

              <div className="preview-container">
                {preview ? (
                  <iframe
                    ref={previewIframeRef}
                    className="preview-iframe"
                    title="Website Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={() => handleIframeLoad(previewIframeRef)}
                  />
                ) : (
                  <div className="preview-placeholder-enhanced">
                    <div className="placeholder-icon">
                      <i className="fas fa-desktop"></i>
                    </div>
                    <h3>Preview Area</h3>
                    <p>Your generated website will appear here</p>
                    <div className="placeholder-features">
                      <span><i className="fas fa-check"></i> Responsive Design</span>
                      <span><i className="fas fa-check"></i> Modern UI</span>
                      <span><i className="fas fa-check"></i> Fast Loading</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Panel */}
          {showCodePanel && (
            <div className="code-panel-enhanced">
              <div className="code-header">
                <div className="code-header-left">
                  <i className="fas fa-code"></i>
                  <span>Generated Code</span>
                </div>
                <button className="download-btn-enhanced" onClick={downloadCode}>
                  <i className="fas fa-download"></i>
                  <span>Download</span>
                </button>
              </div>

              <div className="code-tabs-enhanced">
                {Object.keys(generatedCode).map((tab) => (
                  <button
                    key={tab}
                    className={`code-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <i className={`fab fa-${tab === 'index.html' ? 'html5' : tab === 'style.css' ? 'css3-alt' : 'js-square'}`}></i>
                    <span>{tab === 'index.html' ? 'HTML' : tab === 'style.css' ? 'CSS' : 'JavaScript'}</span>
                  </button>
                ))}
              </div>

              <div className="code-viewer">
                <pre><code>{generatedCode[activeTab] || '// No code generated yet'}</code></pre>
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="builder-features">
            <h3 className="features-title">
              <i className="fas fa-star"></i> Key Features
            </h3>
            <div className="features-grid-builder">
              <div className="feature-item-builder">
                <div className="feature-icon-builder" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <h4>Fully Responsive</h4>
                <p>Works perfectly on all devices</p>
              </div>
              <div className="feature-item-builder">
                <div className="feature-icon-builder" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <i className="fas fa-robot"></i>
                </div>
                <h4>AI-Powered</h4>
                <p>Smart content generation</p>
              </div>
              <div className="feature-item-builder">
                <div className="feature-icon-builder" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <i className="fas fa-rocket"></i>
                </div>
                <h4>Quick Deploy</h4>
                <p>Launch in seconds</p>
              </div>
              <div className="feature-item-builder">
                <div className="feature-icon-builder" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  <i className="fas fa-search"></i>
                </div>
                <h4>SEO Optimized</h4>
                <p>Built-in SEO best practices</p>
              </div>
            </div>
          </div>

          <Link to="/" className="back-btn-enhanced">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </Link>
        </div>
      </section>

      {/* Fullscreen Preview Modal */}
      {isFullscreen && (
        <div className="fullscreen-modal">
          <div className="fullscreen-header" style={{ zIndex: 9999 }}>
            <div className="fullscreen-title">
              <i className="fas fa-desktop"></i>
              <span>Fullscreen Preview</span>
            </div>
            <button
              className="fullscreen-close"
              onClick={toggleFullscreen}
              style={{ position: 'relative', zIndex: 10000 }}
            >
              <i className="fas fa-times"></i>
              <span>Exit Fullscreen</span>
            </button>
          </div>
          <div className="fullscreen-content">
            <iframe
              ref={fullscreenIframeRef}
              className="fullscreen-iframe"
              title="Fullscreen Website Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
              onLoad={() => handleIframeLoad(fullscreenIframeRef)}
            />
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <div className="login-overlay" style={{ display: 'flex' }}>
          <div className="login-overlay-content">
            <div className="lock-icon-wrapper">
              <i className="fas fa-lock"></i>
            </div>
            <h3>Authentication Required</h3>
            <p>Please log in to access Website Builder</p>
            <button className="login-overlay-btn" onClick={() => setIsLoginModalOpen(true)}>
              <i className="fas fa-sign-in-alt"></i>
              <span>Log In to Continue</span>
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

export default WebsiteBuilder;