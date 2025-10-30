// socket.js - Enhanced Socket.io client setup with reconnection and error handling
import { io } from 'socket.io-client';
import { useEffect, useState, useRef, useCallback } from 'react';

// Socket.io connection URL with fallback
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance with enhanced configuration
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

// Custom hook for using socket.io with enhanced features
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [user, setUser] = useState(null);
  
  const messagesRef = useRef(messages);
  const privateMessagesRef = useRef(privateMessages);

  // Update refs when state changes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    privateMessagesRef.current = privateMessages;
  }, [privateMessages]);

  // Connect to socket server with user data
  const connect = useCallback((userData) => {
    setConnectionError(null);
    socket.connect();
    
    if (userData) {
      socket.emit('user_join', userData);
      setUser(userData);
    }
  }, []);

  // Disconnect from socket server
  const disconnect = useCallback(() => {
    socket.disconnect();
    setUser(null);
  }, []);

  // Send a message with delivery callback
  const sendMessage = useCallback((message, room = currentRoom) => {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('send_message', { message, room }, (response) => {
        if (response && response.status === 'delivered') {
          resolve(response);
        } else {
          reject(new Error('Message delivery failed'));
        }
      });
    });
  }, [currentRoom]);

  // Send a private message
  const sendPrivateMessage = useCallback((toUserId, message) => {
    socket.emit('private_message', { toUserId, message });
  }, []);

  // Set typing status with debouncing
  const typingTimeoutRef = useRef(null);
  
  const setTyping = useCallback((isTyping) => {
    if (isTyping) {
      socket.emit('typing_start');
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop');
      }, 3000);
    } else {
      socket.emit('typing_stop');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, []);

  // Join a room
  const joinRoom = useCallback((roomName) => {
    socket.emit('join_room', roomName);
  }, []);

  // Add reaction to message
  const addReaction = useCallback((messageId, reaction) => {
    socket.emit('message_reaction', { messageId, reaction });
  }, []);

  // Socket event listeners with enhanced error handling
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Connected to server');
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      console.log('Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
      }
    };

    const onConnectError = (error) => {
      setConnectionError(error.message);
      console.error('Connection error:', error);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages(prev => [...prev, message]);
    };

    const onPrivateMessageReceived = (message) => {
      setPrivateMessages(prev => [...prev, message]);
    };

    const onMessageDelivered = ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, delivered: true } : msg
      ));
    };

    const onMessageUpdated = (updatedMessage) => {
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    };

    // User and room events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (data) => {
      // Add system message for user join
      const systemMessage = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        system: true,
        message: data.message,
        timestamp: data.timestamp,
        username: data.username
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    const onUserLeft = (data) => {
      // Add system message for user leave
      const systemMessage = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        system: true,
        message: data.message,
        timestamp: new Date().toISOString(),
        username: data.username
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    const onUserJoinedRoom = (data) => {
      // System message for room join
      if (data.username !== user?.username) {
        const systemMessage = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          system: true,
          message: data.message,
          timestamp: new Date().toISOString(),
          username: data.username
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    };

    const onUserLeftRoom = (data) => {
      // System message for room leave
      const systemMessage = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        system: true,
        message: data.message,
        timestamp: new Date().toISOString(),
        username: data.username
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    // Room events
    const onRoomList = (roomList) => {
      setRooms(roomList);
    };

    const onRoomMessages = (roomMessages) => {
      setMessages(roomMessages);
    };

    const onRoomJoined = (data) => {
      setCurrentRoom(data.room);
      setTypingUsers([]); // Clear typing users when changing rooms
    };

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message_received', onPrivateMessageReceived);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('message_updated', onMessageUpdated);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_joined_room', onUserJoinedRoom);
    socket.on('user_left_room', onUserLeftRoom);
    socket.on('room_list', onRoomList);
    socket.on('room_messages', onRoomMessages);
    socket.on('room_joined', onRoomJoined);
    socket.on('typing_users', onTypingUsers);

    // Clean up event listeners and timeouts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message_received', onPrivateMessageReceived);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('message_updated', onMessageUpdated);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_joined_room', onUserJoinedRoom);
      socket.off('user_left_room', onUserLeftRoom);
      socket.off('room_list', onRoomList);
      socket.off('room_messages', onRoomMessages);
      socket.off('room_joined', onRoomJoined);
      socket.off('typing_users', onTypingUsers);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user]);

  return {
    socket,
    isConnected,
    connectionError,
    lastMessage,
    messages,
    privateMessages,
    users,
    typingUsers,
    rooms,
    currentRoom,
    user,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    joinRoom,
    addReaction,
    clearMessages: () => setMessages([]),
    clearPrivateMessages: () => setPrivateMessages([]),
  };
};

export default socket;