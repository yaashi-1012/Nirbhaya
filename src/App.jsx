import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Community from './pages/Community';
import HealthHub from './pages/HealthHub';
import Finance from './pages/Finance';
import Stories from './pages/Stories';
import StoryDetail from './pages/StoryDetail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import ProfileCreation from './pages/ProfileCreation';
import CirclesList from './pages/CirclesList';
import CircleDashboard from './pages/CircleDashboard';
import ChatPage from './pages/ChatPage';
import Loader from './components/Loader';
import SaheliAI from './components/SaheliAI/SaheliAI';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setProfileCompleted(userDoc.data().profileCompleted || false);
          } else {
            setProfileCompleted(false);
          }
        } catch (error) {
          if (error.code === 'unavailable') {
            console.warn("Firebase client is offline. Defaulting profile to incomplete to maintain safety guard.");
          } else {
            console.error("Error fetching user profile:", error);
          }
          setProfileCompleted(false);
        }
      } else {
        setIsAuthenticated(false);
        setProfileCompleted(false);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // Profile check will happen via the onAuthStateChanged listener mostly, 
    // but just to be safe during immediate signups:
    setIsInitializing(true);
    setTimeout(() => setIsInitializing(false), 1000);
  };

  if (isInitializing) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf8fa' }}><span style={{ color: '#8b5cf6' }}>Loading...</span></div>;
  }

  if (!isAuthenticated) {
    return <Loader onComplete={handleLoginSuccess} />;
  }

  // If user is authenticated but profile is NOT complete, FORCE them to the creation route.
  if (isAuthenticated && !profileCompleted && window.location.pathname !== '/create-profile') {
    window.history.replaceState(null, '', '/create-profile');
  }

  return (
    <Router>
      <div className="app-container">
        {/* Only show sidebar/header if profile is completed */}
        {profileCompleted && <Sidebar />}
        <main className={`main-content ${!profileCompleted ? 'full-width' : ''}`}>
          {profileCompleted && <Header />}
          <Routes>
            <Route path="/" element={<Navigate to={profileCompleted ? "/community" : "/create-profile"} replace />} />

            {/* The Onboarding Route */}
            <Route path="/create-profile" element={
              !profileCompleted ? <ProfileCreation onComplete={(path) => {
                setProfileCompleted(true);
                if (path) {
                  window.location.href = path;
                }
              }} /> : <Navigate to="/community" replace />
            } />

            {/* Protected Core Routes */}
            <Route path="/community" element={profileCompleted ? <Community /> : <Navigate to="/create-profile" replace />} />
            <Route path="/circles" element={profileCompleted ? <CirclesList /> : <Navigate to="/create-profile" replace />} />
            <Route path="/circles/:circleId" element={profileCompleted ? <CircleDashboard /> : <Navigate to="/create-profile" replace />} />
            <Route path="/circles/:circleId/chat" element={profileCompleted ? <ChatPage /> : <Navigate to="/create-profile" replace />} />
            <Route path="/health" element={profileCompleted ? <HealthHub /> : <Navigate to="/create-profile" replace />} />
            <Route path="/finance" element={profileCompleted ? <Finance /> : <Navigate to="/create-profile" replace />} />
            <Route path="/stories" element={profileCompleted ? <Stories /> : <Navigate to="/create-profile" replace />} />
            <Route path="/stories/:storyId" element={profileCompleted ? <StoryDetail /> : <Navigate to="/create-profile" replace />} />
            <Route path="/profile" element={profileCompleted ? <Profile /> : <Navigate to="/create-profile" replace />} />
            <Route path="/user/:userId" element={profileCompleted ? <UserProfile /> : <Navigate to="/create-profile" replace />} />
          </Routes>

          {/* Global Saheli AI Chatbot */}
          {isAuthenticated && profileCompleted && <SaheliAI />}
        </main>
      </div>
    </Router>
  );
}

export default App;
