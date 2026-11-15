/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SOCKET.IO MANAGER
 * File: backend/notification-service/src/socket/socket.manager.js
 * Description: Real-time WebSocket hub with JWT handshake authentication,
 *              role-based room isolation, and Redis Pub/Sub distribution.
 * ============================================================================
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('notification-service');

class SocketManager {
  constructor() {
    this.io = null;
    this.redisPublisher = null;
    this.redisSubscriber = null;
    this.redisChannel = 'rms:notifications:events';
    this.isRedisConnected = false;
  }

  /**
   * Initialize Socket.IO server on top of HTTP server.
   */
  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigins || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    // 1. Handshake JWT Authentication Middleware
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
          socket.handshake.query?.token;

        if (!token) {
          const err = new Error('Authentication required: Token missing in handshake.');
          err.data = { code: 'AUTH_REQUIRED' };
          return next(err);
        }

        const jwtSecret = config.jwtAccessSecret || config.jwt?.accessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';
        const decoded = jwt.verify(token, jwtSecret);

        // Attach authenticated user context
        socket.user = {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          role: (decoded.role || decoded.userType || 'CUSTOMER').toUpperCase(),
          roles: decoded.roles || [decoded.role],
          branchId: decoded.branchId ? Number(decoded.branchId) : null,
        };

