const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug: Log if .env is loaded (remove in production)
if (process.env.MONGODB_URI) {
  console.log('✅ .env file loaded successfully');
  console.log('📦 MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide password
} else {
  console.log('⚠️  Warning: MONGODB_URI not found in .env file');
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check (no DB required)
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus
  });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkedin-clone';

// MongoDB connection options (optimized for Atlas)
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds for Atlas
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
};

// Track MongoDB connection state
let isMongoConnected = false;

mongoose.connect(MONGODB_URI, mongooseOptions)
.then(() => {
  isMongoConnected = true;
  console.log('✅ Connected to MongoDB successfully!');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch((error) => {
  isMongoConnected = false;
  console.error('\n❌ MongoDB connection error:', error.message);
  
  // Provide specific help based on error type
  if (error.message.includes('IP') || error.message.includes('whitelist')) {
    console.error('\n🔒 IP ADDRESS NOT WHITELISTED');
    console.error('   → Go to: https://cloud.mongodb.com/');
    console.error('   → Navigate to: Network Access');
    console.error('   → Click "Add IP Address"');
    console.error('   → Click "Allow Access from Anywhere" (for development)');
    console.error('   → Wait 1-2 minutes for changes to apply\n');
  } else if (error.message.includes('authentication') || error.message.includes('password')) {
    console.error('\n🔑 AUTHENTICATION FAILED');
    console.error('   → Check username and password in connection string');
    console.error('   → Make sure password is URL-encoded (special chars: @=%40, #=%23)');
    console.error('   → Verify database user exists in Atlas → Database Access\n');
  } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
    console.error('\n🔐 SSL/TLS ERROR');
    console.error('   → Make sure connection string uses: mongodb+srv://');
    console.error('   → Check your Node.js version (should be 14+)');
    console.error('   → Try: npm install mongoose@latest\n');
  } else {
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check if MONGODB_URI is correct in .env file');
    console.error('   2. For MongoDB Atlas: Make sure your IP is whitelisted');
    console.error('   3. Verify your cluster is running (not paused)');
    console.error('   4. Check your internet connection\n');
  }
  
  console.error('⚠️  Server will start but database operations will fail until MongoDB is connected.\n');
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.log('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  isMongoConnected = true;
  console.log('✅ MongoDB reconnected!');
});

// Middleware to check MongoDB connection before processing API requests (except health check)
app.use('/api', (req, res, next) => {
  // Skip health check
  if (req.path === '/health') {
    return next();
  }
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database connection not available. Please check MongoDB connection.',
      error: 'MongoDB not connected'
    });
  }
  next();
});

// Routes (after MongoDB check middleware)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Store active users
const activeUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.name} (${socket.userId})`);
  
  // Add user to active users
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
  });

  // Emit online status to user's connections
  socket.broadcast.emit('user-online', { userId: socket.userId });

  // Join user's personal room
  socket.join(`user-${socket.userId}`);

  // Handle joining conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle sending a message
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, text, receiverId } = data;

      if (!text || !text.trim()) {
        return socket.emit('error', { message: 'Message text is required' });
      }

      // Verify conversation exists and user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(socket.userId)) {
        return socket.emit('error', { message: 'Conversation not found or access denied' });
      }

      // Create message
      const message = new Message({
        conversation: conversationId,
        sender: socket.userId,
        text: text.trim(),
      });

      await message.save();
      await message.populate('sender', 'name profilePicture');

      // Update conversation's last message
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Emit message to conversation room
      io.to(`conversation-${conversationId}`).emit('new-message', message);

      // Emit notification to receiver if they're not in the conversation room
      const receiverSocket = Array.from(activeUsers.values()).find(
        u => u.user._id.toString() === receiverId
      );
      
      if (receiverSocket) {
        io.to(`user-${receiverId}`).emit('message-notification', {
          conversationId,
          message,
          sender: socket.user,
        });
      }

      console.log(`Message sent in conversation ${conversationId} by ${socket.user.name}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, isTyping } = data;
    socket.to(`conversation-${conversationId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.name,
      isTyping,
    });
  });

  // Handle message read
  socket.on('mark-read', async (data) => {
    try {
      const { conversationId } = data;
      const conversation = await Conversation.findById(conversationId);

      if (!conversation || !conversation.participants.includes(socket.userId)) {
        return;
      }

      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: socket.userId },
          read: false,
        },
        {
          read: true,
          readAt: new Date(),
        }
      );

      // Notify sender that messages were read
      socket.to(`conversation-${conversationId}`).emit('messages-read', {
        conversationId,
        userId: socket.userId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.name} (${socket.userId})`);
    activeUsers.delete(socket.userId);
    socket.broadcast.emit('user-offline', { userId: socket.userId });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io server ready`);
  if (!isMongoConnected) {
    console.log('⚠️  Waiting for MongoDB connection...');
  }
});

