function Features() {
  const features = [
    {
      icon: 'fa-brain',
      title: 'Natural Language Understanding',
      description: 'Simply describe your goals in plain English. Our AI understands complex instructions and converts them into actionable plans.'
    },
    {
      icon: 'fa-cogs',
      title: 'Smart Task Planning',
      description: 'Advanced AI breaks down complex goals into manageable steps, optimizing the execution path for maximum efficiency.'
    },
    {
      icon: 'fa-plug',
      title: 'Seamless Integrations',
      description: 'Connect with Gmail, Twitter, Google Sheets, and more. Your agent works with the tools you already use.'
    },
    {
      icon: 'fa-chart-line',
      title: 'Real-Time Progress Tracking',
      description: 'Monitor your agent\'s progress with detailed logs and real-time updates. Full transparency into every action taken.'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Safe & Secure',
      description: 'Built-in safeguards ensure your data remains private and secure. User approval required for sensitive actions.'
    },
    {
      icon: 'fa-graduation-cap',
      title: 'Continuous Learning',
      description: 'Your agents learn from each task, becoming more efficient and accurate with every execution.'
    }
  ];

  return (
    <section className="features" id="features">
      <h2 className="section-title fade-in">Powerful Features</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card fade-in">
            <div className="feature-icon">
              <i className={`fas ${feature.icon}`}></i>
            </div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;
