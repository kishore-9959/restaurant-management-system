/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ADMIN ANALYTICS DASHBOARD
 * File: frontend/customer-web/src/pages/AdminAnalyticsDashboard.jsx
 * Description: Executive intelligence dashboard featuring real-time KPIs,
 *              sales trends, revenue breakdowns, top dishes, and branch scorecards.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { reportService } from '../services/reportService';

export default function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [rangePreset, setRangePreset] = useState('30d');
  const [branchId, setBranchId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const calculateDateRange = (preset) => {
    const end = new Date();
    const start = new Date();
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (preset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (preset === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (preset === '90d') {
      start.setDate(end.getDate() - 90);
    }
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = calculateDateRange(rangePreset);
      const params = {
        branchId: branchId || undefined,
        startDate,
        endDate,
      };

      try {
        const [dashRes, trendsRes, pmRes, topRes, branchRes] = await Promise.allSettled([
          reportService.getDashboardSummary(params),
          reportService.getSalesDaily(params),
          reportService.getRevenueByPaymentMethod(params),
          reportService.getTopSellingItems({ ...params, topN: 5 }),
          reportService.getBranchPerformance({ startDate, endDate }),
        ]);

        if (isMounted) {
          if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
            setKpis(dashRes.value.data.kpiSummary || {});
          }
          if (trendsRes.status === 'fulfilled' && Array.isArray(trendsRes.value?.data)) {
            setSalesTrends(trendsRes.value.data);
          }
          if (pmRes.status === 'fulfilled' && Array.isArray(pmRes.value?.data)) {
            setPaymentMethods(pmRes.value.data);
          }
          if (topRes.status === 'fulfilled' && Array.isArray(topRes.value?.data)) {
            setTopItems(topRes.value.data);
          }
          if (branchRes.status === 'fulfilled' && Array.isArray(branchRes.value?.data)) {
            setBranchPerformance(branchRes.value.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load executive analytics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();
    return () => { isMounted = false; };
  }, [rangePreset, branchId, refreshTrigger]);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const { startDate, endDate } = calculateDateRange(rangePreset);
      await reportService.downloadExport('sales-daily', format, {
        branchId: branchId || undefined,
        startDate,
        endDate,
      });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* Top Banner & Title */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
              EXECUTIVE INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400">RMS Port 8013</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Enterprise Analytics Cockpit
          </h1>
          <p className="text-sm text-slate-400">
            Real-time financial reconciliation, order velocities, covers, and multi-unit performance
          </p>
        </div>

        {/* Global Controls: Date Range, Branch, Refresh & Export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Selector */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-medium">
            {['today', '7d', '30d', '90d'].map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  rangePreset === preset
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 py-1">
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
              >
                <span>📊 Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
              >
                <span>📄 CSV Stream</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
              >
                <span>📑 PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="max-w-7xl mx-auto mt-4 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Net Revenue */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold tracking-wider uppercase">Net Cash Revenue</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                ₹{kpis?.NetRevenue !== undefined ? Number(kpis.NetRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Gross: ₹{kpis?.GrossSales ? Number(kpis.GrossSales).toLocaleString('en-IN') : '0'}</span>
              <span className="text-rose-400">Refunds: ₹{kpis?.TotalRefunds ? Number(kpis.TotalRefunds).toLocaleString('en-IN') : '0'}</span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold tracking-wider uppercase">Total Orders</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <ShoppingBag className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {kpis?.TotalOrders !== undefined ? Number(kpis.TotalOrders).toLocaleString() : '0'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400">Completed: {kpis?.CompletedOrders || 0}</span>
              <span className="text-rose-400">Cancelled: {kpis?.CancelledOrders || 0}</span>
            </div>
          </div>

          {/* Card 3: Covers & Diners */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold tracking-wider uppercase">Covers & Bookings</span>
              <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {kpis?.ExpectedCovers !== undefined ? Number(kpis.ExpectedCovers).toLocaleString() : '0'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Reservations: {kpis?.TotalReservations || 0}</span>
              <span className="text-purple-400">AOV: ₹{kpis?.AverageOrderValue || '0.00'}</span>
            </div>
          </div>

          {/* Card 4: Inventory Alerts */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold tracking-wider uppercase">Stock Alerts</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                {kpis?.LowStockAlertCount !== undefined ? kpis.LowStockAlertCount : '0'}
              </span>
              <span className="text-xs text-slate-400">Items Under Safety Stock</span>
            </div>
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Automatic BOM Depletion Active</span>
            </div>
          </div>
        </div>

        {/* Charts & Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Daily Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Sales Volume & Revenue Trend
                </h3>
                <p className="text-xs text-slate-400">Daily net sales and order progression</p>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-md">
                {rangePreset.toUpperCase()}
              </span>
            </div>

            {/* Pure SVG Bar/Line Chart */}
            <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-700 overflow-x-auto">
              {salesTrends.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  No sales trends recorded for this window
                </div>
              ) : (
                salesTrends.map((point, idx) => {
                  const maxNet = Math.max(...salesTrends.map((t) => Number(t.NetSales) || 1));
                  const heightPercent = Math.max((Number(point.NetSales) / maxNet) * 100, 8);
                  return (
                    <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-12 bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div>{new Date(point.SaleDate).toLocaleDateString()}</div>
                        <div className="text-emerald-400 font-bold">₹{Number(point.NetSales).toLocaleString()}</div>
                        <div className="text-slate-400">{point.OrderCount} orders</div>
                      </div>
                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md group-hover:from-blue-500 group-hover:to-cyan-400 transition-all cursor-pointer"
                      />
                      {/* Date label */}
                      <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">
                        {new Date(point.SaleDate).getDate()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Methods Distribution (1 Col) */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Payment Channels
              </h3>
              <p className="text-xs text-slate-400 mb-4">Gross collections by gateway & method</p>

              <div className="space-y-3">
                {paymentMethods.length === 0 ? (
                  <div className="text-xs text-slate-500 py-8 text-center">No payment transactions found</div>
                ) : (
                  paymentMethods.map((pm, idx) => {
                    const totalGross = paymentMethods.reduce((acc, curr) => acc + Number(curr.GrossAmount), 0);
                    const pct = totalGross > 0 ? Math.round((Number(pm.GrossAmount) / totalGross) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-200">{pm.PaymentMethod}</span>
                          <span className="text-slate-400">
                            ₹{Number(pm.GrossAmount).toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0
                                ? 'bg-blue-500'
                                : idx === 1
                                ? 'bg-emerald-500'
                                : idx === 2
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>PCI-DSS Compliant</span>
              <span className="text-emerald-400">Reconciled</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Selling Items & Branch Scorecard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Items */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1">Top Selling Menu Items</h3>
            <p className="text-xs text-slate-400 mb-4">Ranked by revenue contribution</p>

            <div className="space-y-2">
              {topItems.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">No item velocity recorded</div>
              ) : (
                topItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white">{item.ItemName}</div>
                        <div className="text-[10px] text-slate-400">{item.CategoryName || 'General'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">₹{Number(item.TotalRevenue).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">{item.UnitsSold} sold</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Branch Performance Scorecard */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1">Branch Performance Matrix</h3>
            <p className="text-xs text-slate-400 mb-4">Comparative ranking across locations</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Branch</th>
                    <th className="pb-2 text-right">Orders</th>
                    <th className="pb-2 text-right">Net Revenue</th>
                    <th className="pb-2 text-right">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {branchPerformance.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-slate-500">
                        No branch performance data available
                      </td>
                    </tr>
                  ) : (
                    branchPerformance.map((bp, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200">
                          <div>{bp.BranchName}</div>
                          <div className="text-[10px] text-slate-500">{bp.City}</div>
                        </td>
                        <td className="py-2.5 text-right font-medium">{bp.TotalOrders}</td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          ₹{Number(bp.TotalRevenue).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">₹{bp.AverageOrderValue || '0.00'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

