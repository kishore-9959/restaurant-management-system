/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU REPOSITORIES MASTER EXPORT
 * File: backend/menu-service/src/repositories/index.js
 * ============================================================================
 */

const categoryRepository = require('./category.repository');
const menuItemRepository = require('./menuItem.repository');
const addonRepository = require('./addon.repository');

module.exports = {
  categoryRepository,
  menuItemRepository,
  addonRepository,
};
