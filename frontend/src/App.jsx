import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MailAutomation from './pages/MailAutomation';
import WebsiteBuilder from './pages/WebsiteBuilder';
import PostCreator from './pages/PostCreator';
import Background from './components/Background';
import './assets/css/styles.css';

function App() {
  return (
    <Router>
      <Background />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mailer" element={<MailAutomation />} />
        <Route path="/website-builder" element={<WebsiteBuilder />} />
        <Route path="/post-maker" element={<PostCreator />} />
      </Routes>
    </Router>
  );
}

export default App;
