/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU SERVICE VALIDATORS
 * File: backend/menu-service/src/validators/index.js
 * Description: Input validation helpers for Categories, Menu Items,
 *              Variants, Addon Groups and Addon Items.
 * ============================================================================
 */

function validateCategoryPayload(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.categoryName !== undefined) {
    if (!body.categoryName || typeof body.categoryName !== 'string' || body.categoryName.trim().length < 2) {
      errors.push("Field 'categoryName' must be a string with at least 2 characters.");
    }
  }

  if (body.displayOrder !== undefined) {
    if (isNaN(parseInt(body.displayOrder, 10)) || parseInt(body.displayOrder, 10) < 0) {
      errors.push("Field 'displayOrder' must be a non-negative integer.");
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push("Field 'isActive' must be a boolean.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateMenuItemPayload(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!body.branchId || isNaN(parseInt(body.branchId, 10))) {
      errors.push("Field 'branchId' is required and must be a valid integer.");
    }
    if (!body.categoryId || isNaN(parseInt(body.categoryId, 10))) {
      errors.push("Field 'categoryId' is required and must be a valid integer.");
    }
    if (!body.itemCode || typeof body.itemCode !== 'string' || !body.itemCode.trim()) {
      errors.push("Field 'itemCode' is required and must be a non-empty string.");
    }
    if (!body.itemName || typeof body.itemName !== 'string' || body.itemName.trim().length < 2) {
      errors.push("Field 'itemName' is required and must be at least 2 characters.");
    }
    if (body.basePrice === undefined || isNaN(parseFloat(body.basePrice)) || parseFloat(body.basePrice) < 0) {
      errors.push("Field 'basePrice' is required and must be a non-negative number.");
    }
  } else {
    if (body.categoryId !== undefined && isNaN(parseInt(body.categoryId, 10))) {
      errors.push("Field 'categoryId' must be a valid integer.");
    }
    if (body.itemCode !== undefined && (typeof body.itemCode !== 'string' || !body.itemCode.trim())) {
      errors.push("Field 'itemCode' must be a non-empty string.");
    }
    if (body.itemName !== undefined && (typeof body.itemName !== 'string' || body.itemName.trim().length < 2)) {
      errors.push("Field 'itemName' must be at least 2 characters.");
    }
    if (body.basePrice !== undefined && (isNaN(parseFloat(body.basePrice)) || parseFloat(body.basePrice) < 0)) {
      errors.push("Field 'basePrice' must be a non-negative number.");
    }
  }

  if (body.dietaryType !== undefined) {
    const validTypes = ['VEG', 'NON_VEG', 'VEGAN', 'EGG', 'HALAL'];
    if (!validTypes.includes(body.dietaryType)) {
      errors.push(`Field 'dietaryType' must be one of: ${validTypes.join(', ')}.`);
    }
  }

  if (body.spicyLevel !== undefined) {
    const level = parseInt(body.spicyLevel, 10);
    if (isNaN(level) || level < 0 || level > 3) {
      errors.push("Field 'spicyLevel' must be an integer between 0 and 3.");
    }
  }

  if (body.preparationTimeMinutes !== undefined) {
    const prep = parseInt(body.preparationTimeMinutes, 10);
    if (isNaN(prep) || prep < 1) {
      errors.push("Field 'preparationTimeMinutes' must be a positive integer.");
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validatePricingPayload(body) {
  const errors = [];
  if (body.basePrice === undefined || isNaN(parseFloat(body.basePrice)) || parseFloat(body.basePrice) < 0) {
    errors.push("Field 'basePrice' is required and must be a non-negative number.");
  }
  return { isValid: errors.length === 0, errors };
}

function validateVariantPayload(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!body.menuItemId || isNaN(parseInt(body.menuItemId, 10))) {
      errors.push("Field 'menuItemId' is required and must be a valid integer.");
    }
    if (!body.variantName || typeof body.variantName !== 'string' || !body.variantName.trim()) {
      errors.push("Field 'variantName' is required.");
    }
  } else {
    if (body.variantName !== undefined && (typeof body.variantName !== 'string' || !body.variantName.trim())) {
      errors.push("Field 'variantName' must be a non-empty string.");
    }
  }

  if (body.priceAdjustment !== undefined && isNaN(parseFloat(body.priceAdjustment))) {
    errors.push("Field 'priceAdjustment' must be a valid number.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateAddonGroupPayload(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate || body.groupName !== undefined) {
    if (!body.groupName || typeof body.groupName !== 'string' || !body.groupName.trim()) {
      errors.push("Field 'groupName' is required.");
    }
  }
  if (body.minSelections !== undefined && (isNaN(parseInt(body.minSelections, 10)) || parseInt(body.minSelections, 10) < 0)) {
    errors.push("Field 'minSelections' must be a non-negative integer.");
  }
  if (body.maxSelections !== undefined && (isNaN(parseInt(body.maxSelections, 10)) || parseInt(body.maxSelections, 10) < 1)) {
    errors.push("Field 'maxSelections' must be a positive integer.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateAddonItemPayload(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!body.addonGroupId || isNaN(parseInt(body.addonGroupId, 10))) {
      errors.push("Field 'addonGroupId' is required and must be a valid integer.");
    }
    if (!body.itemName || typeof body.itemName !== 'string' || !body.itemName.trim()) {
      errors.push("Field 'itemName' is required.");
    }
  } else {
    if (body.itemName !== undefined && (typeof body.itemName !== 'string' || !body.itemName.trim())) {
      errors.push("Field 'itemName' must be a non-empty string.");
    }
  }

  if (body.price !== undefined && (isNaN(parseFloat(body.price)) || parseFloat(body.price) < 0)) {
    errors.push("Field 'price' must be a non-negative number.");
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCategoryPayload,
  validateMenuItemPayload,
  validatePricingPayload,
  validateVariantPayload,
  validateAddonGroupPayload,
  validateAddonItemPayload,
};
