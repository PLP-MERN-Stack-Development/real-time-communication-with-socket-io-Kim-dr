// // server.js - Main server file for Socket.io chat application

// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const path = require('path');

// // Load environment variables
// dotenv.config();

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || 'http://localhost:5173',
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
// });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // Store connected users and messages
// const users = {};
// const messages = [];
// const typingUsers = {};

// // Socket.io connection handler
// io.on('connection', (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   // Handle user joining
//   socket.on('user_join', (username) => {
//     users[socket.id] = { username, id: socket.id };
//     io.emit('user_list', Object.values(users));
//     io.emit('user_joined', { username, id: socket.id });
//     console.log(`${username} joined the chat`);
//   });

//   // Handle chat messages
//   socket.on('send_message', (messageData) => {
//     const message = {
//       ...messageData,
//       id: Date.now(),
//       sender: users[socket.id]?.username || 'Anonymous',
//       senderId: socket.id,
//       timestamp: new Date().toISOString(),
//     };
    
//     messages.push(message);
    
//     // Limit stored messages to prevent memory issues
//     if (messages.length > 100) {
//       messages.shift();
//     }
    
//     io.emit('receive_message', message);
//   });

//   // Handle typing indicator
//   socket.on('typing', (isTyping) => {
//     if (users[socket.id]) {
//       const username = users[socket.id].username;
      
//       if (isTyping) {
//         typingUsers[socket.id] = username;
//       } else {
//         delete typingUsers[socket.id];
//       }
      
//       io.emit('typing_users', Object.values(typingUsers));
//     }
//   });

//   // Handle private messages
//   socket.on('private_message', ({ to, message }) => {
//     const messageData = {
//       id: Date.now(),
//       sender: users[socket.id]?.username || 'Anonymous',
//       senderId: socket.id,
//       message,
//       timestamp: new Date().toISOString(),
//       isPrivate: true,
//     };
    
//     socket.to(to).emit('private_message', messageData);
//     socket.emit('private_message', messageData);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     if (users[socket.id]) {
//       const { username } = users[socket.id];
//       io.emit('user_left', { username, id: socket.id });
//       console.log(`${username} left the chat`);
//     }
    
//     delete users[socket.id];
//     delete typingUsers[socket.id];
    
//     io.emit('user_list', Object.values(users));
//     io.emit('typing_users', Object.values(typingUsers));
//   });
// });

// // API routes
// app.get('/api/messages', (req, res) => {
//   res.json(messages);
// });

// app.get('/api/users', (req, res) => {
//   res.json(Object.values(users));
// });

// // Root route
// app.get('/', (req, res) => {
//   res.send('Socket.io Chat Server is running');
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// module.exports = { app, server, io }; 


// server.js - Enhanced Socket.io chat application server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e7, // 10MB for file uploads
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5242880 }, // 5MB default
});

// Data stores
const users = new Map(); // socketId -> user data
const rooms = new Map(); // roomId -> room data
const messages = new Map(); // roomId -> messages array
const typingUsers = new Map(); // roomId -> Set of typing users
const readReceipts = new Map(); // messageId -> Set of userIds who read it

// Initialize default room
const DEFAULT_ROOM = 'global';
rooms.set(DEFAULT_ROOM, {
  id: DEFAULT_ROOM,
  name: 'Global Chat',
  createdAt: new Date().toISOString(),
});
messages.set(DEFAULT_ROOM, []);
typingUsers.set(DEFAULT_ROOM, new Set());

// Helper function to get user info
const getUserInfo = (socketId) => {
  return users.get(socketId) || null;
};

