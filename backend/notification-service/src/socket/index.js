/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CENTRAL WEBSOCKET HUB (SOCKET.IO)
 * File: backend/notification-service/src/socket/index.js
 * ============================================================================
 */

const { socketManager, initSocketServer, broadcastNotification } = require('./socket.manager');

module.exports = {
  socketManager,
  initSocketServer,
  broadcastNotification,
};
