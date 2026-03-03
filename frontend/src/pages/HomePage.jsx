import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import AgentCard from '../components/AgentCard';
import { useOutletContext } from 'react-router-dom';

function HomePage() {
  const { isLoggedIn, setIsLoginModalOpen } = useOutletContext();
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    // Add scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);


  const playDemoVideo = () => {
    setShowDemo(true);
    setTimeout(() => {
      const demoVideo = document.getElementById('demoVideo');
      if (demoVideo) {
        demoVideo.muted = false;
        demoVideo.play();
      }
    }, 100);
  };

  const agents = [
    {
      icon: 'fa-envelope-open-text',
      title: 'Mail Automation',
      description: 'Automate follow-up emails at warp speed.',
      backDescription: 'Send personalized emails with smart scheduling and real-time tracking.',
      path: '/mailer'
    },
    {
      icon: 'fa-code',
      title: 'Website Builder',
      description: 'Instantly spin up futuristic landing pages.',
      backDescription: 'Generate stunning websites with AI-driven design and instant deployment.',
      path: '/website-builder'
    },
    {
      icon: 'fa-feather-alt',
      title: 'Post Creator',
      description: 'Create viral social media posts with AI flair.',
      backDescription: 'Craft engaging posts with AI suggestions and hashtag optimization.',
      path: '/post-maker'
    },
    // New Agentify entry added here
    {
      icon: 'fa-bolt',
      title: 'Agentify Super-Agent',
      description: 'One prompt, three agents. Email, Post, Website.',
      backDescription: 'The ultimate all-in-one tool. Generate an email campaign, social post, and landing page from a single goal.',
      path: '/agentify'
    },
    {
      icon: 'fa-chart-pie',
      title: 'Response Analytics',
      description: '📊 Track your email ROI in real-time.',
      backDescription: 'View live response data, interested leads, and conversion rates from your central Google Sheet.',
      path: '/analytics'
    }
  ];

  return (
    <div className="page-wrapper">
      <Hero onLoginClick={() => setIsLoginModalOpen(true)} />

      <Features />

      {/* Demo Section */}
      <section className="demo" id="demo">
        <div className="demo-container">
          <div className="section-header fade-in">
            <span className="section-badge">
              <i className="fas fa-video"></i> Live Demo
            </span>
            <h2 className="section-title">See Agentify in Action</h2>
            <p className="section-subtitle">
              Watch how easy it is to create and launch your first AI agent in just minutes
            </p>
          </div>

          <div className="demo-video-wrapper fade-in">
            <div className="video-container">
              <video id="demoVideo" autoPlay loop muted playsInline>
                <source src="/demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Selector */}
      <section className="agent-selector" id="create">
        <div className="section-header fade-in">
          <span className="section-badge">
            <i className="fas fa-robot"></i> AI Agents
          </span>
          <h2 className="section-title">Select Your Agent</h2>
          <p className="section-subtitle">
            Choose an AI agent to automate your tasks with precision and efficiency
          </p>
        </div>

        <div className="agent-selector-content">
          <div className={`card-grid ${!isLoggedIn ? 'blur' : ''}`} id="cardGrid">
            {agents.map((agent, index) => (
              <AgentCard
                key={index}
                {...agent}
                isLoggedIn={isLoggedIn}
                onLoginClick={() => setIsLoginModalOpen(true)}
              />
            ))}
          </div>

          {!isLoggedIn && (
            <div className="login-overlay">
              <div className="login-overlay-content">
                <div className="lock-icon-wrapper">
                  <i className="fas fa-lock"></i>
                </div>
                <h3>Authentication Required</h3>
                <p>Please log in to select and launch an agent</p>
                <button className="login-overlay-btn" onClick={() => setIsLoginModalOpen(true)}>
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Log In to Continue</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;