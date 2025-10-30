import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Users, Hash, Smile, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import Message from './Message';
import EmojiPicker from 'emoji-picker-react';

/**
 * ChatArea Component
 * Displays messages and message input with search functionality
 * 
 * @param {Object} currentUser - Current user information
 * @param {Array} messages - List of messages
 * @param {Array} typingUsers - Users currently typing
 * @param {boolean} isConnected - Socket connection status
 * @param {string} currentRoom - Current room ID
 * @param {Array} rooms - List of all rooms
 * @param {Function} onSendMessage - Send message callback
 * @param {Function} onSetTyping - Set typing status callback
 * @param {Function} onAddReaction - Add reaction callback
 * @param {Function} onMarkAsRead - Mark message as read callback
 * @param {Function} onUploadFile - Upload file callback
 * @param {Function} onToggleUserList - Toggle user list visibility
 */
function ChatArea({
  currentUser,
  messages,
  typingUsers,
  isConnected,
  currentRoom,
  rooms,
  onSendMessage,
  onSetTyping,
  onAddReaction,
  onMarkAsRead,
  onUploadFile,
  onToggleUserList,
}) {
  // Message input state
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const markedAsReadRef = useRef(new Set());
  const searchInputRef = useRef(null);

  // Get current room name
  const currentRoomName = rooms.find((r) => r.id === currentRoom)?.name || 'Chat';

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Scroll to specific message
   */
  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      messageElement.classList.add('search-highlight');
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        messageElement.classList.remove('search-highlight');
      }, 2000);
    }
  };

// Auto-scroll when new messages arrive and mark as read
useEffect(() => {
  // Only auto-scroll if not searching
  if (!showSearch || searchResults.length === 0) {
    scrollToBottom();
  }
  
  // Mark new messages as read (only if not sent by current user and tab is visible)
  if (!document.hidden) {
    messages.forEach((msg) => {
      // Skip if already marked, is own message, or is system message
      if (
        markedAsReadRef.current.has(msg.id) ||
        msg.senderId === currentUser.id ||
        msg.sender === currentUser.username ||
        msg.type === 'system'
      ) {
        return;
      }
      
      // ✅ FIXED: Only call onMarkAsRead if it's actually a function
      if (typeof onMarkAsRead === 'function') {
        onMarkAsRead(msg.id);
        markedAsReadRef.current.add(msg.id);
      }
    });
  }
}, [messages, currentUser, onMarkAsRead, showSearch, searchResults]);

  /**
   * Handle search query change and perform search
   */
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    
    // Search through messages
    const results = messages.filter((msg) => {
      // Skip system messages
      if (msg.type === 'system') return false;
      
      const searchLower = query.toLowerCase();
      
      // Search in message text
      if (msg.message && msg.message.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in sender name
      if (msg.sender && msg.sender.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in file names
      if (msg.fileData?.originalName && 
          msg.fileData.originalName.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    // Scroll to first result
    if (results.length > 0) {
      scrollToMessage(results[0].id);
    }
  };

  /**
   * Navigate to previous search result
   */
  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;
    
    const newIndex = currentSearchIndex > 0 
      ? currentSearchIndex - 1 
      : searchResults.length - 1;
    
    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex].id);
  };

  /**
   * Navigate to next search result
   */
  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    
    const newIndex = currentSearchIndex < searchResults.length - 1 
      ? currentSearchIndex + 1 
      : 0;
    
    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex].id);
  };

  /**
   * Open search and focus input
   */
  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  /**
   * Close search and reset
   */
  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openSearch();
      }
      
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        closeSearch();
      }
      
      // Navigate results with Enter
      if (showSearch && searchResults.length > 0) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          goToNextResult();
        } else if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          goToPreviousResult();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchResults, currentSearchIndex]);

  /**
   * Handle message input change with typing indicator
   */
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Send typing indicator
    if (value.trim()) {
      onSetTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        onSetTyping(false);
      }, 3000);
    } else {
      onSetTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  /**
   * Handle sending message
   */
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (message.trim() && isConnected) {
      onSendMessage(message.trim());
      setMessage('');
      onSetTyping(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Focus back on input
      messageInputRef.current?.focus();
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    e.target.value = '';
  };

  /**
   * Handle emoji selection
   */
  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  /**
   * Handle key press (Ctrl+Enter to send)
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold">{currentRoomName}</h2>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            onClick={() => showSearch ? closeSearch() : openSearch()}
            className={`p-2 rounded-lg transition ${
              showSearch ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
            title="Search messages (Ctrl+F)"
          >
            <Search className="w-5 h-5" />
          </button>
          
          {/* User list toggle (mobile only) */}
          <button
            onClick={onToggleUserList}
            className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition text-gray-300"
            title="Toggle user list"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="p-3 border-b border-gray-700 bg-gray-800 animate-slide-in">
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search messages, users, or files..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            
            {/* Search results navigation */}
            {searchQuery && (
              <div className="flex items-center gap-2">
                {searchResults.length > 0 ? (
                  <>
                    <span className="text-sm text-gray-400 whitespace-nowrap">
                      {currentSearchIndex + 1} / {searchResults.length}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={goToPreviousResult}
                        className="p-1.5 hover:bg-gray-700 rounded transition text-gray-300"
                        title="Previous (Shift+Enter)"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToNextResult}
                        className="p-1.5 hover:bg-gray-700 rounded transition text-gray-300"
                        title="Next (Enter)"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    No results
                  </span>
                )}
              </div>
            )}
            
            {/* Close search */}
            <button
              onClick={closeSearch}
              className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-300"
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Be the first to send a message!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              id={`message-${msg.id}`}
              className="transition-all duration-300"
            >
              <Message
                message={msg}
                currentUser={currentUser}
                onAddReaction={onAddReaction}
              />
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing`
                : `${typingUsers.slice(0, 2).join(', ')} ${
                    typingUsers.length > 2 ? `and ${typingUsers.length - 2} others are` : 'are'
                  } typing`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Upload progress bar */}
      {isUploading && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Uploading...</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span>{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isUploading}
            className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Emoji picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={!isConnected}
              className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 z-20">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    searchDisabled
                    skinTonesDisabled
                    height={400}
                    width={350}
                  />
                </div>
              </>
            )}
          </div>

          {/* Message input */}
          <div className="flex-1">
            <textarea
              ref={messageInputRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={
                isConnected
                  ? 'Type a message... (Ctrl+Enter to send)'
                  : 'Connecting...'
              }
              disabled={!isConnected}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows="1"
              style={{
                minHeight: '42px',
                maxHeight: '120px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!isConnected || !message.trim() || isUploading}
            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatArea;