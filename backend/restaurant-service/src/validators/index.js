/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE VALIDATORS
 * File: backend/restaurant-service/src/validators/index.js
 * ============================================================================
 */

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
}

function validateTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  // Match HH:mm or HH:mm:ss
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeStr.trim());
}

const VALID_TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'BILLED', 'CLEANING'];

function validateRestaurantPayload(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate || data.restaurantName !== undefined) {
    if (!data.restaurantName || typeof data.restaurantName !== 'string' || data.restaurantName.trim().length === 0) {
      errors.push('restaurantName is required and must be a non-empty string.');
    }
  }

  if (!isUpdate || data.primaryContactEmail !== undefined) {
    if (!validateEmail(data.primaryContactEmail)) {
      errors.push('primaryContactEmail is invalid.');
    }
  }

  if (!isUpdate || data.primaryContactPhone !== undefined) {
    if (!validatePhone(data.primaryContactPhone)) {
      errors.push('primaryContactPhone is invalid.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateBranchPayload(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!data.restaurantId || isNaN(parseInt(data.restaurantId, 10))) {
      errors.push('restaurantId is required and must be a valid integer.');
    }
    if (!data.branchCode || typeof data.branchCode !== 'string' || data.branchCode.trim().length === 0) {
      errors.push('branchCode is required.');
    }
  }

  if (!isUpdate || data.branchName !== undefined) {
    if (!data.branchName || typeof data.branchName !== 'string' || data.branchName.trim().length === 0) {
      errors.push('branchName is required.');
    }
  }

  if (!isUpdate || data.addressLine1 !== undefined) {
    if (!data.addressLine1 || typeof data.addressLine1 !== 'string') {
      errors.push('addressLine1 is required.');
    }
  }

  if (!isUpdate || data.city !== undefined) {
    if (!data.city || typeof data.city !== 'string') {
      errors.push('city is required.');
    }
  }

  if (!isUpdate || data.stateProvince !== undefined) {
    if (!data.stateProvince || typeof data.stateProvince !== 'string') {
      errors.push('stateProvince is required.');
    }
  }

  if (!isUpdate || data.postalCode !== undefined) {
    if (!data.postalCode || typeof data.postalCode !== 'string') {
      errors.push('postalCode is required.');
    }
  }

  if (!isUpdate || data.phone !== undefined) {
    if (!validatePhone(data.phone)) {
      errors.push('phone is invalid.');
    }
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('email format is invalid.');
  }

  if (data.openingTime && !validateTime(data.openingTime)) {
    errors.push('openingTime must be in format HH:mm or HH:mm:ss.');
  }

  if (data.closingTime && !validateTime(data.closingTime)) {
    errors.push('closingTime must be in format HH:mm or HH:mm:ss.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateDiningSectionPayload(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!data.branchId || isNaN(parseInt(data.branchId, 10))) {
      errors.push('branchId is required and must be an integer.');
    }
  }

  if (!isUpdate || data.sectionName !== undefined) {
    if (!data.sectionName || typeof data.sectionName !== 'string' || data.sectionName.trim().length === 0) {
      errors.push('sectionName is required.');
    }
  }

  if (data.floorLevel !== undefined && isNaN(parseInt(data.floorLevel, 10))) {
    errors.push('floorLevel must be an integer.');
  }

  if (data.displayOrder !== undefined && isNaN(parseInt(data.displayOrder, 10))) {
    errors.push('displayOrder must be an integer.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateDiningTablePayload(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!data.branchId || isNaN(parseInt(data.branchId, 10))) {
      errors.push('branchId is required and must be an integer.');
    }
    if (!data.sectionId || isNaN(parseInt(data.sectionId, 10))) {
      errors.push('sectionId is required and must be an integer.');
    }
    if (!data.tableNumber || typeof data.tableNumber !== 'string' || data.tableNumber.trim().length === 0) {
      errors.push('tableNumber is required.');
    }
  }

  if (data.seatingCapacity !== undefined) {
    const cap = parseInt(data.seatingCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      errors.push('seatingCapacity must be a positive integer greater than zero.');
    }
  }

  if (data.currentStatus !== undefined) {
    if (!VALID_TABLE_STATUSES.includes(String(data.currentStatus).toUpperCase())) {
      errors.push(`currentStatus must be one of: ${VALID_TABLE_STATUSES.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateEmail,
  validatePhone,
  validateTime,
  VALID_TABLE_STATUSES,
  validateRestaurantPayload,
  validateBranchPayload,
  validateDiningSectionPayload,
  validateDiningTablePayload,
};
