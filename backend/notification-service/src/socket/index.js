/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CENTRAL WEBSOCKET HUB (SOCKET.IO)
 * File: backend/notification-service/src/socket/index.js
 * Description: Manages real-time WebSocket client connections and room segmentation.
 * ============================================================================
 */

const { Server } = require('socket.io');
const { config } = require('../../shared');

let io = null;

function initSocketServer(httpServer, logger) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Join specialized channel room
    socket.on('join', ({ room }) => {
      if (room) {
        socket.join(room);
        logger.info(`Client ${socket.id} joined room: ${room}`);
        socket.emit('joined', { room, success: true });
      }
    });

    // Leave specialized channel room
    socket.on('leave', ({ room }) => {
      if (room) {
        socket.leave(room);
        logger.info(`Client ${socket.id} left room: ${room}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Broadcast an event to a specific room or to all connected clients
 * @param {object} params
 * @param {string|null} [params.room] - Room name (e.g. 'role:kitchen', 'table:4')
 * @param {string} params.event - Event name (e.g. 'kot:created', 'order:status_updated')
 * @param {any} params.data - Event payload data
 */
function broadcastNotification({ room, event, data }) {
  if (!io) {
    throw new Error('Socket.IO server is not initialized yet.');
  }

  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}

function getSocketServer() {
  return io;
}

module.exports = {
  initSocketServer,
  broadcastNotification,
  getSocketServer,
};

