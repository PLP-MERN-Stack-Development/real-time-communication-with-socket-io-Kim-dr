// App.jsx - Main application component

import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatLayout from './components/ChatLayout';
import { useSocket } from './hooks/useSocket';

/**
 * Main App Component
 * Manages authentication state and renders appropriate screen
 */
function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Socket connection
  const socketHook = useSocket();

  // Check for saved user session
  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Reconnect with saved username
        socketHook.connect(user.username, user.avatar);
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  /**
   * Handle user login
   * @param {string} username - User's chosen username
   * @param {string} avatar - Optional avatar URL
   */
  const handleLogin = (username, avatar = null) => {
    const user = {
      username,
      avatar,
      joinedAt: new Date().toISOString(),
    };
    
    // Save to localStorage
    localStorage.setItem('chatUser', JSON.stringify(user));
    
    // Update state
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Connect to socket
    socketHook.connect(username, avatar);
    
    // Request notification permission
    socketHook.requestNotificationPermission();
  };

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    // Disconnect socket
    socketHook.disconnect();
    
    // Clear storage
    localStorage.removeItem('chatUser');
    
    // Reset state
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      {!isAuthenticated ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatLayout
          currentUser={currentUser}
          socketHook={socketHook}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;