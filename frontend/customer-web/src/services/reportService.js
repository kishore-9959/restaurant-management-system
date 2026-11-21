/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE CLIENT
 * File: frontend/customer-web/src/services/reportService.js
 * Description: Client API wrapper for /api/v1/reports endpoints.
 * ============================================================================
 */

import api from './api';

function getAuthHeaders() {
  const token = localStorage.getItem('rms_staff_token') || localStorage.getItem('rms_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const reportService = {
  // 1. Executive Dashboard
  async getDashboardSummary(params = {}) {
    const res = await api.get('/reports/dashboard/summary', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 2. Sales Daily
  async getSalesDaily(params = {}) {
    const res = await api.get('/reports/sales/daily', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 3. Sales Trends
  async getSalesTrends(params = {}) {
    const res = await api.get('/reports/sales/trends', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 4. Revenue Summary
  async getRevenueSummary(params = {}) {
    const res = await api.get('/reports/revenue/summary', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 5. Revenue by Payment Method
  async getRevenueByPaymentMethod(params = {}) {
    const res = await api.get('/reports/revenue/payment-methods', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 6. Orders Summary
  async getOrdersSummary(params = {}) {
    const res = await api.get('/reports/orders/summary', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 7. Top Selling Items
  async getTopSellingItems(params = {}) {
    const res = await api.get('/reports/orders/top-items', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 8. Inventory Current Stock & Alerts
  async getInventoryCurrentStock(params = {}) {
    const res = await api.get('/reports/inventory/summary', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  async getInventoryLowStock(params = {}) {
    const res = await api.get('/reports/inventory/low-stock', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 9. Branch Performance Scorecard
  async getBranchPerformance(params = {}) {
    const res = await api.get('/reports/branches/performance', {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // 10. File Export Download
  async downloadExport(reportType, format = 'excel', params = {}) {
    const res = await api.get(`/reports/export/${reportType}`, {
      params: { ...params, format },
      headers: getAuthHeaders(),
      responseType: 'blob',
    });

    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const extension = format === 'excel' ? 'xlsx' : format;
    link.setAttribute('download', `${reportType}_report_${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;