// Helper function to broadcast to room
const broadcastToRoom = (roomId, event, data, excludeSocketId = null) => {
  if (excludeSocketId) {
    io.to(roomId).except(excludeSocketId).emit(event, data);
  } else {
    io.to(roomId).emit(event, data);
  }
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', ({ username, avatar = null }) => {
    // Store user data
    users.set(socket.id, {
      id: socket.id,
      username,
      avatar,
      joinedAt: new Date().toISOString(),
      currentRoom: DEFAULT_ROOM,
      status: 'online',
    });

    // Join default room
    socket.join(DEFAULT_ROOM);

    // Send updated user list to all clients
    const userList = Array.from(users.values());
    io.emit('user_list', userList);

    // Notify room about new user
    broadcastToRoom(DEFAULT_ROOM, 'user_joined', {
      user: users.get(socket.id),
      room: DEFAULT_ROOM,
    });

    // Send room list to the joining user
    const roomList = Array.from(rooms.values());
    socket.emit('room_list', roomList);

    // Send message history for default room
    const roomMessages = messages.get(DEFAULT_ROOM) || [];
    socket.emit('message_history', {
      room: DEFAULT_ROOM,
      messages: roomMessages.slice(-50), // Send last 50 messages
    });

    console.log(`👤 ${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', ({ message, room = DEFAULT_ROOM }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const messageData = {
      id: uuidv4(),
      sender: user.username,
      senderId: socket.id,
      message,
      room,
      timestamp: new Date().toISOString(),
      type: 'text',
      reactions: {},
      readBy: [], // Initialize empty readBy array
    };

    // Store message
    if (!messages.has(room)) {
      messages.set(room, []);
    }
    const roomMessages = messages.get(room);
    roomMessages.push(messageData);

    // Limit stored messages to prevent memory issues (keep last 100)
    if (roomMessages.length > 100) {
      roomMessages.shift();
    }

    // Broadcast to room
    broadcastToRoom(room, 'receive_message', messageData);
    
    console.log(`💬 ${user.username} sent message in ${room}`);
  });

  // Handle typing indicator
  socket.on('typing', ({ isTyping, room = DEFAULT_ROOM }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    if (!typingUsers.has(room)) {
      typingUsers.set(room, new Set());
    }

    const roomTyping = typingUsers.get(room);

    if (isTyping) {
      roomTyping.add(user.username);
    } else {
      roomTyping.delete(user.username);
    }

    // Broadcast typing status to room (excluding sender)
    broadcastToRoom(
      room,
      'typing_users',
      { users: Array.from(roomTyping), room },
      socket.id
    );
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const sender = getUserInfo(socket.id);
    if (!sender) return;

    const messageData = {
      id: uuidv4(),
      sender: sender.username,
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      type: 'private',
      isPrivate: true,
    };

    // Send to recipient
    socket.to(to).emit('private_message', messageData);
    // Send confirmation to sender
    socket.emit('private_message', { ...messageData, isSent: true });

    console.log(`🔒 Private message from ${sender.username} to ${to}`);
  });

  // Handle message reactions
  socket.on('add_reaction', ({ messageId, reaction, room = DEFAULT_ROOM }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const roomMessages = messages.get(room);
    if (!roomMessages) return;

    const message = roomMessages.find((m) => m.id === messageId);
    if (!message) return;

    // Initialize reactions object if not exists
    if (!message.reactions[reaction]) {
      message.reactions[reaction] = [];
    }

    // Toggle reaction
    const userIndex = message.reactions[reaction].indexOf(user.username);
    if (userIndex > -1) {
      message.reactions[reaction].splice(userIndex, 1);
    } else {
      message.reactions[reaction].push(user.username);
    }

    // Broadcast updated message
    broadcastToRoom(room, 'message_updated', message);
  });

  // Handle read receipts
  socket.on('mark_as_read', ({ messageId, room = DEFAULT_ROOM }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    if (!readReceipts.has(messageId)) {
      readReceipts.set(messageId, new Set());
    }

    readReceipts.get(messageId).add(socket.id);

    // Broadcast read receipt
    broadcastToRoom(room, 'read_receipt', {
      messageId,
      userId: socket.id,
      username: user.username,
    });
  });

  // Handle joining a room
  socket.on('join_room', ({ roomId }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    // Leave current room
    if (user.currentRoom) {
      socket.leave(user.currentRoom);
    }

    // Join new room
    socket.join(roomId);
    user.currentRoom = roomId;

    // Send message history for the room
    const roomMessages = messages.get(roomId) || [];
    socket.emit('message_history', {
      room: roomId,
      messages: roomMessages.slice(-50),
    });

    // Notify room
    broadcastToRoom(roomId, 'user_joined_room', {
      user,
      room: roomId,
    });

    console.log(`🚪 ${user.username} joined room ${roomId}`);
  });

  // Handle creating a room
  socket.on('create_room', ({ name, isPrivate = false }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const roomId = uuidv4();
    const room = {
      id: roomId,
      name,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      isPrivate,
    };

    rooms.set(roomId, room);
    messages.set(roomId, []);
    typingUsers.set(roomId, new Set());

    // Send updated room list to all users
    const roomList = Array.from(rooms.values());
    io.emit('room_list', roomList);

    // Auto-join creator to the room
    socket.join(roomId);
    user.currentRoom = roomId;

    socket.emit('room_created', room);
    console.log(`🏠 Room created: ${name} by ${user.username}`);
  });

  // Handle file upload notification
  socket.on('file_uploaded', ({ fileData, room = DEFAULT_ROOM }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const messageData = {
      id: uuidv4(),
      sender: user.username,
      senderId: socket.id,
      room,
      timestamp: new Date().toISOString(),
      type: 'file',
      fileData,
      reactions: {},
    };

    // Store message
    if (!messages.has(room)) {
      messages.set(room, []);
    }
    messages.get(room).push(messageData);

    // Broadcast to room
    broadcastToRoom(room, 'receive_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = getUserInfo(socket.id);
    
    if (user) {
      // Notify all rooms
      broadcastToRoom(user.currentRoom, 'user_left', {
        user,
        room: user.currentRoom,
      });

      console.log(`❌ ${user.username} disconnected`);

      // Remove from typing users
      typingUsers.forEach((roomTyping) => {
        roomTyping.delete(user.username);
      });

      // Remove user
      users.delete(socket.id);

      // Send updated user list
      const userList = Array.from(users.values());
      io.emit('user_list', userList);
    }
  });

  // Handle status updates
  socket.on('update_status', ({ status }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    user.status = status;
    
    // Broadcast status update
    io.emit('user_status_changed', {
      userId: socket.id,
      username: user.username,
      status,
    });
  });
});

// API Routes

// Get message history for a room
app.get('/api/messages/:roomId', (req, res) => {
  const { roomId } = req.params;
  const roomMessages = messages.get(roomId) || [];
  res.json(roomMessages);
});

// Get all users
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json(userList);
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values());
  res.json(roomList);
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileData = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/uploads/${req.file.filename}`,
  };

  res.json(fileData);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running 🚀');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    rooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

module.exports = { app, server, io };