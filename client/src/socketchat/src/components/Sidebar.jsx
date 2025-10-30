// Sidebar.jsx - Navigation sidebar with rooms and channels

import { useState } from 'react';
import { Hash, Plus, LogOut, MessageCircle, X } from 'lucide-react';

/**
 * Sidebar Component
 * Displays available chat rooms and allows room creation
 * 
 * @param {Object} currentUser - Current user information
 * @param {Array} rooms - List of available rooms
 * @param {string} currentRoom - Currently active room ID
 * @param {Function} onJoinRoom - Callback to join a room
 * @param {Function} onCreateRoom - Callback to create a new room
 * @param {Function} onLogout - Callback to logout
 * @param {Function} onClose - Callback to close sidebar (mobile)
 */
function Sidebar({
  currentUser,
  rooms,
  currentRoom,
  onJoinRoom,
  onCreateRoom,
  onLogout,
  onClose,
}) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  /**
   * Handle room creation
   */
  const handleCreateRoom = (e) => {
    e.preventDefault();
    
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim(), isPrivate);
      setNewRoomName('');
      setIsPrivate(false);
      setShowCreateRoom(false);
    }
  };

  /**
   * Handle joining a room
   */
  const handleJoinRoom = (roomId) => {
    onJoinRoom(roomId);
    onClose(); // Close sidebar on mobile after joining
  };

  return (
    <div className="h-full bg-gray-800 flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">ChatIO</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-700 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* User info */}
        <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-lg">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">
            {currentUser.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.username}</p>
            <p className="text-xs text-gray-400">Online</p>
          </div>
        </div>
      </div>

      {/* Rooms list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase">Rooms</h3>
            <button
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              className="p-1 hover:bg-gray-700 rounded transition"
              title="Create room"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create room form */}
          {showCreateRoom && (
            <form onSubmit={handleCreateRoom} className="mb-4 p-3 bg-gray-700 rounded-lg">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                autoFocus
              />
              <label className="flex items-center gap-2 mb-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded"
                />
                <span>Private room</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-purple-600 rounded text-sm font-medium hover:bg-purple-700 transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                    setIsPrivate(false);
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-600 rounded text-sm font-medium hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Room list */}
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoinRoom(room.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition
                  ${
                    currentRoom === room.id
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }
                `}
              >
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{room.name}</span>
                {room.isPrivate && (
                  <span className="text-xs bg-gray-900 px-2 py-0.5 rounded">
                    Private
                  </span>
                )}
              </button>
            ))}
          </div>

          {rooms.length === 0 && !showCreateRoom && (
            <p className="text-sm text-gray-500 text-center py-4">
              No rooms available. Create one!
            </p>
          )}
        </div>
      </div>

      {/* Footer - Logout button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;