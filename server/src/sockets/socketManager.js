import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { MobileCameraSession } from '../models/MobileCameraSession.js';

let ioInstance = null;

export const initSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const pairingToken = socket.handshake.auth?.pairingToken || socket.handshake.query?.pairingToken;

      // Allow mobile camera pairing without standard JWT if valid pairingToken is provided
      if (pairingToken) {
        const mobileSession = await MobileCameraSession.findOne({
          pairingToken,
          tokenExpiresAt: { $gt: new Date() }
        });

        if (mobileSession) {
          socket.isMobileCamera = true;
          socket.sessionId = mobileSession.sessionId.toString();
          socket.examId = mobileSession.examId.toString();
          return next();
        }
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user || user.status !== 'active') {
        return next(new Error('User not authorized or inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket authentication error: ${err.message}`);
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const ident = socket.isMobileCamera
      ? `MobileCamera (Session: ${socket.sessionId})`
      : `${socket.user?.name} [${socket.user?.role}]`;

    logger.info(`Socket connected: ${socket.id} -> ${ident}`);

    // Join Student Exam Session Room
    socket.on('exam:join', ({ sessionId, examId }) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
        logger.debug(`Socket ${socket.id} joined session:${sessionId}`);
      }
      if (examId && (socket.user?.role === 'admin' || socket.user?.role === 'proctor')) {
        socket.join(`exam:${examId}`);
        logger.debug(`Proctor socket ${socket.id} joined exam:${examId}`);
      }
    });

    // Leave Exam Room
    socket.on('exam:leave', ({ sessionId, examId }) => {
      if (sessionId) socket.leave(`session:${sessionId}`);
      if (examId) socket.leave(`exam:${examId}`);
    });

    // Mobile Camera Pairing & WebRTC Signaling
    socket.on('camera:join', ({ sessionId }) => {
      const targetSession = sessionId || socket.sessionId;
      if (targetSession) {
        socket.join(`camera:${targetSession}`);
        socket.to(`session:${targetSession}`).emit('camera:status', {
          status: 'connected',
          socketId: socket.id
        });
        logger.info(`Mobile camera joined room camera:${targetSession}`);
      }
    });

    // WebRTC Offer from Mobile Broadcaster to Proctor/Student View
    socket.on('camera:offer', ({ sessionId, sdp }) => {
      const targetSession = sessionId || socket.sessionId;
      socket.to(`camera:${targetSession}`).emit('camera:offer', {
        sdp,
        senderId: socket.id
      });
    });

    // WebRTC Answer from Proctor/Student View to Mobile Broadcaster
    socket.on('camera:answer', ({ sessionId, sdp }) => {
      const targetSession = sessionId || socket.sessionId;
      socket.to(`camera:${targetSession}`).emit('camera:answer', {
        sdp,
        senderId: socket.id
      });
    });

    // WebRTC ICE Candidate Exchange
    socket.on('camera:ice-candidate', ({ sessionId, candidate }) => {
      const targetSession = sessionId || socket.sessionId;
      socket.to(`camera:${targetSession}`).emit('camera:ice-candidate', {
        candidate,
        senderId: socket.id
      });
    });

    // Mobile Stream Status Notification
    socket.on('camera:status', ({ sessionId, status, error }) => {
      const targetSession = sessionId || socket.sessionId;
      socket.to(`camera:${targetSession}`).emit('camera:status', {
        status,
        error,
        timestamp: new Date()
      });
    });

    // Proctor sending live message / intervention to student
    socket.on('proctor:message', ({ sessionId, message, type = 'warning' }) => {
      if (socket.user?.role === 'admin' || socket.user?.role === 'proctor') {
        io.to(`session:${sessionId}`).emit('exam:proctor_message', {
          message,
          type,
          from: socket.user.name,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.isMobileCamera && socket.sessionId) {
        io.to(`camera:${socket.sessionId}`).emit('camera:status', {
          status: 'disconnected',
          timestamp: new Date()
        });
        await MobileCameraSession.findOneAndUpdate(
          { sessionId: socket.sessionId },
          { connectionState: 'disconnected', disconnectedAt: new Date() }
        );
      }
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  return ioInstance;
};
