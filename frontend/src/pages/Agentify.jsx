import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Zap,
  Target,
  Rocket,
  Mail,
  Globe,
  Share2,
  ArrowRight,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Import Agent components for in-page loading
import MailAutomation from './MailAutomation';
import WebsiteBuilder from './WebsiteBuilder';
import PostCreator from './PostCreator';
import LeadFinder from './LeadFinder';

import { unifiedAgentService } from '../services/unifiedAgentService';

// Simple Result Card Component
const AgentResultCard = ({ title, icon, status, result, onView, renderPreview }) => {
  return (
    <div style={{
      background: status === 'completed' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${status === 'completed' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.3s ease'
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className={`fas ${icon}`} style={{ fontSize: '18px', color: status === 'completed' ? '#a5b4fc' : '#64748b' }}></i>
          <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>{title}</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: '600', fontFamily: 'monospace' }}>
          {status === 'idle' && <span style={{ color: '#64748b' }}>IDLE</span>}
          {status === 'processing' && <span style={{ color: '#fbbf24' }}>PROCESSING...</span>}
          {status === 'completed' && <span style={{ color: '#34d399' }}>✓ DONE</span>}
          {status === 'error' && <span style={{ color: '#f87171' }}>✗ ERROR</span>}
        </div>
      </div>

      {/* Content */}
      {status === 'processing' && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <div className="loader" style={{ margin: '0 auto 10px' }}></div>
          <p style={{ fontSize: '12px' }}>Generating content...</p>
        </div>
      )}

      {status === 'completed' && result && (
        <>
          <div style={{ marginBottom: '12px' }}>
            {renderPreview(result)}
          </div>
          <button
            onClick={onView}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
          >
            <i className="fas fa-external-link-alt"></i> View Full Output
          </button>
        </>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#f87171' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2em', marginBottom: '10px', opacity: 0.5 }}></i>
          <p style={{ fontSize: '12px' }}>Generation failed. Please try again.</p>
        </div>
      )}

      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          <i className={`fas ${icon}`} style={{ fontSize: '2em', marginBottom: '10px', opacity: 0.2 }}></i>
          <p style={{ fontSize: '12px' }}>Waiting to start...</p>
        </div>
      )}

    </div>
  );
};

