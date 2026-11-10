/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REVERSE PROXY ROUTER
 * File: backend/api-gateway/src/proxy/serviceProxy.js
 * Description: HTTP Reverse proxy handlers for all downstream microservices,
 *              with header decoration and error translation.
 * ============================================================================
 */

const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { config, errorResponse } = require('@rms/shared');

/**
 * Creates an http-proxy-middleware instance for a target microservice
 * @param {string} targetUrl - Target downstream microservice base URL
 * @param {string} serviceName - Human readable service identity
 */
function createServiceProxy(targetUrl, serviceName) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true,
    logger: console,
    on: {
      proxyReq: (proxyReq, req, res) => {
        // 1. Forward Correlation ID
        if (req.correlationId) {
          proxyReq.setHeader('X-Correlation-ID', req.correlationId);
        }

        // 2. Inject Internal Pre-Shared Service Key
        proxyReq.setHeader('X-Internal-Service-Key', config.security.internalServiceKey);

        // 3. Inject Authenticated Caller Context
        if (req.user) {
          const userId = req.user.userId || req.user.id || req.user.sub;
          if (userId) proxyReq.setHeader('X-User-ID', String(userId));

          const roles = Array.isArray(req.user.roles) ? req.user.roles.join(',') : (req.user.role || '');
          if (roles) proxyReq.setHeader('X-User-Role', String(roles));

          if (req.user.userType) proxyReq.setHeader('X-User-Type', String(req.user.userType));
          if (req.user.branchId) proxyReq.setHeader('X-Branch-ID', String(req.user.branchId));
          if (Array.isArray(req.user.permissions)) proxyReq.setHeader('X-User-Permissions', req.user.permissions.join(','));
        }

        // 4. Repipe JSON body if parsed upstream
        fixRequestBody(proxyReq, req);
      },
      error: (err, req, res) => {
        console.error(`[Gateway Proxy Error] Downstream ${serviceName} unreachable (${targetUrl}): ${err.message}`);
        
        if (res.headersSent) {
          return;
        }

        return errorResponse(res, {
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
          message: `The requested service '${serviceName}' is currently unreachable or offline. Please try again shortly.`,
          details: {
            service: serviceName,
            targetUrl,
            error: err.message,
          },
        });
      },
    },
  });
}

module.exports = {
  createServiceProxy,
};

