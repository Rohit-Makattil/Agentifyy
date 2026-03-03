import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MailAutomation from './pages/MailAutomation';
import WebsiteBuilder from './pages/WebsiteBuilder';
import PostCreator from './pages/PostCreator';
import SimpleEmailUploader from './pages/SimpleEmailUploader';
import Agentify from './pages/Agentify';
import ResponseAnalytics from './pages/ResponseAnalytics';
import LeadFinder from './pages/LeadFinder';
import MainLayout from './components/MainLayout';
import './assets/css/styles.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/mailer" element={<MailAutomation />} />
          <Route path="/website-builder" element={<WebsiteBuilder />} />
          <Route path="/post-maker" element={<PostCreator />} />
          <Route path="/email-campaign" element={<SimpleEmailUploader />} />
          <Route path="/agentify" element={<Agentify />} />
          <Route path="/analytics" element={<ResponseAnalytics />} />
          <Route path="/lead-finder" element={<LeadFinder />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;