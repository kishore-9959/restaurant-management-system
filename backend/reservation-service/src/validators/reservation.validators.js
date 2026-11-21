/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION VALIDATORS
 * File: backend/reservation-service/src/validators/reservation.validators.js
 * Description: Input validation for Reservation endpoints.
 * ============================================================================
 */

function validateCreateReservation(body) {
  const errors = [];

  if (!body.branchId || isNaN(Number(body.branchId)) || Number(body.branchId) <= 0) {
    errors.push('Field branchId is required and must be a positive integer.');
  }

  if (!body.guestName || typeof body.guestName !== 'string' || body.guestName.trim().length === 0) {
    errors.push('Field guestName is required and must not be empty.');
  } else if (body.guestName.trim().length > 100) {
    errors.push('Field guestName must not exceed 100 characters.');
  }

  if (!body.guestPhone || typeof body.guestPhone !== 'string' || body.guestPhone.trim().length === 0) {
    errors.push('Field guestPhone is required.');
  } else if (body.guestPhone.trim().length > 25) {
    errors.push('Field guestPhone must not exceed 25 characters.');
  }

  if (body.guestEmail && typeof body.guestEmail === 'string' && body.guestEmail.trim().length > 120) {
    errors.push('Field guestEmail must not exceed 120 characters.');
  }

  if (!body.partySize || isNaN(Number(body.partySize)) || Number(body.partySize) <= 0) {
    errors.push('Field partySize is required and must be greater than zero.');
  }

  if (!body.reservationDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.reservationDate).trim())) {
    errors.push('Field reservationDate is required in YYYY-MM-DD format.');
  }

  if (!body.startTime || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(body.startTime).trim())) {
    errors.push('Field startTime is required in HH:MM or HH:MM:SS format.');
  }

  if (body.tableId && (isNaN(Number(body.tableId)) || Number(body.tableId) <= 0)) {
    errors.push('Field tableId must be a positive integer if provided.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateUpdateReservation(body) {
  const errors = [];

  if (!body.guestName || typeof body.guestName !== 'string' || body.guestName.trim().length === 0) {
    errors.push('Field guestName is required.');
  }

  if (!body.guestPhone || typeof body.guestPhone !== 'string' || body.guestPhone.trim().length === 0) {
    errors.push('Field guestPhone is required.');
  }

  if (!body.partySize || isNaN(Number(body.partySize)) || Number(body.partySize) <= 0) {
    errors.push('Field partySize must be greater than zero.');
  }

  if (!body.reservationDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.reservationDate).trim())) {
    errors.push('Field reservationDate is required in YYYY-MM-DD format.');
  }

  if (!body.startTime || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(body.startTime).trim())) {
    errors.push('Field startTime is required in HH:MM or HH:MM:SS format.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateUpdateStatus(body) {
  const errors = [];
  const allowed = ['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

  if (!body.status || !allowed.includes(String(body.status).toUpperCase())) {
    errors.push(`Field status is required and must be one of: ${allowed.join(', ')}.`);
  }

  return { isValid: errors.length === 0, errors };
}

function validateAssignTable(body) {
  const errors = [];

  if (!body.tableId || isNaN(Number(body.tableId)) || Number(body.tableId) <= 0) {
    errors.push('Field tableId is required and must be a positive integer.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateWalkIn(body) {
  const errors = [];

  if (!body.branchId || isNaN(Number(body.branchId)) || Number(body.branchId) <= 0) {
    errors.push('Field branchId is required and must be a positive integer.');
  }

  if (!body.tableId || isNaN(Number(body.tableId)) || Number(body.tableId) <= 0) {
    errors.push('Field tableId is required and must be a positive integer.');
  }

  if (body.partySize && (isNaN(Number(body.partySize)) || Number(body.partySize) <= 0)) {
    errors.push('Field partySize must be greater than zero.');
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCreateReservation,
  validateUpdateReservation,
  validateUpdateStatus,
  validateAssignTable,
  validateWalkIn,
};

