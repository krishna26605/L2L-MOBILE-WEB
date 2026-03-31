import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import donationRoutes from './routes/donations.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import chatRoutes from './routes/chat.js';
import verificationRoutes from './routes/verification.js';
import callRoutes from './routes/calls.js';
import alertRoutes from './routes/alerts.js';

// Import MongoDB config
import { connectDB } from './config/mongodb.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store online users: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // User registers with their userId
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} registered with socket ${socket.id}`);
  });

  // Join a donation chat room
  socket.on('join-chat', (donationId) => {
    socket.join(`chat-${donationId}`);
    console.log(`💬 Socket ${socket.id} joined chat-${donationId}`);
  });

  // Leave a donation chat room
  socket.on('leave-chat', (donationId) => {
    socket.leave(`chat-${donationId}`);
  });

  // Send chat message
  socket.on('send-message', (data) => {
    const { donationId, message } = data;
    // Broadcast to the chat room (except sender)
    socket.to(`chat-${donationId}`).emit('new-message', message);
  });

  // Video call request
  socket.on('call-request', (data) => {
    const { receiverId, callRequest } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', callRequest);
      console.log(`📞 Call request sent to ${receiverId}`);
    }
  });

  // Call accepted
  socket.on('call-accepted', (data) => {
    const { callerId, callRequest } = data;
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', callRequest);
    }
  });

  // Call rejected
  socket.on('call-rejected', (data) => {
    const { callerId, callId } = data;
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', { callId });
    }
  });

  // Call ended
  socket.on('call-ended', (data) => {
    const { otherUserId, callId } = data;
    const otherSocketId = onlineUsers.get(otherUserId);
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended', { callId });
    }
  });

  // Emergency alert broadcast
  socket.on('emergency-alert', (alert) => {
    // Broadcast to all connected clients
    io.emit('new-emergency-alert', alert);
    console.log(`🚨 Emergency alert broadcast: ${alert.title}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Remove user from online users
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`👤 User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Make io accessible in routes via req.app
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration (single, proper instance)
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Serve static files with CORS headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', FRONTEND_URL);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: onlineUsers.size
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO enabled`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;