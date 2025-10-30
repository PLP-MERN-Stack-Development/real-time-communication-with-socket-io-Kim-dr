// ChatLayout.jsx - Main chat interface layout

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import UserList from './UserList';
import { Menu, X } from 'lucide-react';

/**
 * ChatLayout Component
 * Main layout container for the chat application
 * Manages sidebar and user list visibility on mobile
 * 
 * @param {Object} currentUser - Current logged-in user
 * @param {Object} socketHook - Socket.io hook with all methods
 * @param {Function} onLogout - Logout callback
 */
function ChatLayout({ currentUser, socketHook, onLogout }) {
  // Mobile menu state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      {/* Mobile menu button - Sidebar */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 transition"
      >
        {showSidebar ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar - Rooms and channels */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 lg:w-72
          transform transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          currentUser={currentUser}
          rooms={socketHook.rooms}
          currentRoom={socketHook.currentRoom}
          onJoinRoom={socketHook.joinRoom}
          onCreateRoom={socketHook.createRoom}
          onLogout={onLogout}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea
          currentUser={currentUser}
          messages={socketHook.messages}
          typingUsers={socketHook.typingUsers}
          isConnected={socketHook.isConnected}
          currentRoom={socketHook.currentRoom}
          rooms={socketHook.rooms}
          onSendMessage={socketHook.sendMessage}
          onSetTyping={socketHook.setTyping}
          onAddReaction={socketHook.addReaction}
          onUploadFile={socketHook.uploadFile}
          onToggleUserList={() => setShowUserList(!showUserList)}
        />
      </div>

      {/* User list sidebar */}
      <div
        className={`
          fixed lg:relative inset-y-0 right-0 z-40
          w-64 lg:w-72
          transform transition-transform duration-300 ease-in-out
          ${showUserList ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <UserList
          users={socketHook.users}
          currentUser={currentUser}
          onSendPrivateMessage={socketHook.sendPrivateMessage}
          onClose={() => setShowUserList(false)}
        />
      </div>

      {/* Overlay for mobile user list */}
      {showUserList && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowUserList(false)}
        />
      )}

      {/* Connection status indicator */}
      {!socketHook.isConnected && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Reconnecting...</span>
          </div>
        </div>
      )}

      {/* Unread count badge */}
      {socketHook.unreadCount > 0 && document.hidden && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full shadow-lg">
            <span className="text-sm font-bold">{socketHook.unreadCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatLayout;