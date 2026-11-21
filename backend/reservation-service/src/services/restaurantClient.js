/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE CLIENT
 * File: backend/reservation-service/src/services/restaurantClient.js
 * Description: HTTP REST client to synchronize table status and branch info
 *              with Restaurant Service (:8003).
 * ============================================================================
 */

const axios = require('axios');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('reservation-service');

const restaurantClient = axios.create({
  baseURL: config.urls?.restaurantService || 'http://localhost:8003',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.internalServiceKey,
  },
});

/**
 * Update table status in Restaurant Service (e.g. AVAILABLE, RESERVED, OCCUPIED).
 */
async function updateTableStatus(tableId, status, { userToken = null, correlationId = null } = {}) {
  try {
    const headers = {};
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId;
    }

    const response = await restaurantClient.patch(
      `/api/v1/tables/${tableId}/status`,
      { currentStatus: status, status },
      { headers }
    );
    return response.data;
  } catch (err) {
    logger.warn(`Failed to update table status for Table ${tableId} -> ${status}: ${err.message}`);
    return null;
  }
}

/**
 * Get branch details including operating hours.
 */
async function getBranch(branchId, { userToken = null, correlationId = null } = {}) {
  try {
    const headers = {};
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId;
    }

    const response = await restaurantClient.get(`/api/v1/branches/${branchId}`, { headers });
    return response.data?.data || null;
  } catch (err) {
    logger.warn(`Failed to fetch branch ${branchId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  updateTableStatus,
  getBranch,
};
