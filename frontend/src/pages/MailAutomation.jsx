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
  const [mailDescription, setMailDescription] = useState('');
  const [senderName, setSenderName] = useState('Agentify Team');
  
  // Generated email state
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  
  // Send mode & states
  const [sendMode, setSendMode] = useState(null); // null, 'single', or 'csv'
  const [receiverName, setReceiverName] = useState(''); // For single email
  const [receiverEmail, setReceiverEmail] = useState(''); // For single email
  const [csvFile, setCsvFile] = useState(null);
  const [emails, setEmails] = useState(null);
  const [emailId, setEmailId] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  
  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      setIsLoginModalOpen(true);
    }
  }, []);

  // STEP 1: Generate Email
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
        mailDescription,
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
      showNotification('❌ Failed to generate email', 'error');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // STEP 2A: Send to single email
  const handleSendManual = async () => {
    if (!receiverEmail || !receiverName) {
      showNotification('Please enter receiver name and email', 'error');
      return;
    }

    if (!generatedEmail) {
      showNotification('Please generate email first', 'error');
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
        if (scheduledDateTime) {
          showNotification(`✅ Email scheduled for ${new Date(scheduledDateTime).toLocaleString()}`, 'success');
        } else {
          showNotification(`✅ Email sent to ${receiverEmail}`, 'success');
        }
        setReceiverEmail('');
        setReceiverName('');
        setScheduledDateTime('');
        setSendResult(response.data);
      }
    } catch (error) {
      showNotification('❌ Failed to send email', 'error');
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  // STEP 2B: Upload CSV
  const handleCsvChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setCsvFile(selectedFile);
    } else {
      showNotification('Please upload a valid CSV file', 'error');
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile) {
      showNotification('Please select a CSV file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      setUploadProgress(50);
      
      const response = await axios.post(
        'http://localhost:5000/upload-email-csv', 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setUploadProgress(100);

      if (response.data.success) {
        setEmailId(response.data.email_id);
        setEmails(response.data);
        showNotification(`✅ Found ${response.data.total_valid} emails with names`, 'success');
      } else {
        showNotification('❌ Error: ' + response.data.error, 'error');
      }
    } catch (error) {
      showNotification('❌ Error uploading CSV', 'error');
      console.error(error);
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // STEP 2B: Send to CSV emails
  const handleSendCSV = async () => {
    if (!emailId || !generatedEmail) {
      showNotification('Please upload CSV and generate email', 'error');
      return;
    }

    if (!window.confirm(`Send to ${emails.total_valid} recipients?`)) return;

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('email_id', emailId);
      formData.append('subject', subject);
      formData.append('body', generatedEmail);
      
      // Add scheduled time if provided
      if (scheduledDateTime) {
        formData.append('scheduledTime', scheduledDateTime);
      }

      const response = await axios.post(
        'http://localhost:5000/send-bulk-email', 
        formData
      );

      if (response.data.success) {
        if (response.data.status === 'scheduled') {
          showNotification(`✅ Campaign scheduled for ${emails.total_valid} recipients!`, 'success');
        } else {
          showNotification(`✅ Sent ${response.data.sent} emails!`, 'success');
        }
        setSendResult(response.data);
        setScheduledDateTime('');
      } else {
        showNotification('❌ Error: ' + response.data.error, 'error');
      }
    } catch (error) {
      showNotification('❌ Error sending emails', 'error');
      console.error(error);
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

  const resetForm = () => {
    setSendResult(null);
    setEmails(null);
    setEmailId(null);
    setSubject('');
    setMailDescription('');
    setCsvFile(null);
    setScheduledDateTime('');
    setGeneratedEmail('');
    setPreviewHtml('');
    setShowPreview(false);
    setReceiverEmail('');
    setReceiverName('');
    setSendMode(null);
  };

  const emailExamples = [
    { label: 'Leave Application', template: '10 days leave since my right hand is fractured' },
    { label: 'Meeting Request', template: 'Request a meeting to discuss Q4 project deliverables' },
    { label: 'Follow-up', template: 'Follow up on the proposal I submitted last week' }
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
            Generate professional emails with AI and send to single or bulk recipients with scheduling.
          </p>
        </div>
      </section>

      <section className={`agent-page mail-automation-page ${!isLoggedIn ? 'blur' : ''}`}>
        <div className="mail-container">
          <div className="section-header-builder">
            <span className="section-badge-builder">
              <i className="fas fa-robot"></i> AI Email Generator
            </span>
            <h2 className="section-title-builder">Create & Send Professional Emails</h2>
            <p className="section-subtitle-builder">
              Generate emails with AI and send to single or multiple recipients with optional scheduling
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
                    placeholder="Describe your email..."
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
                      <p>Choose how to send</p>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="mode-selector">
                    <button
                      type="button"
                      className={`mode-btn ${sendMode === 'single' ? 'active' : ''}`}
                      onClick={() => {
                        setSendMode('single');
                        setEmails(null);
                        setEmailId(null);
                        setCsvFile(null);
                      }}
                    >
                      <i className="fas fa-envelope"></i> Single Email
                    </button>
                    
                    <button
                      type="button"
                      className={`mode-btn ${sendMode === 'csv' ? 'active' : ''}`}
                      onClick={() => {
                        setSendMode('csv');
                        setReceiverEmail('');
                        setReceiverName('');
                      }}
                    >
                      <i className="fas fa-upload"></i> Multiple Emails from Sheet
                    </button>
                  </div>

                  {/* Single Email Mode */}
                  {sendMode === 'single' && (
                    <div className="send-section single-email-section">
                      <div className="form-group-enhanced">
                        <label className="label-enhanced">
                          <i className="fas fa-user"></i>
                          <span>Receiver Name *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., John"
                          className="input-enhanced"
                          value={receiverName}
                          onChange={(e) => setReceiverName(e.target.value)}
                          required
                        />
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
                          <span>Schedule Time (Optional)</span>
                        </label>
                        <input
                          type="datetime-local"
                          className="input-enhanced"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                        />
                        {scheduledDateTime && (
                          <small className="time-info">
                            ⏰ Scheduled for: {new Date(scheduledDateTime).toLocaleString()}
                          </small>
                        )}
                      </div>

                      <button 
                        type="button" 
                        className="send-btn-enhanced" 
                        onClick={handleSendManual}
                        disabled={isSending || !receiverEmail || !receiverName}
                      >
                        {isSending ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane"></i>
                            <span>{scheduledDateTime ? 'Schedule Email' : 'Send Email'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Multiple Emails (CSV) Mode */}
                  {sendMode === 'csv' && (
                    <div className="send-section csv-section">
                      <h4 className="csv-section-title">📊 Bulk Email Campaign</h4>
                      <p className="csv-section-info">Upload a CSV file with Email and Name columns for personalized sending</p>
                      
                      <div className="csv-upload-area">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvChange}
                          id="csv-file"
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="csv-file" className="csv-upload-label">
                          <i className="fas fa-cloud-upload"></i>
                          {csvFile ? csvFile.name : 'Choose CSV File'}
                        </label>
                        
                        {csvFile && (
                          <button 
                            type="button" 
                            className="upload-csv-btn" 
                            onClick={handleUploadCSV}
                          >
                            <i className="fas fa-upload"></i> Upload & Extract
                          </button>
                        )}
                      </div>

                      {uploadProgress > 0 && (
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}

                      {emails && (
                        <>
                          <div className="csv-stats">
                            <div className="stat success">
                              <i className="fas fa-check-circle"></i>
                              <span className="stat-text">
                                {emails.total_valid} Valid Emails
                              </span>
                            </div>
                            {emails.total_invalid > 0 && (
                              <div className="stat error">
                                <i className="fas fa-times-circle"></i>
                                <span className="stat-text">
                                  {emails.total_invalid} Invalid
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="email-list-preview">
                            <h5 className="preview-title">👥 Recipients with Names (First 5):</h5>
                            <ul className="email-list">
                              {emails.email_name_pairs && emails.email_name_pairs.slice(0, 5).map((item, idx) => (
                                <li key={idx} className="email-item">
                                  <i className="fas fa-envelope"></i>
                                  <div className="email-details">
                                    <span className="email-text">{item.email}</span>
                                    <span className="email-name">👤 {item.name}</span>
                                  </div>
                                </li>
                              ))}
                              {emails.total_valid > 5 && (
                                <li className="more-items">
                                  +{emails.total_valid - 5} more recipients...
                                </li>
                              )}
                            </ul>
                          </div>

                          <div className="csv-schedule-section">
                            <div className="form-group-enhanced">
                              <label className="label-enhanced">
                                <i className="fas fa-clock"></i>
                                <span>Schedule Time (Optional)</span>
                              </label>
                              <input
                                type="datetime-local"
                                className="input-enhanced"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                              />
                              {scheduledDateTime && (
                                <small className="time-info">
                                  ⏰ Scheduled for: {new Date(scheduledDateTime).toLocaleString()}
                                </small>
                              )}
                            </div>

                            <button 
                              type="button" 
                              className="send-btn-enhanced" 
                              onClick={handleSendCSV}
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
                                  <span>
                                    {scheduledDateTime 
                                      ? `Schedule to ${emails.total_valid} Recipients` 
                                      : `Send to ${emails.total_valid} Recipients`}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
                  </div>
                )}
              </div>

              {/* Send Result - Campaign Status */}
              {sendResult && (
                <div className="campaign-status-container">
                  {sendResult.status === 'scheduled' ? (
                    <div className="scheduled-campaign-card">
                      {/* Success Header */}
                      <div className="status-header success-header">
                        <div className="status-icon-wrapper">
                          <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="status-text">
                          <h3>Campaign Scheduled Successfully</h3>
                          <p>Your email campaign has been queued for delivery</p>
                        </div>
                      </div>

                      {/* Campaign Details Grid */}
                      <div className="campaign-details-grid">
                        {/* Recipients Card */}
                        <div className="campaign-detail-card recipients-card">
                          <div className="detail-icon recipients-icon">
                            <i className="fas fa-users"></i>
                          </div>
                          <div className="detail-content">
                            <p className="detail-label">Total Recipients</p>
                            <p className="detail-value">{sendResult.total_recipients}</p>
                          </div>
                        </div>

                        {/* Scheduled Time Card */}
                        <div className="campaign-detail-card time-card">
                          <div className="detail-icon time-icon">
                            <i className="fas fa-clock"></i>
                          </div>
                          <div className="detail-content">
                            <p className="detail-label">Scheduled Time</p>
                            <p className="detail-value">
                              {new Date(sendResult.scheduled_time).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Campaign ID Card */}
                        <div className="campaign-detail-card id-card">
                          <div className="detail-icon id-icon">
                            <i className="fas fa-hashtag"></i>
                          </div>
                          <div className="detail-content">
                            <p className="detail-label">Campaign ID</p>
                            <p className="detail-value campaign-id">
                              {sendResult.campaign_id?.substring(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="info-banner">
                        <i className="fas fa-info-circle"></i>
                        <div className="banner-content">
                          <p className="banner-title">Personalization Enabled</p>
                          <p className="banner-message">
                            Each email will be personalized with the recipient's name from your CSV file. Emails will be sent automatically at the scheduled time.
                          </p>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="campaign-timeline">
                        <div className="timeline-item completed">
                          <div className="timeline-marker">
                            <i className="fas fa-check"></i>
                          </div>
                          <div className="timeline-content">
                            <p className="timeline-title">Campaign Created</p>
                            <p className="timeline-time">
                              {new Date().toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="timeline-item pending">
                          <div className="timeline-marker">
                            <i className="fas fa-hourglass-half"></i>
                          </div>
                          <div className="timeline-content">
                            <p className="timeline-title">Scheduled Delivery</p>
                            <p className="timeline-time">
                              {new Date(sendResult.scheduled_time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="campaign-actions">
                        <button 
                          className="action-btn primary-btn"
                          onClick={resetForm}
                        >
                          <i className="fas fa-plus"></i>
                          Create New Campaign
                        </button>
                        <button 
                          className="action-btn secondary-btn"
                          onClick={() => setSendResult(null)}
                        >
                          <i className="fas fa-times"></i>
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="sent-campaign-card">
                      {/* Success Header */}
                      <div className="status-header sent-header">
                        <div className="status-icon-wrapper">
                          <i className="fas fa-paper-plane"></i>
                        </div>
                        <div className="status-text">
                          <h3>Emails Sent Successfully</h3>
                          <p>Your campaign has been delivered</p>
                        </div>
                      </div>

                      {/* Sent Stats */}
                      <div className="sent-stats-grid">
                        <div className="stat-card sent-stat">
                          <div className="stat-number sent">{sendResult.sent || 0}</div>
                          <div className="stat-label">Sent Successfully</div>
                        </div>
                        
                        {sendResult.failed > 0 && (
                          <div className="stat-card failed-stat">
                            <div className="stat-number failed">{sendResult.failed}</div>
                            <div className="stat-label">Failed</div>
                          </div>
                        )}
                        
                        <div className="stat-card total-stat">
                          <div className="stat-number total">{sendResult.total || 0}</div>
                          <div className="stat-label">Total Recipients</div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button 
                        className="action-btn primary-btn"
                        onClick={resetForm}
                      >
                        <i className="fas fa-plus"></i>
                        Send Another Campaign
                      </button>
                    </div>
                  )}
                </div>
              )}
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