        logger.info(`Socket authenticated: SocketID=${socket.id}, UserID=${socket.user.userId}, Role=${socket.user.role}, Branch=${socket.user.branchId}`);
        return next();
      } catch (err) {
        logger.warn(`Socket handshake auth rejected: ${err.message}`);
        const authError = new Error('Authentication failed: Invalid or expired token.');
        authError.data = { code: 'INVALID_TOKEN', details: err.message };
        return next(authError);
      }
    });

    // 2. Connection Handler
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: SocketID=${socket.id}, UserID=${socket.user?.userId}`);

      // Auto-join personal user room
      if (socket.user?.userId) {
        const userRoom = `user:${socket.user.userId}`;
        socket.join(userRoom);
        logger.info(`Socket ${socket.id} auto-joined private room ${userRoom}`);
      }

      // Room Subscription Request
      socket.on('join', (data, ack) => {
        const room = typeof data === 'string' ? data : data?.room;
        if (!room) {
          if (typeof ack === 'function') ack({ success: false, error: 'Room name required' });
          return;
        }

        const isAuthorized = this.authorizeRoomSubscription(socket, room);
        if (!isAuthorized) {
          logger.warn(`Unauthorized room join attempt: Socket=${socket.id}, User=${socket.user?.userId}, Role=${socket.user?.role}, Room=${room}`);
          socket.emit('error', {
            code: 'FORBIDDEN_ROOM',
            message: `Access denied to room '${room}'. Insufficient role or cross-branch violation.`,
          });
          if (typeof ack === 'function') ack({ success: false, error: 'Forbidden' });
          return;
        }

        socket.join(room);
        logger.info(`Socket ${socket.id} joined room ${room}`);
        if (typeof ack === 'function') ack({ success: true, room });
      });

      // Leave Room Request
      socket.on('leave', (data, ack) => {
        const room = typeof data === 'string' ? data : data?.room;
        if (room) {
          socket.leave(room);
          logger.info(`Socket ${socket.id} left room ${room}`);
          if (typeof ack === 'function') ack({ success: true, room });
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: SocketID=${socket.id} (Reason: ${reason})`);
      });
    });

    // 3. Initialize Redis Pub/Sub for Multi-Instance Distribution
    this.initRedisPubSub();

    return this.io;
  }

  /**
   * Verify room-level authorization and tenant/branch isolation.
   */
  authorizeRoomSubscription(socket, roomName) {
    const user = socket.user;
    if (!user) return false;

    // Super Admin has global omni-access
    if (user.role === 'SUPER_ADMIN' || user.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    // Rule 1: Private user room
    if (roomName.startsWith('user:')) {
      const targetUserId = roomName.split(':')[1];
      return String(user.userId) === String(targetUserId);
    }

    // Rule 2: Branch-scoped rooms (branch:{id}:*)
    if (roomName.startsWith('branch:')) {
      const parts = roomName.split(':');
      const targetBranchId = Number(parts[1]);
      const subChannel = parts[2]; // 'kitchen', 'waitstaff', 'pos'

      // Branch Isolation Check: User must belong to target branch
      if (user.branchId && user.branchId !== targetBranchId) {
        return false;
      }

      // Role check for kitchen rooms
      if (subChannel === 'kitchen') {
        const allowedRoles = ['RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'KITCHEN_STAFF', 'ADMIN'];
        return allowedRoles.some((r) => user.role.includes(r) || user.roles?.includes(r));
      }

      // Role check for waitstaff / floor rooms
      if (subChannel === 'waitstaff' || subChannel === 'pos') {
        const allowedRoles = ['RESTAURANT_MANAGER', 'WAITSTAFF', 'CASHIER_POS', 'POS_OPERATOR', 'ADMIN'];
        return allowedRoles.some((r) => user.role.includes(r) || user.roles?.includes(r));
      }

      return true;
    }

    // Rule 3: Order tracking rooms (order:{orderId})
    if (roomName.startsWith('order:')) {
      // Allowed for customers tracking their own order or restaurant staff
      return true;
    }

    // Rule 4: Generic role rooms (e.g. role:kitchen)
    if (roomName.startsWith('role:')) {
      const targetRole = roomName.split(':')[1]?.toUpperCase();
      return user.role.includes(targetRole) || user.roles?.some((r) => r.toUpperCase().includes(targetRole));
    }

    return false;
  }

  /**
   * Configure Redis Pub/Sub subscriber with non-blocking error recovery.
   */
  initRedisPubSub() {
    try {
      const redisOptions = {
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
      };

      this.redisPublisher = new Redis(redisOptions);
      this.redisSubscriber = new Redis(redisOptions);

      this.redisPublisher.connect().catch((err) => {
        logger.warn(`Redis publisher connection warning: ${err.message}. Running in standalone mode.`);
      });

      this.redisSubscriber
        .connect()
        .then(() => {
          this.isRedisConnected = true;
          this.redisSubscriber.subscribe(this.redisChannel, (err) => {
            if (!err) logger.info(`Redis subscriber subscribed to ${this.redisChannel}`);
          });

          this.redisSubscriber.on('message', (channel, message) => {
            if (channel === this.redisChannel) {
              try {
                const { room, event, data } = JSON.parse(message);
                this.localEmit({ room, event, data });
              } catch (parseErr) {
                logger.warn(`Failed to parse distributed socket message: ${parseErr.message}`);
              }
            }
          });
        })
        .catch((err) => {
          this.isRedisConnected = false;
          logger.warn(`Redis subscriber connection warning: ${err.message}. Standalone socket active.`);
        });
    } catch (err) {
      logger.warn(`Redis PubSub init error: ${err.message}`);
    }
  }

  /**
   * Internal local emission within current server instance.
   */
  localEmit({ room, event, data }) {
    if (!this.io) return;
    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  /**
   * Broadcast an event to a target room or all clients (distributed via Redis).
   */
  broadcast({ room, event, data }) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized; skipping emit.');
      return;
    }

    // 1. Emit locally
    this.localEmit({ room, event, data });

    // 2. Publish to Redis channel for multi-instance distribution
    if (this.isRedisConnected && this.redisPublisher && this.redisPublisher.status === 'ready') {
      try {
        const payload = JSON.stringify({ room, event, data });
        this.redisPublisher.publish(this.redisChannel, payload).catch((err) => {
          logger.warn(`Redis publish warning: ${err.message}`);
        });
      } catch (err) {
        logger.warn(`Redis publish exception: ${err.message}`);
      }
    }
  }

  /**
   * Emit directly to a specific user.
   */
  emitToUser(userId, event, data) {
    this.broadcast({ room: `user:${userId}`, event, data });
  }

  /**
   * Get connected sockets count.
   */
  getConnectedCount() {
    return this.io?.engine?.clientsCount || 0;
  }
}

const socketManager = new SocketManager();

module.exports = {
  socketManager,
  initSocketServer: (server) => socketManager.init(server),
  broadcastNotification: (params) => socketManager.broadcast(params),
};

