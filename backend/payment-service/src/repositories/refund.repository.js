/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REFUND REPOSITORY
 * File: backend/payment-service/src/repositories/refund.repository.js
 * Description: Data access methods for Payment Refunds using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class RefundRepository {
  /**
   * Process and persist a full or partial refund
   */
  async createRefund(data) {
    const result = await executeProcedure('dbo.usp_Payment_Refund_Create', {
      PaymentId: data.paymentId,
      RefundAmount: data.refundAmount,
      Reason: data.reason,
      InitiatedByUserId: data.initiatedByUserId,
      GatewayRefundId: data.gatewayRefundId || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Fetch refund by ID with parent payment context
   */
  async getRefundById(refundId) {
    const result = await executeProcedure('dbo.usp_Payment_Refund_GetById', {
      RefundId: refundId,
    });

    return result.recordset?.[0] || null;
  }
}

module.exports = new RefundRepository();

