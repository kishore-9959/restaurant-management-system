/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION CONTROLLER
 * File: backend/reservation-service/src/controllers/reservation.controller.js
 * Description: HTTP request and response handler for Reservation Service.
 * ============================================================================
 */

const { reservationService } = require('../services');
const {
  validateCreateReservation,
  validateUpdateReservation,
  validateUpdateStatus,
  validateAssignTable,
  validateWalkIn,
} = require('../validators');
const { successResponse, errorResponse } = require('@rms/shared');

class ReservationController {
  /**
   * POST /api/v1/reservations/public/book & POST /api/v1/reservations
   */
  async createReservation(req, res) {
    try {
      const validation = validateCreateReservation(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for reservation creation.',
          errors: validation.errors,
        });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const reservation = await reservationService.createReservation(req.body, userContext);

      return successResponse(res, {
        statusCode: 201,
        message: 'Reservation booked successfully.',
        data: reservation,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'RESERVATION_CREATE_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/:id
   */
  async getReservationById(req, res) {
    try {
      const reservationId = req.params.id;
      const reservation = await reservationService.getReservationById(reservationId);

      return successResponse(res, {
        statusCode: 200,
        message: 'Reservation retrieved successfully.',
        data: reservation,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: err.statusCode || 500,
        code: err.code || 'GET_RESERVATION_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations
   */
  async listReservations(req, res) {
    try {
      const {
        branchId,
        reservationDate,
        startDate,
        endDate,
        status,
        tableId,
        search,
        page,
        limit,
      } = req.query;

      const result = await reservationService.listReservations({
        branchId,
        reservationDate,
        startDate,
        endDate,
        status,
        tableId,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Reservations listed successfully.',
        data: result.reservations,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'LIST_RESERVATIONS_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * PUT /api/v1/reservations/:id
   */
  async updateReservation(req, res) {
    try {
      const reservationId = req.params.id;
      const validation = validateUpdateReservation(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for reservation update.',
          errors: validation.errors,
        });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const updated = await reservationService.updateReservation(reservationId, req.body, userContext);

      return successResponse(res, {
        statusCode: 200,
        message: 'Reservation updated successfully.',
        data: updated,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'UPDATE_RESERVATION_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * PATCH /api/v1/reservations/:id/cancel & POST /api/v1/reservations/public/:id/cancel
   */
  async cancelReservation(req, res) {
    try {
      const reservationId = req.params.id;
      const { cancellationReason, guestPhone, guestEmail } = req.body;

      // If called publicly without user token, verify phone or email
      if (!req.user && (guestPhone || guestEmail)) {
        await reservationService.publicLookup({ reservationId, guestPhone, guestEmail });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const result = await reservationService.cancelReservation(reservationId, { cancellationReason }, userContext);

      return successResponse(res, {
        statusCode: 200,
        message: 'Reservation cancelled successfully.',
        data: result,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'CANCEL_RESERVATION_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * PATCH /api/v1/reservations/:id/status
   */
  async updateStatus(req, res) {
    try {
      const reservationId = req.params.id;
      const validation = validateUpdateStatus(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for status update.',
          errors: validation.errors,
        });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const result = await reservationService.updateStatus(
        reservationId,
        {
          newStatus: req.body.status,
          notes: req.body.notes,
        },
        userContext
      );

      return successResponse(res, {
        statusCode: 200,
        message: `Reservation status transitioned to ${req.body.status}.`,
        data: result,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'STATUS_UPDATE_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * PATCH /api/v1/reservations/:id/assign-table
   */
  async assignTable(req, res) {
    try {
      const reservationId = req.params.id;
      const validation = validateAssignTable(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for table assignment.',
          errors: validation.errors,
        });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const updated = await reservationService.assignTable(
        reservationId,
        { tableId: req.body.tableId },
        userContext
      );

      return successResponse(res, {
        statusCode: 200,
        message: 'Table assigned successfully.',
        data: updated,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'ASSIGN_TABLE_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * PATCH /api/v1/reservations/:id/release-table
   */
  async releaseTable(req, res) {
    try {
      const reservationId = req.params.id;
      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const result = await reservationService.releaseTable(reservationId, userContext);

      return successResponse(res, {
        statusCode: 200,
        message: 'Table released successfully.',
        data: result,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'RELEASE_TABLE_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/public/branches/:branchId/availability
   */
  async checkAvailability(req, res) {
    try {
      const { branchId } = req.params;
      const { reservationDate, startTime, partySize, durationMinutes, sectionId } = req.query;

      if (!reservationDate || !startTime) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'reservationDate and startTime query parameters are required.',
        });
      }

      const tables = await reservationService.checkAvailability({
        branchId: parseInt(branchId, 10),
        reservationDate,
        startTime,
        partySize: partySize ? parseInt(partySize, 10) : 2,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        sectionId: sectionId ? parseInt(sectionId, 10) : null,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Available tables retrieved.',
        data: tables,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'CHECK_AVAILABILITY_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/public/branches/:branchId/slots
   */
  async getTimeSlots(req, res) {
    try {
      const { branchId } = req.params;
      const { reservationDate, partySize, interval } = req.query;

      if (!reservationDate) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'reservationDate query parameter is required in YYYY-MM-DD format.',
        });
      }

      const slots = await reservationService.getTimeSlots({
        branchId: parseInt(branchId, 10),
        reservationDate,
        partySize: partySize ? parseInt(partySize, 10) : 2,
        slotIntervalMinutes: interval ? parseInt(interval, 10) : 30,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Available time slots retrieved.',
        data: slots,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'GET_SLOTS_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/my-bookings
   */
  async listMyBookings(req, res) {
    try {
      const customerId = req.user?.userId;
      if (!customerId) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'User authentication required.',
        });
      }

      const { page, limit } = req.query;
      const result = await reservationService.listByCustomer(customerId, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Customer bookings retrieved successfully.',
        data: result.reservations,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'MY_BOOKINGS_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/summary
   */
  async getDashboardSummary(req, res) {
    try {
      const { branchId, date } = req.query;
      const effectiveBranchId = branchId ? parseInt(branchId, 10) : (req.user?.branchId || 1);

      const summary = await reservationService.getDashboardSummary(effectiveBranchId, date);

      return successResponse(res, {
        statusCode: 200,
        message: 'Reservation dashboard summary retrieved.',
        data: summary,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'DASHBOARD_SUMMARY_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/reservations/walk-in
   */
  async createWalkIn(req, res) {
    try {
      const validation = validateWalkIn(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for walk-in creation.',
          errors: validation.errors,
        });
      }

      const userContext = {
        user: req.user,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
        correlationId: req.headers['x-correlation-id'],
      };

      const reservation = await reservationService.createWalkIn(req.body, userContext);

      return successResponse(res, {
        statusCode: 201,
        message: 'Walk-in seated successfully.',
        data: reservation,
      });
    } catch (err) {
      const statusCode = err.statusCode || (err.number && err.number >= 50000 ? 400 : 500);
      return errorResponse(res, {
        statusCode,
        code: err.code || 'WALK_IN_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/timeline
   */
  async getFloorTimeline(req, res) {
    try {
      const { branchId, date, sectionId } = req.query;
      const effectiveBranchId = branchId ? parseInt(branchId, 10) : (req.user?.branchId || 1);

      const timeline = await reservationService.getFloorTimeline({
        branchId: effectiveBranchId,
        reservationDate: date,
        sectionId: sectionId ? parseInt(sectionId, 10) : null,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Floor timeline retrieved.',
        data: timeline,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'TIMELINE_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/:id/history
   */
  async getStatusHistory(req, res) {
    try {
      const reservationId = req.params.id;
      const history = await reservationService.getStatusHistory(reservationId);

      return successResponse(res, {
        statusCode: 200,
        message: 'Status history retrieved.',
        data: history,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'HISTORY_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/reservations/sweep-no-shows
   */
  async sweepNoShows(req, res) {
    try {
      const { branchId, gracePeriodMinutes } = req.body;
      const result = await reservationService.autoMarkNoShows({
        branchId: branchId ? parseInt(branchId, 10) : null,
        gracePeriodMinutes: gracePeriodMinutes ? parseInt(gracePeriodMinutes, 10) : 15,
      });

      return successResponse(res, {
        statusCode: 200,
        message: `Swept overdue no-shows. Marked ${result.updatedCount} bookings.`,
        data: result,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'SWEEP_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/reservations/public/lookup
   */
  async publicLookup(req, res) {
    try {
      const { reservationId, guestPhone, guestEmail } = req.query;
      const data = await reservationService.publicLookup({
        reservationId: reservationId ? parseInt(reservationId, 10) : null,
        guestPhone,
        guestEmail,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Booking details retrieved.',
        data,
      });
    } catch (err) {
      return errorResponse(res, {
        statusCode: err.statusCode || 500,
        code: err.code || 'LOOKUP_ERROR',
        message: err.message,
      });
    }
  }
}

module.exports = new ReservationController();

