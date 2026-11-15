/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECONCILIATION SERVICE
 * File: backend/payment-service/src/services/reconciliation.service.js
 * Description: Payment financial audits, aggregation, and settlement reporting.
 * ============================================================================
 */

const { paymentRepository } = require('../repositories');

class ReconciliationService {
  /**
   * Generate financial reconciliation summary
   */
  async getReconciliationReport(filters = {}) {
    const branchId = filters.branchId ? parseInt(filters.branchId, 10) : null;
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    const data = await paymentRepository.getReconciliationSummary({
      branchId,
      startDate,
      endDate,
    });

    return {
      branchId,
      period: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
      ...data,
    };
  }
}

module.exports = new ReconciliationService();

