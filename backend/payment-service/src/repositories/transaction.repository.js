/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - TRANSACTION REPOSITORY
 * File: backend/payment-service/src/repositories/transaction.repository.js
 * Description: Data access methods for Payment Transactions audit ledger.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class TransactionRepository {
  /**
   * Log an event, raw webhook payload, or gateway interaction in the ledger
   */
  async logTransaction(data) {
    const result = await executeProcedure('dbo.usp_Payment_LogTransaction', {
      PaymentId: data.paymentId,
      TransactionType: data.transactionType, // 'CHARGE', 'WEBHOOK_CAPTURE', 'REFUND', 'FAILURE'
      Amount: data.amount !== undefined ? data.amount : 0.0,
      GatewayTransactionId: data.gatewayTransactionId || null,
      GatewayResponseCode: data.gatewayResponseCode || null,
      GatewayPayloadJson: data.gatewayPayloadJson ? (typeof data.gatewayPayloadJson === 'string' ? data.gatewayPayloadJson : JSON.stringify(data.gatewayPayloadJson)) : null,
      Status: data.status || 'SUCCESS',
    });

    return result.recordset?.[0] || null;
  }
}

module.exports = new TransactionRepository();