const Agentify = () => {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { isLoggedIn, setIsLoginModalOpen } = context || {};

  // View states
  const [activeAgent, setActiveAgent] = useState(null); // 'mailer' | 'website' | 'social' | 'leads'

  // Initialize State from SessionStorage if available
  const [userGoal, setUserGoal] = useState(() => sessionStorage.getItem('agentify_userGoal') || '');
  const [isProcessing, setIsProcessing] = useState(() => JSON.parse(sessionStorage.getItem('agentify_isProcessing') || 'false'));
  const [notifications, setNotifications] = useState([]);

  // Agent Selection State
  const [agents, setAgents] = useState(() => JSON.parse(sessionStorage.getItem('agentify_agents') || '{"email":true,"social":true,"website":true}'));

  // Results State
  const [results, setResults] = useState(() => JSON.parse(sessionStorage.getItem('agentify_results') || '{"email":null,"social":null,"website":null}'));

  const [processingStatus, setProcessingStatus] = useState(() => JSON.parse(sessionStorage.getItem('agentify_processingStatus') || '{"email":"idle","social":"idle","website":"idle"}'));

  // Persist State Updates
  useEffect(() => { sessionStorage.setItem('agentify_userGoal', userGoal); }, [userGoal]);
  useEffect(() => { sessionStorage.setItem('agentify_agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { sessionStorage.setItem('agentify_results', JSON.stringify(results)); }, [results]);
  useEffect(() => { sessionStorage.setItem('agentify_processingStatus', JSON.stringify(processingStatus)); }, [processingStatus]);
  useEffect(() => { sessionStorage.setItem('agentify_isProcessing', JSON.stringify(isProcessing)); }, [isProcessing]);


  const toggleAgent = (agent) => {
    setAgents(prev => ({ ...prev, [agent]: !prev[agent] }));
  };

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleReset = () => {
    if (window.confirm("Clear all mission data? This cannot be undone.")) {
      setUserGoal('');
      setResults({ email: null, social: null, website: null });
      setProcessingStatus({ email: 'idle', social: 'idle', website: 'idle' });
      setIsProcessing(false);
      sessionStorage.clear();
      sessionStorage.setItem('agentify_agents', JSON.stringify(agents));
      addNotification('All data cleared successfully', 'info');
    }
  };

  const handleRunAgents = async () => {
    if (!userGoal.trim()) {
      addNotification('Please enter a mission objective', 'error');
      return;
    }

    setIsProcessing(true);
    setResults({ email: null, social: null, website: null });
    setProcessingStatus({
      email: agents.email ? 'processing' : 'idle',
      social: agents.social ? 'processing' : 'idle',
      website: agents.website ? 'processing' : 'idle'
    });

    sessionStorage.removeItem('agentify_email_data');
    sessionStorage.removeItem('agentify_social_data');
    sessionStorage.removeItem('agentify_website_data');

    const promises = [];

    if (agents.email) {
      promises.push(
        unifiedAgentService.generateEmail(userGoal)
          .then(data => {
            setResults(prev => ({ ...prev, email: data }));
            setProcessingStatus(prev => ({ ...prev, email: 'completed' }));
            sessionStorage.setItem('agentify_email_data', JSON.stringify({
              subject: data.subject,
              mailDescription: userGoal,
              generatedEmail: data.email_body || data.emailBody,
              previewHtml: data.preview_html || data.previewHtml
            }));
            addNotification('✅ Email generated successfully', 'success');
          })
          .catch(err => {
            console.error("Email Agent Error:", err);
            setProcessingStatus(prev => ({ ...prev, email: 'error' }));
            addNotification('❌ Email generation failed', 'error');
          })
      );
    }

    if (agents.social) {
      promises.push(
        (async () => {
          try {
            const postData = await unifiedAgentService.generatePost(userGoal, ['twitter', 'linkedin', 'facebook', 'instagram']);
            // postData = { success: true, content: { captions: {...}, image_prompt: "..." } }
            const contentData = postData.content || postData; // Handle both wrapped and unwrapped responses
            let imageData = null;
            try {
              const imagePrompt = contentData.image_prompt || postData.image_prompt;
              if (imagePrompt) {
                imageData = await unifiedAgentService.generatePostImage(imagePrompt);
              }
            } catch (imgErr) {
              console.warn("Image gen failed (non-blocking)", imgErr);
            }

            const socialResult = { ...postData, content: contentData, image: imageData ? `data:image/png;base64,${imageData.image_base64}` : null };
            setResults(prev => ({ ...prev, social: socialResult }));
            setProcessingStatus(prev => ({ ...prev, social: 'completed' }));

            sessionStorage.setItem('agentify_social_data', JSON.stringify({
              theme: 'Agentify Auto-Theme',
              topic: contentData.topic || userGoal.substring(0, 20),
              description: userGoal,
              generatedContent: contentData,
              generatedImage: socialResult.image
            }));
            addNotification('✅ Social content generated successfully', 'success');
          } catch (err) {
            console.error("Social Agent Error:", err);
            setProcessingStatus(prev => ({ ...prev, social: 'error' }));
            addNotification('❌ Social content generation failed', 'error');
          }
        })()
      );
    }

    if (agents.website) {
      promises.push(
        unifiedAgentService.generateWebsite(userGoal)
          .then(data => {
            setResults(prev => ({ ...prev, website: data }));
            setProcessingStatus(prev => ({ ...prev, website: 'completed' }));

            sessionStorage.setItem('agentify_website_data', JSON.stringify({
              websiteTitle: 'Agentify Site',
              websiteDescription: userGoal,
              generatedCode: data.files,
              preview: `<!doctype html><html><head><style>${data.files['style.css'] || ''}</style></head><body>${data.files['index.html'] || ''}</body></html>`
            }));
            addNotification('✅ Website generated successfully', 'success');
          })
          .catch(err => {
            console.error("Website Agent Error:", err);
            setProcessingStatus(prev => ({ ...prev, website: 'error' }));
            addNotification('❌ Website generation failed', 'error');
          })
      );
    }

    await Promise.allSettled(promises);
    setIsProcessing(false);
    addNotification('🎉 All agents completed!', 'info');
  };

  const openAgentPage = (agentId) => {
    setActiveAgent(agentId);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  if (activeAgent === 'mailer') {
    return (
      <div className="agent-overlay">
        <button className="close-agent-btn" onClick={() => setActiveAgent(null)}>
          <ArrowLeft className="w-5 h-5" /> Back to Overview
        </button>
        <MailAutomation initialData={results.email} />
      </div>
    );
  }

  if (activeAgent === 'website') {
    return (
      <div className="agent-overlay">
        <button className="close-agent-btn" onClick={() => setActiveAgent(null)}>
          <ArrowLeft className="w-5 h-5" /> Back to Overview
        </button>
        <WebsiteBuilder initialData={results.website} />
      </div>
    );
  }

  if (activeAgent === 'social') {
    return (
      <div className="agent-overlay">
        <button className="close-agent-btn" onClick={() => setActiveAgent(null)}>
          <ArrowLeft className="w-5 h-5" /> Back to Overview
        </button>
        <PostCreator initialData={results.social} />
      </div>
    );
  }

  if (activeAgent === 'leads') {
    return (
      <div className="agent-overlay">
        <button className="close-agent-btn" onClick={() => setActiveAgent(null)}>
          <ArrowLeft className="w-5 h-5" /> Back to Overview
        </button>
        <LeadFinder />
      </div>
    );
  }

  return (
    <div className="agentify-container">
      <section className="modern-hero">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-tag">
              <Rocket className="w-3.5 h-3.5" />
              <span>Multi-Agent System</span>
            </div>
            <h1 className="hero-heading">
              Unified Agent
              <span className="gradient-text"> Command Center</span>
            </h1>
            <p className="hero-description">
              Deploy multiple AI agents simultaneously. Generate emails, social posts, and websites from a single objective.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">3</div>
                <div className="stat-label">Agents</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">1</div>
                <div className="stat-label">Click</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">∞</div>
                <div className="stat-label">Possibilities</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-visual">
              <div className="visual-icon">
                <Zap className="w-16 h-16 text-purple-400" />
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

      {/* Main Agent Section */}
      <section className="agent-page">
        <div className="agent-config-grid">

          {/* Left Panel - Configuration */}
          <div className="agent-form-container">
            <div className="panel-header-enhanced">
              <div className="header-icon-wrapper">
                <i className="fas fa-cog"></i>
              </div>
              <div className="header-text">
                <h3>Mission Configuration</h3>
                <p>Set your objectives and select agents</p>
              </div>
            </div>

            {/* Objective Input */}
            <div className="form-group-enhanced">
              <label className="label-enhanced">
                <i className="fas fa-bullseye"></i>
                <span>Mission Objective *</span>
              </label>
              <textarea
                className="textarea-enhanced"
                rows="5"
                placeholder="Describe your campaign goal... e.g., Launch a new product with email announcements, social buzz, and a landing page"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Agent Selection */}
            <div className="form-group-enhanced">
              <label className="label-enhanced">
                <i className="fas fa-robot"></i>
                <span>Select Agents</span>
              </label>
              <div className="platform-selector">
                <label className={`platform-card ${agents.email ? 'active' : ''}`} style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agents.email}
                    onChange={() => !isProcessing && toggleAgent('email')}
                    disabled={isProcessing}
                  />
                  <i className="fas fa-envelope" style={{ color: '#6366f1' }}></i>
                  <span>Email Agent</span>
                </label>

                <label className={`platform-card ${agents.social ? 'active' : ''}`} style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agents.social}
                    onChange={() => !isProcessing && toggleAgent('social')}
                    disabled={isProcessing}
                  />
                  <i className="fas fa-share-alt" style={{ color: '#8b5cf6' }}></i>
                  <span>Social Agent</span>
                </label>

                <label className={`platform-card ${agents.website ? 'active' : ''}`} style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agents.website}
                    onChange={() => !isProcessing && toggleAgent('website')}
                    disabled={isProcessing}
                  />
                  <i className="fas fa-globe" style={{ color: '#06b6d4' }}></i>
                  <span>Website Agent</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              className="holo-btn generate-btn"
              onClick={handleRunAgents}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-rocket"></i> Launch Agents
                </>
              )}
            </button>

            {!isProcessing && (Object.values(results).some(r => r !== null)) && (
              <button
                type="button"
                className="holo-btn"
                onClick={handleReset}
                style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', marginTop: '10px' }}
              >
                <i className="fas fa-trash-alt"></i> Clear All Results
              </button>
            )}
          </div>

          {/* Right Panel - Results Preview */}
          <div className="preview-panel">
            <div className="panel-header-enhanced">
              <div className="header-icon-wrapper">
                <i className="fas fa-eye"></i>
              </div>
              <div className="header-text">
                <h3>Agent Results</h3>
                <p>Live output from your agents</p>
              </div>
            </div>

            <div className="preview-content" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Email Result */}
              {agents.email && (
                <AgentResultCard
                  title="Email Agent"
                  icon="fa-envelope"
                  status={processingStatus.email}
                  result={results.email}
                  onView={() => openAgentPage('mailer')}
                  renderPreview={(data) => (
                    <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
                        📧 {data.subject}
                      </div>
                      <div
                        style={{ maxHeight: '120px', overflow: 'hidden', opacity: 0.8 }}
                        dangerouslySetInnerHTML={{ __html: data.preview_html || data.email_body }}
                      />
                    </div>
                  )}
                />
              )}

              {/* Social Result */}
              {agents.social && (
                <AgentResultCard
                  title="Social Agent"
                  icon="fa-share-alt"
                  status={processingStatus.social}
                  result={results.social}
                  onView={() => openAgentPage('social')}
                  renderPreview={(data) => (
                    <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      {data.image && (
                        <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={data.image} alt="Social Post" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ fontStyle: 'italic', opacity: 0.9 }}>
                        "{data.content?.captions?.twitter || 'Content generated'}"
                      </div>
                    </div>
                  )}
                />
              )}

              {/* Website Result */}
              {agents.website && (
                <AgentResultCard
                  title="Website Agent"
                  icon="fa-globe"
                  status={processingStatus.website}
                  result={results.website}
                  onView={() => openAgentPage('website')}
                  renderPreview={(data) => {
                    // Build the srcDoc correctly: if index.html is already a full doc, inject CSS into it
                    const htmlContent = data.files?.['index.html'] || '';
                    const cssContent = data.files?.['style.css'] || '';
                    let srcDoc;
                    if (htmlContent.toLowerCase().includes('<!doctype') || htmlContent.toLowerCase().includes('<html')) {
                      // Already a full HTML document - inject CSS inside <head> or prepend a <style> tag
                      if (htmlContent.toLowerCase().includes('</head>')) {
                        srcDoc = htmlContent.replace(/<\/head>/i, `<style>${cssContent}</style></head>`);
                      } else {
                        srcDoc = `<style>${cssContent}</style>${htmlContent}`;
                      }
                    } else {
                      // Partial HTML body only
                      srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${cssContent}</style></head><body>${htmlContent}</body></html>`;
                    }
                    return (
                      <div style={{ height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#fff', position: 'relative' }}>
                        <iframe
                          style={{ width: '300%', height: '300%', transform: 'scale(0.333)', transformOrigin: 'top left', border: 'none', pointerEvents: 'none' }}
                          srcDoc={srcDoc}
                          title="Website Preview"
                          sandbox="allow-scripts"
                        />
                      </div>
                    );
                  }}
                />
              )}

              {/* Empty State */}
              {!Object.values(results).some(r => r !== null) && !isProcessing && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '3em', marginBottom: '15px', opacity: 0.3 }}></i>
                  <p style={{ fontSize: '14px' }}>No results yet. Configure and launch your agents to see outputs here.</p>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

    </div>
  );
};


export default Agentify;
