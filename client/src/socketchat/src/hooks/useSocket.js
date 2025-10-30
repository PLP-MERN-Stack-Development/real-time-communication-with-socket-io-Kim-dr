// useSocket.js - Enhanced Socket.io hook with all features

import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../socket/socket';

/**
 * Custom hook for managing Socket.io connection and events
 * Provides real-time chat functionality with typing indicators,
 * user presence, rooms, and notifications
 */
export const useSocket = () => {
  // Connection state
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  // Chat data
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('global');
  
  // UI state
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  
  // Refs for typing timeout
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);
  
  /**
   * Connect to socket server with username
   * @param {string} username - User's display name
   * @param {string} avatar - Optional avatar URL
   */
  const connect = useCallback((username, avatar = null) => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('user_join', { username, avatar });
  }, []);

  /**
   * Disconnect from socket server
   */
  const disconnect = useCallback(() => {
    socket.disconnect();
  }, []);

  /**
   * Send a text message to a room
   * @param {string} message - Message content
   * @param {string} room - Room ID (defaults to current room)
   */
  const sendMessage = useCallback((message, room = null) => {
    const targetRoom = room || currentRoom;
    socket.emit('send_message', { message, room: targetRoom });
    
    // Stop typing indicator
    socket.emit('typing', { isTyping: false, room: targetRoom });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [currentRoom]);

  /**
   * Send a private message to a specific user
   * @param {string} to - Recipient's socket ID
   * @param {string} message - Message content
   */
  const sendPrivateMessage = useCallback((to, message) => {
    socket.emit('private_message', { to, message });
  }, []);

  /**
   * Set typing status with throttling (max once per 2 seconds)
   * @param {boolean} isTyping - Whether user is currently typing
   * @param {string} room - Room ID
   */
  const setTyping = useCallback((isTyping, room = null) => {
    const targetRoom = room || currentRoom;
    const now = Date.now();
    
    // Throttle typing events
    if (isTyping && now - lastTypingTimeRef.current < 2000) {
      return;
    }
    
    lastTypingTimeRef.current = now;
    socket.emit('typing', { isTyping, room: targetRoom });
    
    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { isTyping: false, room: targetRoom });
      }, 3000);
    }
  }, [currentRoom]);

  /**
   * Add reaction to a message
   * @param {string} messageId - Message ID
   * @param {string} reaction - Reaction emoji
   * @param {string} room - Room ID
   */
  const addReaction = useCallback((messageId, reaction, room = null) => {
    const targetRoom = room || currentRoom;
    socket.emit('add_reaction', { messageId, reaction, room: targetRoom });
  }, [currentRoom]);

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} room - Room ID
   */
  const markAsRead = useCallback((messageId, room = null) => {
    const targetRoom = room || currentRoom;
    socket.emit('mark_as_read', { messageId, room: targetRoom });
  }, [currentRoom]);

  /**
   * Join a chat room
   * @param {string} roomId - Room ID to join
   */
  const joinRoom = useCallback((roomId) => {
    socket.emit('join_room', { roomId });
    setCurrentRoom(roomId);
    setMessages([]); // Clear messages for new room
  }, []);

  /**
   * Create a new chat room
   * @param {string} name - Room name
   * @param {boolean} isPrivate - Whether room is private
   */
  const createRoom = useCallback((name, isPrivate = false) => {
    socket.emit('create_room', { name, isPrivate });
  }, []);

  /**
   * Upload a file
   * @param {File} file - File to upload
   * @param {string} room - Room ID
   */
  const uploadFile = useCallback(async (file, room = null) => {
    const targetRoom = room || currentRoom;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const fileData = await response.json();
      
      // Emit file upload event
      socket.emit('file_uploaded', { fileData, room: targetRoom });
      
      return fileData;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }, [currentRoom]);

  /**
   * Update user status (online, away, busy)
   * @param {string} status - New status
   */
  const updateStatus = useCallback((status) => {
    socket.emit('update_status', { status });
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  /**
   * Show browser notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   */
  const showNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
      });
    }
  }, []);

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(() => {
    // Using a data URI for a simple beep sound (no external file needed)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  // Socket event listeners
  useEffect(() => {
    /**
     * Connection events
     */
    const onConnect = () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
    };

    /**
     * Message events
     */
    const onReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      
      // Increment unread count if not focused
      if (document.hidden && message.type !== 'system') {
        setUnreadCount((prev) => prev + 1);
        showNotification('New Message', `${message.sender}: ${message.message || 'Sent a file'}`);
        playNotificationSound();
      }
    };

    const onPrivateMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      
      if (!message.isSent) {
        showNotification('Private Message', `${message.sender}: ${message.message}`);
        playNotificationSound();
      }
    };

    const onMessageUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    };

    const onMessageHistory = ({ room, messages: historyMessages }) => {
      if (room === currentRoom) {
        setMessages(historyMessages);
      }
    };

    /**
     * User events
     */
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = ({ user }) => {
      // Add system message
      const systemMessage = {
        id: Date.now(),
        type: 'system',
        message: `${user.username} joined the chat`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      
      showNotification('User Joined', `${user.username} joined the chat`);
    };

    const onUserLeft = ({ user }) => {
      // Add system message
      const systemMessage = {
        id: Date.now(),
        type: 'system',
        message: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    };

    const onUserStatusChanged = ({ username, status }) => {
      setUsers((prev) =>
        prev.map((user) =>
          user.username === username ? { ...user, status } : user
        )
      );
    };

    /**
     * Typing events
     */
    const onTypingUsers = ({ users: typingUsersList }) => {
      setTypingUsers(typingUsersList);
    };

    /**
     * Room events
     */
    const onRoomList = (roomList) => {
      setRooms(roomList);
    };

    const onRoomCreated = (room) => {
      setRooms((prev) => [...prev, room]);
      joinRoom(room.id);
    };

    /**
     * Read receipt events
     */
    const onReadReceipt = ({ messageId, username }) => {
      // Update the message to add the user to readBy array
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const readBy = msg.readBy || [];
            if (!readBy.includes(username)) {
              return { ...msg, readBy: [...readBy, username] };
            }
          }
          return msg;
        })
      );
    };

    // Register all event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('message_updated', onMessageUpdated);
    socket.on('message_history', onMessageHistory);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_status_changed', onUserStatusChanged);
    socket.on('typing_users', onTypingUsers);
    socket.on('room_list', onRoomList);
    socket.on('room_created', onRoomCreated);
    socket.on('read_receipt', onReadReceipt);

    // Clean up event listeners on unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('message_updated', onMessageUpdated);
      socket.off('message_history', onMessageHistory);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_status_changed', onUserStatusChanged);
      socket.off('typing_users', onTypingUsers);
      socket.off('room_list', onRoomList);
      socket.off('room_created', onRoomCreated);
      socket.off('read_receipt', onReadReceipt);
    };
  }, [currentRoom, showNotification, playNotificationSound, joinRoom]);

  // Reset unread count when window is focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setUnreadCount(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection
    socket,
    isConnected,
    connect,
    disconnect,
    
    // Messages
    messages,
    sendMessage,
    sendPrivateMessage,
    
    // Users and presence
    users,
    typingUsers,
    
    // Rooms
    rooms,
    currentRoom,
    joinRoom,
    createRoom,
    
    // Advanced features
    addReaction,
    markAsRead,
    setTyping,
    uploadFile,
    updateStatus,
    
    // Notifications
    unreadCount,
    notifications,
    requestNotificationPermission,
    showNotification,
    playNotificationSound,
  };
};

export default useSocket;