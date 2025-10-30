// Message.jsx - Individual message component

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, Heart, Laugh, FileText, Image as ImageIcon, File, CheckCheck, Check } from 'lucide-react';

/**
 * Message Component
 * Displays a single message with reactions and file attachments
 * 
 * @param {Object} message - Message data
 * @param {Object} currentUser - Current user information
 * @param {Function} onAddReaction - Callback to add reaction
 */
function Message({ message, currentUser, onAddReaction }) {
  const [showReactions, setShowReactions] = useState(false);
  
  // Check if message is from current user
  const isOwnMessage = message.senderId === currentUser.id || message.sender === currentUser.username;
  
  // Check if it's a system message
  const isSystemMessage = message.type === 'system';
  
  // Available reactions
  const availableReactions = [
    { emoji: '👍', name: 'thumbsup' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '😂', name: 'laugh' },
    { emoji: '🎉', name: 'party' },
    { emoji: '🔥', name: 'fire' },
  ];

  /**
   * Handle adding a reaction
   */
  const handleAddReaction = (reactionName) => {
    onAddReaction(message.id, reactionName);
    setShowReactions(false);
  };

  /**
   * Format timestamp
   */
  const getFormattedTime = () => {
    try {
      return formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  /**
   * Render file attachment
   */
  const renderFileAttachment = () => {
    if (!message.fileData) return null;

    const { filename, originalName, mimetype, url, size } = message.fileData;
    const isImage = mimetype?.startsWith('image/');
    
    // Format file size
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
      <div className="mt-2">
        {isImage ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-sm"
          >
            <img
              src={url}
              alt={originalName}
              className="rounded-lg max-h-64 object-contain border border-gray-600 hover:opacity-90 transition"
            />
          </a>
        ) : (
          <a
            href={url}
            download={originalName}
            className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition border border-gray-600 max-w-sm"
          >
            <div className="flex-shrink-0 p-2 bg-gray-800 rounded">
              {mimetype?.includes('pdf') ? (
                <FileText className="w-6 h-6 text-red-400" />
              ) : (
                <File className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{originalName}</p>
              <p className="text-xs text-gray-400">{formatSize(size)}</p>
            </div>
          </a>
        )}
      </div>
    );
  };

  /**
   * Render reactions
   */
  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(message.reactions).map(([reactionName, users]) => {
          if (users.length === 0) return null;
          
          const reactionEmoji = availableReactions.find(r => r.name === reactionName)?.emoji || reactionName;
          const hasReacted = users.includes(currentUser.username);
          
          return (
            <button
              key={reactionName}
              onClick={() => handleAddReaction(reactionName)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs
                ${hasReacted ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}
                transition
              `}
              title={users.join(', ')}
            >
              <span>{reactionEmoji}</span>
              <span className="font-medium">{users.length}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // System message
  if (isSystemMessage) {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-400 border border-gray-700">
          {message.message}
        </div>
      </div>
    );
  }

  // Private message indicator
  const isPrivateMessage = message.isPrivate;

  return (
    <div
      className={`flex gap-3 message-enter ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
            isOwnMessage ? 'bg-purple-600' : 'bg-blue-600'
          }`}
        >
          {message.sender[0].toUpperCase()}
        </div>
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name and timestamp */}
        <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-sm font-medium">
            {isOwnMessage ? 'You' : message.sender}
          </span>
          <span className="text-xs text-gray-500">{getFormattedTime()}</span>
          {isPrivateMessage && (
            <span className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded">
              Private
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={`
            relative group
            ${isOwnMessage 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-100'
            }
            rounded-2xl px-4 py-2
            ${isOwnMessage ? 'rounded-tr-sm' : 'rounded-tl-sm'}
          `}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {/* Text message */}
          {message.message && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message}
            </p>
          )}

          {/* File attachment */}
          {renderFileAttachment()}

          {/* Reaction picker (on hover) */}
          {showReactions && (
            <div
              className={`
                absolute ${isOwnMessage ? 'right-0' : 'left-0'} -bottom-8
                flex gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-1
                shadow-lg z-10
              `}
            >
              {availableReactions.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={() => handleAddReaction(reaction.name)}
                  className="hover:scale-125 transition-transform text-lg"
                  title={reaction.name}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {renderReactions()}
      </div>
    </div>
  );
}

export default Message;