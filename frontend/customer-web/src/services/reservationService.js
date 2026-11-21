/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION FRONTEND SERVICE
 * File: frontend/customer-web/src/services/reservationService.js
 * Description: Client API client for customer table reservations.
 * ============================================================================
 */

import api from './api';

export const reservationService = {
  /**
   * Fetch active branches for reservation branch dropdown
   */
  async getBranches() {
    try {
      // Try CMS/restaurant public branches or fallback
      const response = await api.get('/cms/public/branches');
      return response.data?.data || [];
    } catch {
      return [
        { BranchId: 1, BranchName: 'Indiranagar Flagship', OpeningTime: '10:00:00', ClosingTime: '23:30:00' },
        { BranchId: 2, BranchName: 'Koramangala 4th Block', OpeningTime: '11:00:00', ClosingTime: '00:00:00' },
      ];
    }
  },

  /**
   * Fetch real-time available time slots for a branch, date and party size
   */
  async getTimeSlots(branchId, reservationDate, partySize = 2) {
    const response = await api.get(`/reservations/public/branches/${branchId}/slots`, {
      params: { reservationDate, partySize },
    });
    return response.data?.data || [];
  },

  /**
   * Check table availability for specific branch, date, time, party size
   */
  async checkAvailability(branchId, reservationDate, startTime, partySize = 2) {
    const response = await api.get(`/reservations/public/branches/${branchId}/availability`, {
      params: { reservationDate, startTime, partySize },
    });
    return response.data?.data || [];
  },

  /**
   * Submit new public table reservation
   */
  async createReservation(payload) {
    const response = await api.post('/reservations/public/book', payload);
    return response.data?.data || null;
  },

  /**
   * Look up existing reservation by ID / Phone
   */
  async lookupReservation({ reservationId, guestPhone, guestEmail }) {
    const response = await api.get('/reservations/public/lookup', {
      params: { reservationId, guestPhone, guestEmail },
    });
    return response.data?.data || null;
  },

  /**
   * Cancel public reservation with guest phone or email verification
   */
  async cancelReservation(reservationId, { cancellationReason, guestPhone, guestEmail }) {
    const response = await api.post(`/reservations/public/${reservationId}/cancel`, {
      cancellationReason,
      guestPhone,
      guestEmail,
    });
    return response.data?.data || null;
  },
};

export default reservationService;

