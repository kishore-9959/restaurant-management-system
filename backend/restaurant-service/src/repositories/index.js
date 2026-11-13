/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPOSITORIES INDEX
 * File: backend/restaurant-service/src/repositories/index.js
 * ============================================================================
 */

const restaurantRepository = require('./restaurant.repository');
const branchRepository = require('./branch.repository');
const diningSectionRepository = require('./diningSection.repository');
const diningTableRepository = require('./diningTable.repository');

module.exports = {
  restaurantRepository,
  branchRepository,
  diningSectionRepository,
  diningTableRepository,
};
