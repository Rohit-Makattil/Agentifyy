function Footer() {
  const teamMembers = [
    {
      name: 'Aastha Dubey',
      instagram: '#',
      linkedin: '#',
      github: '#'
    },
    {
      name: 'Paridhi Gupta',
      instagram: '#',
      linkedin: '#',
      github: '#'
    },
    {
      name: 'Shriya Jain',
      instagram: '#',
      linkedin: '#',
      github: '#'
    },
    {
      name: 'Rohit Makattil',
      instagram: '#',
      linkedin: '#',
      github: '#'
    }
  ];

  return (
    <footer className="footer" id="about">
      <div className="footer-content">
        <div className="team-section">
          <h3 className="team-title">Created by</h3>
          <div className="team-members">
            {teamMembers.map((member, index) => (
              <div key={index} className="member">
                <span className="member-name">{member.name}</span>
                <div className="social-links">
                  <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="social-icon">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                  <a href={member.github} target="_blank" rel="noopener noreferrer" className="social-icon">
                    <i className="fab fa-github"></i>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mentor">Mentor: Mrs. Himanshi Jiwatramani</div>
        <div className="footer-divider"></div>
        <p className="footer-copyright">&copy; 2025 Agentify. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
