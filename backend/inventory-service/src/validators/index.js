/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY VALIDATORS
 * File: backend/inventory-service/src/validators/index.js
 * ============================================================================
 */

function validateIngredientPayload(body) {
  const errors = [];
  if (!body.branchId || isNaN(parseInt(body.branchId, 10))) {
    errors.push("'branchId' is required and must be an integer.");
  }
  if (!body.ingredientCode || typeof body.ingredientCode !== 'string' || !body.ingredientCode.trim()) {
    errors.push("'ingredientCode' is required.");
  }
  if (!body.ingredientName || typeof body.ingredientName !== 'string' || !body.ingredientName.trim()) {
    errors.push("'ingredientName' is required.");
  }
  if (!body.unitOfMeasure || typeof body.unitOfMeasure !== 'string' || !body.unitOfMeasure.trim()) {
    errors.push("'unitOfMeasure' is required.");
  }
  return errors;
}

function validateStockMovementPayload(body) {
  const errors = [];
  if (!body.branchId || isNaN(parseInt(body.branchId, 10))) {
    errors.push("'branchId' is required.");
  }
  if (!body.ingredientId || isNaN(parseInt(body.ingredientId, 10))) {
    errors.push("'ingredientId' is required.");
  }
  const qty = parseFloat(body.quantity);
  if (isNaN(qty) || qty <= 0) {
    errors.push("'quantity' must be a positive number.");
  }
  return errors;
}

function validateStockAdjustPayload(body) {
  const errors = [];
  if (!body.branchId || isNaN(parseInt(body.branchId, 10))) {
    errors.push("'branchId' is required.");
  }
  if (!body.ingredientId || isNaN(parseInt(body.ingredientId, 10))) {
    errors.push("'ingredientId' is required.");
  }
  const count = parseFloat(body.actualCount !== undefined ? body.actualCount : body.newPhysicalStock);
  if (isNaN(count) || count < 0) {
    errors.push("'actualCount' must be a non-negative number.");
  }
  return errors;
}

function validateStockTransferPayload(body) {
  const errors = [];
  if (!body.fromBranchId || isNaN(parseInt(body.fromBranchId, 10))) {
    errors.push("'fromBranchId' is required.");
  }
  if (!body.toBranchId || isNaN(parseInt(body.toBranchId, 10))) {
    errors.push("'toBranchId' is required.");
  }
  if (parseInt(body.fromBranchId, 10) === parseInt(body.toBranchId, 10)) {
    errors.push("'fromBranchId' and 'toBranchId' must be different.");
  }
  if (!body.ingredientCode && !body.sourceIngredientId && !body.ingredientId) {
    errors.push("'ingredientCode' or 'ingredientId' is required.");
  }
  const qty = parseFloat(body.transferQuantity || body.quantity);
  if (isNaN(qty) || qty <= 0) {
    errors.push("'transferQuantity' must be a positive number.");
  }
  return errors;
}

function validateRecipePayload(body) {
  const errors = [];
  if (!body.menuItemId || isNaN(parseInt(body.menuItemId, 10))) {
    errors.push("'menuItemId' is required.");
  }
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    errors.push("'ingredients' array is required and must not be empty.");
  } else {
    body.ingredients.forEach((ing, index) => {
      if (!ing.ingredientId || isNaN(parseInt(ing.ingredientId, 10))) {
        errors.push(`Ingredient at index ${index} must have a valid 'ingredientId'.`);
      }
      const qty = parseFloat(ing.requiredQuantity !== undefined ? ing.requiredQuantity : ing.quantityRequired);
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Ingredient at index ${index} must have a positive 'requiredQuantity'.`);
      }
    });
  }
  return errors;
}

function validateSupplierPayload(body) {
  const errors = [];
  if (!body.supplierName || typeof body.supplierName !== 'string' || !body.supplierName.trim()) {
    errors.push("'supplierName' is required.");
  }
  if (!body.phone || typeof body.phone !== 'string' || !body.phone.trim()) {
    errors.push("'phone' is required.");
  }
  return errors;
}

module.exports = {
  validateIngredientPayload,
  validateStockMovementPayload,
  validateStockAdjustPayload,
  validateStockTransferPayload,
  validateRecipePayload,
  validateSupplierPayload,
};
