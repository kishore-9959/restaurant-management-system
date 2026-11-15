/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SERVICES INDEX
 * File: backend/inventory-service/src/services/index.js
 * ============================================================================
 */

const ingredientService = require('./ingredient.service');
const supplierService = require('./supplier.service');
const stockService = require('./stock.service');
const recipeService = require('./recipe.service');
const bomService = require('./bom.service');
const reportService = require('./report.service');

module.exports = {
  ingredientService,
  supplierService,
  stockService,
  recipeService,
  bomService,
  reportService,
};

