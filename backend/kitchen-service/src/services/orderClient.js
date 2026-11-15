/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE CLIENT
 * File: backend/kitchen-service/src/services/orderClient.js
 * Description: HTTP REST client to synchronize order status with Order Service (:8007).
 * ============================================================================
 */

const axios = require('axios');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('kitchen-service');

const orderClient = axios.create({
  baseURL: config.urls?.orderService || 'http://localhost:8007',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.internalServiceKey,
  },
});

/**
 * Synchronize order status with Order Service.
 */
async function syncOrderStatus({ orderId, status, notes = null, userToken = null, correlationId = null }) {
  try {
    const headers = {};
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId;
    }

    const response = await orderClient.put(
      `/api/v1/orders/${orderId}/status`,
      {
        status,
        notes: notes || `Auto-updated by Kitchen Service (KDS)`,
      },
      { headers }
    );

    return response.data;
  } catch (err) {
    logger.warn(`Failed to sync order status for Order ${orderId} -> ${status}: ${err.message}`);
    // Non-blocking: Kitchen state has already been committed in DB
    return null;
  }
}

/**
 * Fetch Order details (items, branch, table) from Order Service.
 */
async function getOrderDetails(orderId, userToken = null) {
  try {
    const headers = {};
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    const response = await orderClient.get(`/api/v1/orders/${orderId}`, { headers });
    return response.data?.data || null;
  } catch (err) {
    logger.warn(`Failed to fetch order details for Order ${orderId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  syncOrderStatus,
  getOrderDetails,
};
