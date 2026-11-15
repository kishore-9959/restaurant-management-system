/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPOSITORIES INDEX
 * File: backend/inventory-service/src/repositories/index.js
 * ============================================================================
 */

const ingredientRepository = require('./ingredient.repository');
const supplierRepository = require('./supplier.repository');
const stockRepository = require('./stock.repository');
const recipeRepository = require('./recipe.repository');
const bomRepository = require('./bom.repository');
const reportRepository = require('./report.repository');

module.exports = {
  ingredientRepository,
  supplierRepository,
  stockRepository,
  recipeRepository,
  bomRepository,
  reportRepository,
};
