// UserList.jsx - Online users sidebar

import { useState } from 'react';
import { Users, X, MessageCircle, Circle } from 'lucide-react';

/**
 * UserList Component
 * Displays online users and allows private messaging
 * 
 * @param {Array} users - List of online users
 * @param {Object} currentUser - Current user information
 * @param {Function} onSendPrivateMessage - Send private message callback
 * @param {Function} onClose - Close sidebar callback (mobile)
 */
function UserList({ users, currentUser, onSendPrivateMessage, onClose }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessage, setPrivateMessage] = useState('');

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'away':
        return 'text-yellow-500';
      case 'busy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Get status text
   */
  const getStatusText = (status) => {
    return status || 'online';
  };

  /**
   * Handle sending private message
   */
  const handleSendPrivateMessage = (e) => {
    e.preventDefault();
    
    if (privateMessage.trim() && selectedUser) {
      onSendPrivateMessage(selectedUser.id, privateMessage.trim());
      setPrivateMessage('');
      setSelectedUser(null);
    }
  };

  /**
   * Sort users: current user first, then alphabetically
   */
  const sortedUsers = [...users].sort((a, b) => {
    if (a.username === currentUser.username) return -1;
    if (b.username === currentUser.username) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <div className="h-full bg-gray-800 flex flex-col border-l border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">
              Online Users ({users.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-700 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedUsers.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No users online</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedUsers.map((user) => {
              const isCurrentUser = user.username === currentUser.username;
              
              return (
                <div
                  key={user.id}
                  className={`
                    p-3 rounded-lg border transition
                    ${isCurrentUser 
                      ? 'bg-purple-900 bg-opacity-30 border-purple-700' 
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                          ${isCurrentUser ? 'bg-purple-600' : 'bg-blue-600'}
                        `}
                      >
                        {user.username[0].toUpperCase()}
                      </div>
                      {/* Status indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <Circle
                          className={`w-3 h-3 fill-current ${getStatusColor(user.status)}`}
                        />
                      </div>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {user.username}
                          {isCurrentUser && (
                            <span className="text-xs text-purple-400 ml-1">(You)</span>
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 capitalize">
                        {getStatusText(user.status)}
                      </p>
                    </div>

                    {/* Private message button */}
                    {!isCurrentUser && (
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 hover:bg-gray-800 rounded transition"
                        title="Send private message"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Private message modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="font-semibold">
                Send private message to {selectedUser.username}
              </h3>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setPrivateMessage('');
                }}
                className="p-1 hover:bg-gray-700 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSendPrivateMessage} className="p-4">
              <textarea
                value={privateMessage}
                onChange={(e) => setPrivateMessage(e.target.value)}
                placeholder="Type your private message..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows="4"
                autoFocus
              />
              
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={!privateMessage.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setPrivateMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserList;