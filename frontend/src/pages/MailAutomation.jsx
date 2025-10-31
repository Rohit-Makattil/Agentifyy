import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import axios from 'axios';

function MailAutomation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Form states
  const [subject, setSubject] = useState('');
  const [mailDescription, setMailDescription] = useState('');  // Changed from bodyTemplate
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [senderName, setSenderName] = useState('Agentify Team');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  
  // Generated email state
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  
  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      setIsLoginModalOpen(true);
    }
  }, []);

  const handleGenerateEmail = async (e) => {
    e.preventDefault();
    
    if (!subject || !mailDescription) {
      showNotification('Please fill in subject and mail description', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:5000/email/generate', {
        subject,
        mailDescription,  // Changed from bodyTemplate
        receiverName: receiverName || 'Recipient',
        senderName: senderName || 'Agentify Team'
      });

      if (response.data.success) {
        setGeneratedEmail(response.data.emailBody);
        setPreviewHtml(response.data.previewHtml);
        setShowPreview(true);
        showNotification('✅ Email generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Generation error:', error);
      showNotification('❌ Failed to generate email', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!generatedEmail) {
      showNotification('Please generate email first', 'error');
      return;
    }

    if (!receiverEmail) {
      showNotification('Please enter receiver email', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiverEmail)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    setIsSending(true);
    try {
      const response = await axios.post('http://localhost:5000/email/send', {
        subject,
        body: generatedEmail,
        recipients: [receiverEmail],
        scheduledTime: scheduledDateTime || null,
        senderName: senderName || 'Agentify Team'
      });

      if (response.data.success) {
        const message = scheduledDateTime 
          ? `📅 Email scheduled for ${new Date(scheduledDateTime).toLocaleString()}`
          : `✅ Email sent successfully to ${receiverEmail}`;
        showNotification(message, 'success');
        
        // Reset form if sent immediately
        if (!scheduledDateTime) {
          setSubject('');
          setMailDescription('');
          setReceiverName('');
          setReceiverEmail('');
          setGeneratedEmail('');
          setShowPreview(false);
          setScheduledDateTime('');
        }
      }
    } catch (error) {
      console.error('Send error:', error);
      showNotification('❌ Failed to send email', 'error');
    } finally {
      setIsSending(false);
    }
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

  const emailExamples = [
    { 
      label: 'Leave Application', 
      template: '10 days leave since my right hand is fractured and I need time to recover properly' 
    },
    { 
      label: 'Meeting Request', 
      template: 'Request a meeting next week to discuss the Q4 project deliverables and timeline adjustments' 
    },
    { 
      label: 'Follow-up', 
      template: 'Follow up on the proposal I submitted last week regarding the new marketing strategy' 
    }
  ];

  return (
    <>
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      
      <section className={`agent-hero mail-automation-hero ${!isLoggedIn ? 'blur' : ''}`}>
        <div className="floating-shapes">
          <div className="floating-shape"></div>
          <div className="floating-shape"></div>
          <div className="floating-shape"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge-animated">
            <span className="badge-glow"></span>
            <i className="fas fa-envelope"></i>
            <span>AI-Powered Email Automation</span>
          </div>
          <h1 className="hero-title-enhanced">
            <span className="gradient-text-animated">Mail Automation</span>
          </h1>
          <p className="hero-subtitle-enhanced">
            Generate professional emails instantly with AI.<br />
            Schedule and send to multiple recipients effortlessly.
          </p>
        </div>
      </section>

      <section className={`agent-page mail-automation-page ${!isLoggedIn ? 'blur' : ''}`}>
        <div className="mail-container">
          <div className="section-header-builder">
            <span className="section-badge-builder">
              <i className="fas fa-robot"></i> AI Email Generator
            </span>
            <h2 className="section-title-builder">Create Professional Emails</h2>
            <p className="section-subtitle-builder">
              Describe your situation and let AI create a complete, professional email
            </p>
          </div>

          <div className="mail-grid">
            {/* Left Panel - Email Configuration */}
            <div className="config-panel">
              <div className="panel-header-enhanced">
                <div className="header-icon-wrapper">
                  <i className="fas fa-pen-fancy"></i>
                </div>
                <div className="header-text">
                  <h3>Email Details</h3>
                  <p>Configure your email content</p>
                </div>
              </div>
              
              <form className="builder-form" onSubmit={handleGenerateEmail}>
                <div className="form-group-enhanced">
                  <label className="label-enhanced">
                    <i className="fas fa-heading"></i>
                    <span>Email Subject *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Leave Application Request"
                    className="input-enhanced"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-enhanced">
                  <label className="label-enhanced">
                    <i className="fas fa-file-alt"></i>
                    <span>Mail Description *</span>
                  </label>
                  <textarea
                    placeholder="e.g., 10 days leave since my right hand is fractured and I need time to recover"
                    className="textarea-enhanced"
                    value={mailDescription}
                    onChange={(e) => setMailDescription(e.target.value)}
                    required
                    rows="5"
                  ></textarea>
                  
                  <div className="quick-templates">
                    <span className="templates-label">📝 Quick Examples:</span>
                    {emailExamples.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        className="template-chip"
                        onClick={() => setMailDescription(example.template)}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-enhanced">
                    <label className="label-enhanced">
                      <i className="fas fa-user"></i>
                      <span>Receiver Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Manager"
                      className="input-enhanced"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                    />
                  </div>

                  <div className="form-group-enhanced">
                    <label className="label-enhanced">
                      <i className="fas fa-signature"></i>
                      <span>Your Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., John Doe"
                      className="input-enhanced"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="generate-btn-enhanced" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Generating Email...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i>
                      <span>Generate Email</span>
                    </>
                  )}
                </button>
              </form>

              {/* Send Configuration */}
              {showPreview && (
                <div className="send-config">
                  <div className="config-divider"></div>
                  
                  <div className="panel-header-enhanced">
                    <div className="header-icon-wrapper">
                      <i className="fas fa-paper-plane"></i>
                    </div>
                    <div className="header-text">
                      <h3>Send Configuration</h3>
                      <p>Configure recipient and schedule</p>
                    </div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="label-enhanced">
                      <i className="fas fa-envelope"></i>
                      <span>Receiver Email *</span>
                    </label>
                    <input
                      type="email"
                      placeholder="receiver@example.com"
                      className="input-enhanced"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-enhanced">
                    <label className="label-enhanced">
                      <i className="fas fa-clock"></i>
                      <span>Schedule Send Time (Optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="input-enhanced"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <small className="field-hint">
                      ℹ️ Leave empty to send immediately
                    </small>
                  </div>

                  <button 
                    type="button" 
                    className="send-btn-enhanced" 
                    onClick={handleSendEmail}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        <span>{scheduledDateTime ? 'Schedule Email' : 'Send Now'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel - Email Preview */}
            <div className="preview-panel-enhanced">
              <div className="panel-header-enhanced">
                <div className="header-icon-wrapper">
                  <i className="fas fa-eye"></i>
                </div>
                <div className="header-text">
                  <h3>Live Email Preview</h3>
                  <p>See how your email looks</p>
                </div>
              </div>
              
              <div className="email-preview-container">
                {showPreview && previewHtml ? (
                  <div 
                    className="email-preview-content"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="preview-placeholder-enhanced">
                    <div className="placeholder-icon">
                      <i className="fas fa-envelope-open-text"></i>
                    </div>
                    <h3>Email Preview</h3>
                    <p>Your AI-generated email will appear here</p>
                    <div className="placeholder-features">
                      <span><i className="fas fa-check"></i> AI Powered</span>
                      <span><i className="fas fa-check"></i> Professional Format</span>
                      <span><i className="fas fa-check"></i> Ready to Send</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Link to="/" className="back-btn-enhanced">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </Link>
        </div>
      </section>

      {!isLoggedIn && (
        <div className="login-overlay" style={{ display: 'flex' }}>
          <div className="login-overlay-content">
            <div className="lock-icon-wrapper">
              <i className="fas fa-lock"></i>
            </div>
            <h3>Authentication Required</h3>
            <p>Please log in to access Mail Automation</p>
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

export default MailAutomation;
