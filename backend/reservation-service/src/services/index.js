/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SERVICES INDEX
 * File: backend/reservation-service/src/services/index.js
 * ============================================================================
 */

const reservationService = require('./reservation.service');
const restaurantClient = require('./restaurantClient');
const notificationClient = require('./notificationClient');

module.exports = {
  reservationService,
  restaurantClient,
  notificationClient,
};

