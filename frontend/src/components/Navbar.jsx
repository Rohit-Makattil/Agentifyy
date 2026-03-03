import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Navbar({ onLoginClick, isLoggedIn }) {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/';
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar cosmic-navbar" id="navbar">
      <div className="nav-container">
        <div className="logo">
          <span className="logo-gradient">Agentify</span>
        </div>
        <ul className="nav-menu">
          <li>
            <Link to="/" className={isActive('/')}>
              <i className="fas fa-home"></i> Home
            </Link>
          </li>
          {isLoggedIn && (
            <>
              <li>
                <Link to="/mailer" className={isActive('/mailer')}>
                  <i className="fas fa-envelope"></i> Mail Automation
                </Link>
              </li>
              <li>
                <Link to="/website-builder" className={isActive('/website-builder')}>
                  <i className="fas fa-globe"></i> Website Builder
                </Link>
              </li>
              <li>
                <Link to="/post-maker" className={isActive('/post-maker')}>
                  <i className="fas fa-pen"></i> Post Creator
                </Link>
              </li>
              <li>
                <Link to="/agentify" className={`agentify-link ${isActive('/agentify')}`} style={{ color: '#a855f7', fontWeight: 'bold' }}>
                  <i className="fas fa-bolt"></i> Agentify
                </Link>
              </li>
            </>
          )}
        </ul>
        <div className="nav-auth">
          {isLoggedIn ? (
            <button className="auth-btn logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Log Out</span>
            </button>
          ) : (
            <button className="auth-btn login-btn" onClick={onLoginClick}>
              <i className="fas fa-sign-in-alt"></i>
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}


export default Navbar;
