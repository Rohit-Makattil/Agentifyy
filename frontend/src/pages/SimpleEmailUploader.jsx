import { useState } from 'react';
import axios from 'axios';
import './SimpleEmailUploader.css';

function SimpleEmailUploader() {
  const [file, setFile] = useState(null);
  const [emailId, setEmailId] = useState(null);
  const [emails, setEmails] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setEmails(null);
      setEmailId(null);
    } else {
      alert('Please upload a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

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
        alert(`✅ ${response.data.message}`);
      } else {
        alert('Error: ' + response.data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload CSV');
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSend = async () => {
    if (!emailId || !subject || !body) {
      alert('Please upload CSV and fill in subject & body');
      return;
    }

    if (!window.confirm(`Send email to ${emails.total_valid} recipients?`)) {
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('email_id', emailId);
      formData.append('subject', subject);
      formData.append('body', body);

      const response = await axios.post(
        'http://localhost:5000/send-simple-bulk-email', 
        formData
      );

      if (response.data.success) {
        setResult(response.data);
        alert(`✅ Sent ${response.data.sent} emails!`);
      } else {
        alert('Error: ' + response.data.error);
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="simple-email-uploader">
      <div className="container">
        
        <div className="header">
          <h1>📧 Bulk Email Campaign</h1>
          <p>Upload CSV with emails and send campaigns</p>
        </div>

        <div className="card upload-card">
          <h2>Step 1: Upload Email List</h2>
          
          <div className="file-upload-box">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="csv-file"
              style={{ display: 'none' }}
            />
            <label htmlFor="csv-file" className="file-upload-label">
              <i className="fas fa-cloud-upload"></i>
              {file ? file.name : 'Choose CSV File'}
            </label>
            
            {file && (
              <button className="btn-primary" onClick={handleUpload}>
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
            <div className="extraction-results">
              <div className="stats-row">
                <div className="stat-box success">
                  <div className="stat-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Valid Emails</div>
                    <div className="stat-value">{emails.total_valid}</div>
                  </div>
                </div>

                {emails.total_invalid > 0 && (
                  <div className="stat-box warning">
                    <div className="stat-icon">
                      <i className="fas fa-exclamation-circle"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Invalid</div>
                      <div className="stat-value">{emails.total_invalid}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="email-preview">
                <h3>📋 Email List Preview</h3>
                <div className="email-list">
                  {emails.valid_emails.slice(0, 10).map((email, idx) => (
                    <div key={idx} className="email-item">
                      <i className="fas fa-envelope"></i>
                      <span>{email}</span>
                    </div>
                  ))}
                  {emails.total_valid > 10 && (
                    <div className="email-item more">
                      +{emails.total_valid - 10} more emails...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {emails && (
          <div className="card compose-card">
            <h2>Step 2: Compose Email</h2>

            <div className="form-group">
              <label>Subject Line *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Body *</label>
              <textarea
                className="textarea-field"
                rows="8"
                placeholder="Enter your email message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              ></textarea>
            </div>

            <div className="action-buttons">
              <button 
                className="btn-success" 
                onClick={handleSend}
                disabled={sending || !subject || !body}
              >
                {sending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> 
                    Send to {emails.total_valid} Recipients
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="card result-card">
            <h2>✅ Campaign Complete</h2>
            
            <div className="result-stats">
              <div className="result-item success">
                <i className="fas fa-check"></i>
                <div>
                  <div className="result-label">Sent Successfully</div>
                  <div className="result-number">{result.sent}</div>
                </div>
              </div>

              {result.failed > 0 && (
                <div className="result-item error">
                  <i className="fas fa-times"></i>
                  <div>
                    <div className="result-label">Failed</div>
                    <div className="result-number">{result.failed}</div>
                  </div>
                </div>
              )}

              <div className="result-item info">
                <i className="fas fa-envelope"></i>
                <div>
                  <div className="result-label">Total</div>
                  <div className="result-number">{result.total}</div>
                </div>
              </div>
            </div>

            <button 
              className="btn-secondary"
              onClick={() => {
                setResult(null);
                setFile(null);
                setEmails(null);
                setSubject('');
                setBody('');
              }}
            >
              <i className="fas fa-plus"></i> Send Another Campaign
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default SimpleEmailUploader;
