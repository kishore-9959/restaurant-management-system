/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INTER-SERVICE HTTP CLIENT
 * File: backend/shared/utils/httpClient.js
 * Description: Pre-configured Axios factory for resilient HTTP REST inter-service
 *              calls with automatic correlation ID forwarding and mutual internal auth.
 * ============================================================================
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

/**
 * Creates an Axios client configured for inter-service REST communication
 * @param {object} options
 * @param {string} [options.baseURL] - Target base URL (e.g. config.urls.menuService)
 * @param {number} [options.timeout=5000] - Request timeout in ms
 * @param {string} [options.serviceName] - Calling service identity
 */
function createHttpClient({ baseURL, timeout = 5000, serviceName = 'rms-client' } = {}) {
  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': config.security.internalServiceKey,
      'User-Agent': `${serviceName}/1.0.0`,
    },
  });

  // Request interceptor to attach Correlation ID
  instance.interceptors.request.use((req) => {
    if (!req.headers['X-Correlation-ID']) {
      req.headers['X-Correlation-ID'] = uuidv4();
    }
    return req;
  }, (error) => Promise.reject(error));

  // Response interceptor for unified error formatting
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const formattedError = {
        message: error.response?.data?.error?.message || error.message,
        code: error.response?.data?.error?.code || 'DOWNSTREAM_SERVICE_ERROR',
        status: error.response?.status || 502,
        details: error.response?.data?.error?.details || null,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };
      return Promise.reject(formattedError);
    }
  );

  return instance;
}

module.exports = {
  createHttpClient,
};

