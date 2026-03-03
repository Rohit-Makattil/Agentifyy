import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Background from './Background';
import LoginModal from './LoginModal';

function MainLayout() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        // Sync state if localStorage changes in other tabs
        const handleStorage = () => {
            const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (loggedIn !== isLoggedIn) setIsLoggedIn(loggedIn);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [isLoggedIn]);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        setIsLoginModalOpen(false);
        // Refresh to update states across components
        window.location.reload();
    };

    return (
        <div className="app-container">
            <Background />
            <Navbar onLoginClick={() => setIsLoginModalOpen(true)} isLoggedIn={isLoggedIn} />

            <main className="main-content">
                <Outlet context={{ isLoggedIn, setIsLoginModalOpen }} />
            </main>

            <Footer />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}

export default MainLayout;
