import { useNavigate } from 'react-router-dom';

function AgentCard({ icon, title, description, backDescription, path, isLoggedIn, onLoginClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      onLoginClick();
    }
  };

  return (
    <div className="agent-card" onClick={handleClick}>
      <div className="card-front">
        <i className={`fas ${icon}`}></i>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="card-back">
        <p>{backDescription}</p>
      </div>
    </div>
  );
}

export default AgentCard;
