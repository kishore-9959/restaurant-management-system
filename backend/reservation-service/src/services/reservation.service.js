/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION SERVICE
 * File: backend/reservation-service/src/services/reservation.service.js
 * Description: Business logic orchestration for reservations, floor scheduling,
 *              table status synchronization with Restaurant Service, and
 *              real-time notifications.
 * ============================================================================
 */

const { reservationRepository } = require('../repositories');
const restaurantClient = require('./restaurantClient');
const notificationClient = require('./notificationClient');
const { createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('reservation-service');

class ReservationService {
  /**
   * Create a new reservation (public or authenticated)
   */
  async createReservation(data, userContext = {}) {
    const userId = userContext.user?.userId || null;
    const isCustomer = userContext.user?.role === 'CUSTOMER';

    const customerId = isCustomer ? userId : (data.customerId || null);
    const createdByUserId = userId || null;

    const reservationId = await reservationRepository.createReservation({
      branchId: data.branchId,
      tableId: data.tableId || null,
      customerId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || null,
      partySize: data.partySize,
      reservationDate: data.reservationDate,
      startTime: data.startTime,
      endTime: data.endTime || null,
      specialRequests: data.specialRequests || null,
      depositAmount: data.depositAmount || 0,
      depositPaymentId: data.depositPaymentId || null,
      createdByUserId,
    });

    const reservation = await reservationRepository.getReservationById(reservationId);

    // Asynchronously dispatch notification
    notificationClient.broadcastReservationEvent({
      branchId: data.branchId,
      userId: customerId,
      event: 'RESERVATION_CREATED',
      title: 'New Reservation Booked',
      message: `${data.guestName} booked a table for ${data.partySize} on ${data.reservationDate} at ${data.startTime}.`,
      targetUrl: `/reservations/${reservationId}`,
      payload: { reservationId, ...data },
      correlationId: userContext.correlationId,
    }).catch(err => logger.warn(`Error broadcasting RESERVATION_CREATED: ${err.message}`));

    return reservation;
  }

  /**
   * Get single reservation by ID
   */
  async getReservationById(reservationId) {
    const reservation = await reservationRepository.getReservationById(reservationId);
    if (!reservation) {
      const error = new Error(`Reservation with ID ${reservationId} not found.`);
      error.statusCode = 404;
      error.code = 'RESERVATION_NOT_FOUND';
      throw error;
    }
    return reservation;
  }

  /**
   * List reservations with filtering and pagination
   */
  async listReservations(params) {
    return await reservationRepository.listReservations(params);
  }

  /**
   * Update reservation parameters
   */
  async updateReservation(reservationId, data, userContext = {}) {
    await this.getReservationById(reservationId); // Ensure exists

    const updated = await reservationRepository.updateReservation(reservationId, {
      ...data,
      updatedByUserId: userContext.user?.userId || null,
    });

    return updated;
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId, { cancellationReason = null } = {}, userContext = {}) {
    const existing = await this.getReservationById(reservationId);

    const result = await reservationRepository.cancelReservation(reservationId, {
      cancellationReason,
      cancelledByUserId: userContext.user?.userId || null,
    });

    // If reservation had an assigned table, sync table status back to AVAILABLE
    if (existing.TableId) {
      restaurantClient.updateTableStatus(existing.TableId, 'AVAILABLE', {
        userToken: userContext.token,
        correlationId: userContext.correlationId,
      }).catch(err => logger.warn(`Failed to set Table ${existing.TableId} to AVAILABLE on cancel: ${err.message}`));
    }

    // Broadcast cancellation alert
    notificationClient.broadcastReservationEvent({
      branchId: existing.BranchId,
      userId: existing.CustomerId,
      event: 'RESERVATION_CANCELLED',
      title: 'Reservation Cancelled',
      message: `Reservation #${reservationId} for ${existing.GuestName} has been cancelled.`,
      targetUrl: `/reservations/${reservationId}`,
      payload: { reservationId, cancellationReason },
      correlationId: userContext.correlationId,
    }).catch(err => logger.warn(`Error broadcasting RESERVATION_CANCELLED: ${err.message}`));

    return result;
  }

  /**
   * Transition status (CONFIRMED -> SEATED -> COMPLETED / NO_SHOW)
   */
  async updateStatus(reservationId, { newStatus, notes = null }, userContext = {}) {
    const existing = await this.getReservationById(reservationId);

    const result = await reservationRepository.updateStatus(reservationId, {
      newStatus,
      updatedByUserId: userContext.user?.userId || null,
      notes,
    });

    // Synchronize physical table status with restaurant-service
    if (newStatus === 'SEATED' && existing.TableId) {
      restaurantClient.updateTableStatus(existing.TableId, 'OCCUPIED', {
        userToken: userContext.token,
        correlationId: userContext.correlationId,
      }).catch(err => logger.warn(`Failed to set Table ${existing.TableId} to OCCUPIED: ${err.message}`));
    } else if ((newStatus === 'COMPLETED' || newStatus === 'NO_SHOW') && existing.TableId) {
      restaurantClient.updateTableStatus(existing.TableId, 'AVAILABLE', {
        userToken: userContext.token,
        correlationId: userContext.correlationId,
      }).catch(err => logger.warn(`Failed to set Table ${existing.TableId} to AVAILABLE: ${err.message}`));
    }

    // Broadcast status transition
    notificationClient.broadcastReservationEvent({
      branchId: existing.BranchId,
      userId: existing.CustomerId,
      event: `RESERVATION_${newStatus}`,
      title: `Reservation ${newStatus}`,
      message: `Reservation #${reservationId} status changed to ${newStatus}.`,
      targetUrl: `/reservations/${reservationId}`,
      payload: { reservationId, newStatus, notes },
      correlationId: userContext.correlationId,
    }).catch(err => logger.warn(`Error broadcasting status event: ${err.message}`));

    return result;
  }

  /**
   * Assign physical table to reservation
   */
  async assignTable(reservationId, { tableId }, userContext = {}) {
    await this.getReservationById(reservationId);

    const updated = await reservationRepository.assignTable(reservationId, {
      tableId,
      assignedByUserId: userContext.user?.userId || null,
    });

    return updated;
  }

  /**
   * Release assigned table
   */
  async releaseTable(reservationId, userContext = {}) {
    const existing = await this.getReservationById(reservationId);

    const result = await reservationRepository.releaseTable(reservationId, {
      releasedByUserId: userContext.user?.userId || null,
    });

    if (existing.TableId) {
      restaurantClient.updateTableStatus(existing.TableId, 'AVAILABLE', {
        userToken: userContext.token,
        correlationId: userContext.correlationId,
      }).catch(err => logger.warn(`Failed to release Table ${existing.TableId}: ${err.message}`));
    }

    return result;
  }

  /**
   * Check table availability
   */
  async checkAvailability(params) {
    return await reservationRepository.checkAvailability(params);
  }

  /**
   * Get dynamic time slots
   */
  async getTimeSlots(params) {
    return await reservationRepository.getTimeSlots(params);
  }

  /**
   * List customer's reservations
   */
  async listByCustomer(customerId, params) {
    return await reservationRepository.listByCustomer(customerId, params);
  }

  /**
   * Operational dashboard summary KPIs
   */
  async getDashboardSummary(branchId, targetDate = null) {
    return await reservationRepository.getDashboardSummary(branchId, targetDate);
  }

  /**
   * Create instant walk-in seating
   */
  async createWalkIn(data, userContext = {}) {
    const reservationId = await reservationRepository.createWalkIn({
      branchId: data.branchId,
      tableId: data.tableId,
      guestName: data.guestName || 'Walk-In Guest',
      guestPhone: data.guestPhone || 'N/A',
      partySize: data.partySize || 2,
      specialRequests: data.specialRequests || null,
      createdByUserId: userContext.user?.userId || null,
    });

    // Mark table as OCCUPIED
    restaurantClient.updateTableStatus(data.tableId, 'OCCUPIED', {
      userToken: userContext.token,
      correlationId: userContext.correlationId,
    }).catch(err => logger.warn(`Failed to set Table ${data.tableId} to OCCUPIED on walk-in: ${err.message}`));

    const reservation = await reservationRepository.getReservationById(reservationId);

    notificationClient.broadcastReservationEvent({
      branchId: data.branchId,
      event: 'WALK_IN_SEATED',
      title: 'Walk-In Guest Seated',
      message: `Walk-in party of ${data.partySize || 2} seated at Table #${data.tableId}.`,
      targetUrl: `/reservations/${reservationId}`,
      payload: { reservationId, tableId: data.tableId },
      correlationId: userContext.correlationId,
    }).catch(err => logger.warn(`Error broadcasting WALK_IN_SEATED: ${err.message}`));

    return reservation;
  }

  /**
   * Visual floor timeline / Gantt data
   */
  async getFloorTimeline(params) {
    return await reservationRepository.getFloorTimeline(params);
  }

  /**
   * Reservation status history / audit trail
   */
  async getStatusHistory(reservationId) {
    return await reservationRepository.getStatusHistory(reservationId);
  }

  /**
   * Automated sweep of overdue no-shows
   */
  async autoMarkNoShows({ branchId = null, gracePeriodMinutes = 15, currentUtcDateTime = null } = {}, userContext = {}) {
    const sweepResult = await reservationRepository.autoMarkNoShows({
      branchId,
      gracePeriodMinutes,
      currentUtcDateTime,
    });

    logger.info(`Automated no-show sweep completed. Marked ${sweepResult.updatedCount} reservations.`);
    return sweepResult;
  }

  /**
   * Public lookup for guest self-service booking retrieval
   */
  async publicLookup({ reservationId, guestPhone, guestEmail }) {
    if (reservationId) {
      const reservation = await this.getReservationById(reservationId);
      // Verify phone or email match for privacy protection
      if (guestPhone && reservation.GuestPhone !== guestPhone.trim()) {
        const error = new Error('Reservation details do not match the provided phone number.');
        error.statusCode = 403;
        error.code = 'VERIFICATION_FAILED';
        throw error;
      }
      if (guestEmail && reservation.GuestEmail && reservation.GuestEmail.toLowerCase() !== guestEmail.trim().toLowerCase()) {
        const error = new Error('Reservation details do not match the provided email.');
        error.statusCode = 403;
        error.code = 'VERIFICATION_FAILED';
        throw error;
      }
      return reservation;
    }

    if (guestPhone) {
      const result = await reservationRepository.listReservations({
        search: guestPhone.trim(),
        limit: 10,
      });
      return result.reservations;
    }

    const error = new Error('ReservationId or GuestPhone is required for booking lookup.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

module.exports = new ReservationService();

