import { useState } from 'react';

function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'rohit' && password === '123') {
      localStorage.setItem('isLoggedIn', 'true');
      showNotification('Login successful! Welcome to Agentify.', 'success');
      onLoginSuccess();
      onClose();
      // Reload to update UI
      window.location.reload();
    } else {
      showNotification('Invalid credentials. Use rohit / 123', 'error');
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    showNotification('Sign-up feature coming soon!', 'info');
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

  if (!isOpen) return null;

  return (
    <div className="login-modal" style={{ display: 'flex' }}>
      <div className="login-container glassmorphism">
        <div className="login-header">
          <h2 className="login-title">Welcome to Agentify</h2>
          <p className="login-subtitle">Sign in to command your AI agents</p>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(false)}
          >
            Sign In
          </button>
          <button 
            className={`tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(true)}
          >
            Sign Up
          </button>
        </div>

        {!isSignUp ? (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="login-btn">
              <i className="fas fa-sign-in-alt"></i> Sign In
            </button>
            <div className="login-help">
              <p>Demo credentials: <strong>rohit / 123</strong></p>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSignUp}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="login-btn">
              <i className="fas fa-user-plus"></i> Sign Up
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
