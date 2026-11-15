/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT REPOSITORY
 * File: backend/payment-service/src/repositories/payment.repository.js
 * Description: Data access methods for Payments using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class PaymentRepository {
  /**
   * Create a new payment intent (PENDING status)
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_Payment_Create', {
      OrderId: data.orderId,
      BranchId: data.branchId,
      PaymentMethod: data.paymentMethod,
      Amount: data.amount,
      GatewayOrderId: data.gatewayOrderId || null,
      SettledByUserId: data.settledByUserId || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Cryptographically verify and capture online payment (SUCCESS status)
   */
  async verifyAndCapture(data) {
    const result = await executeProcedure('dbo.usp_Payment_VerifyAndCapture', {
      PaymentId: data.paymentId || null,
      GatewayOrderId: data.gatewayOrderId || null,
      GatewayPaymentId: data.gatewayPaymentId,
      GatewaySignature: data.gatewaySignature || null,
      SettledByUserId: data.settledByUserId || null,
      RawPayloadJson: data.rawPayloadJson ? JSON.stringify(data.rawPayloadJson) : null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Record payment failure (FAILED status)
   */
  async recordFailure(data) {
    const result = await executeProcedure('dbo.usp_Payment_RecordFailure', {
      PaymentId: data.paymentId || null,
      GatewayOrderId: data.gatewayOrderId || null,
      GatewayPaymentId: data.gatewayPaymentId || null,
      ErrorCode: data.errorCode || 'PAYMENT_FAILED',
      ErrorMessage: data.errorMessage || 'Payment was unsuccessful',
      RawPayloadJson: data.rawPayloadJson ? JSON.stringify(data.rawPayloadJson) : null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Immediately settle an on-premise payment (CASH, CARD, UPI)
   */
  async settleOffline(data) {
    const result = await executeProcedure('dbo.usp_Payment_SettleOffline', {
      OrderId: data.orderId,
      BranchId: data.branchId,
      PaymentMethod: data.paymentMethod,
      Amount: data.amount,
      SettledByUserId: data.settledByUserId,
      Notes: data.notes || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Fetch payment by ID with multi-recordset transactions, refunds, and balance summary
   */
  async getById(paymentId) {
    const result = await executeProcedure('dbo.usp_Payment_GetById', {
      PaymentId: paymentId,
    });

    const header = result.recordsets?.[0]?.[0] || null;
    if (!header) return null;

    const transactions = result.recordsets?.[1] || [];
    const refunds = result.recordsets?.[2] || [];
    const summary = result.recordsets?.[3]?.[0] || {
      OriginalAmount: header.Amount,
      TotalRefunded: 0.0,
      NetSettledAmount: header.Amount,
    };

    return {
      ...header,
      transactions,
      refunds,
      summary: {
        originalAmount: parseFloat(summary.OriginalAmount || 0),
        totalRefunded: parseFloat(summary.TotalRefunded || 0),
        netSettledAmount: parseFloat(summary.NetSettledAmount || 0),
      },
    };
  }

  /**
   * Fetch all payments and refunds for a specific order
   */
  async getByOrderId(orderId) {
    const result = await executeProcedure('dbo.usp_Payment_GetByOrderId', {
      OrderId: orderId,
    });

    const payments = result.recordsets?.[0] || [];
    const refunds = result.recordsets?.[1] || [];
    const summary = result.recordsets?.[2]?.[0] || {
      TotalPaid: 0.0,
      TotalRefunded: 0.0,
      NetAmountPaid: 0.0,
    };

    return {
      orderId,
      payments,
      refunds,
      summary: {
        totalPaid: parseFloat(summary.TotalPaid || 0),
        totalRefunded: parseFloat(summary.TotalRefunded || 0),
        netAmountPaid: parseFloat(summary.NetAmountPaid || 0),
      },
    };
  }

  /**
   * Lookup payment by Razorpay GatewayOrderId
   */
  async getByGatewayOrderId(gatewayOrderId) {
    const result = await executeProcedure('dbo.usp_Payment_GetByGatewayOrderId', {
      GatewayOrderId: gatewayOrderId,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Lookup payment by Razorpay GatewayPaymentId
   */
  async getByGatewayPaymentId(gatewayPaymentId) {
    const result = await executeProcedure('dbo.usp_Payment_GetByGatewayPaymentId', {
      GatewayPaymentId: gatewayPaymentId,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Lightweight payment status retrieval by PaymentId or PaymentReference
   */
  async getStatus(identifier) {
    const params = {};
    if (typeof identifier === 'number' || !isNaN(Number(identifier))) {
      params.PaymentId = Number(identifier);
    } else {
      params.PaymentReference = String(identifier);
    }

    const result = await executeProcedure('dbo.usp_Payment_GetStatus', params);
    return result.recordset?.[0] || null;
  }

  /**
   * List payments with filtering and pagination
   */
  async list(filters = {}) {
    const result = await executeProcedure('dbo.usp_Payment_List', {
      BranchId: filters.branchId || null,
      PaymentStatus: filters.paymentStatus || null,
      PaymentMethod: filters.paymentMethod || null,
      OrderId: filters.orderId || null,
      StartDate: filters.startDate || null,
      EndDate: filters.endDate || null,
      Page: filters.page || 1,
      Limit: filters.limit || 20,
    });

    const items = result.recordsets?.[0] || [];
    const meta = result.recordsets?.[1]?.[0] || {
      CurrentPage: filters.page || 1,
      PageLimit: filters.limit || 20,
      TotalRecords: items.length,
      TotalPages: 1,
    };

    return {
      items,
      pagination: {
        page: meta.CurrentPage,
        limit: meta.PageLimit,
        totalRecords: meta.TotalRecords,
        totalPages: meta.TotalPages,
      },
    };
  }

  /**
   * Financial reconciliation report
   */
  async getReconciliationSummary(filters = {}) {
    const result = await executeProcedure('dbo.usp_Payment_GetReconciliationSummary', {
      BranchId: filters.branchId || null,
      StartDate: filters.startDate || null,
      EndDate: filters.endDate || null,
    });

    const metrics = result.recordsets?.[0]?.[0] || {
      TotalTransactions: 0,
      GrossCollections: 0.0,
      TotalRefunds: 0.0,
      NetCollections: 0.0,
      SuccessCount: 0,
      FailedCount: 0,
      PendingCount: 0,
      FullyRefundedCount: 0,
    };

    const breakdownByMethod = result.recordsets?.[1] || [];

    return {
      metrics: {
        totalTransactions: metrics.TotalTransactions,
        grossCollections: parseFloat(metrics.GrossCollections || 0),
        totalRefunds: parseFloat(metrics.TotalRefunds || 0),
        netCollections: parseFloat(metrics.NetCollections || 0),
        successCount: metrics.SuccessCount,
        failedCount: metrics.FailedCount,
        pendingCount: metrics.PendingCount,
        fullyRefundedCount: metrics.FullyRefundedCount,
      },
      breakdownByMethod: breakdownByMethod.map(b => ({
        paymentMethod: b.PaymentMethod,
        transactionCount: b.TransactionCount,
        grossAmount: parseFloat(b.GrossAmount || 0),
        refundAmount: parseFloat(b.RefundAmount || 0),
        netAmount: parseFloat(b.NetAmount || 0),
      })),
    };
  }
}

module.exports = new PaymentRepository();

