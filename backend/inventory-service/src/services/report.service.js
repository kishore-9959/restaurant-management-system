/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY REPORT SERVICE
 * File: backend/inventory-service/src/services/report.service.js
 * Description: Business logic for Valuation and Consumption Analytics.
 * ============================================================================
 */

const { reportRepository } = require('../repositories');

class ReportService {
  /**
   * Get stock asset valuation report
   */
  async getValuationReport(branchId = null, category = null) {
    return reportRepository.getValuationReport(branchId, category);
  }

  /**
   * Get consumption and spoilage analytics report
   */
  async getConsumptionReport(branchId = null, startDate = null, endDate = null) {
    return reportRepository.getConsumptionReport(branchId, startDate, endDate);
  }
}

module.exports = new ReportService();

