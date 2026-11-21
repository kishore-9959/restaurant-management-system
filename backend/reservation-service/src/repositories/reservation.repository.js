/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION REPOSITORY
 * File: backend/reservation-service/src/repositories/reservation.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Reservation Service.
 *              Wraps all 16 stored procedures (SPs 210â€“225).
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class ReservationRepository {
  /**
   * SP 210: Create reservation
   */
  async createReservation({
    branchId,
    tableId = null,
    customerId = null,
    guestName,
    guestPhone,
    guestEmail = null,
    partySize,
    reservationDate,
    startTime,
    endTime = null,
    specialRequests = null,
    depositAmount = 0,
    depositPaymentId = null,
    createdByUserId = null,
  }) {
    const inputs = {
      BranchId: { type: sql.Int, value: Number(branchId) },
      TableId: { type: sql.Int, value: tableId ? Number(tableId) : null },
      CustomerId: { type: sql.BigInt, value: customerId ? Number(customerId) : null },
      GuestName: { type: sql.NVarChar(100), value: guestName },
      GuestPhone: { type: sql.NVarChar(25), value: guestPhone },
      GuestEmail: { type: sql.NVarChar(120), value: guestEmail || null },
      PartySize: { type: sql.Int, value: Number(partySize) },
      ReservationDate: { type: sql.Date, value: reservationDate },
      StartTime: { type: sql.VarChar(8), value: startTime },
      EndTime: { type: sql.VarChar(8), value: endTime || null },
      SpecialRequests: { type: sql.NVarChar(500), value: specialRequests || null },
      DepositAmount: { type: sql.Decimal(10, 2), value: depositAmount || 0 },
      DepositPaymentId: { type: sql.BigInt, value: depositPaymentId || null },
      CreatedByUserId: { type: sql.BigInt, value: createdByUserId ? Number(createdByUserId) : null },
    };

    const outputs = {
      NewReservationId: sql.BigInt,
    };

    const result = await executeProcedure('dbo.usp_Reservation_Create', inputs, outputs);
    const reservationId = result.output.NewReservationId || (result.recordset[0] && result.recordset[0].ReservationId);
    return reservationId;
  }

  /**
   * SP 211: Get reservation by ID
   */
  async getReservationById(reservationId) {
    const result = await executeProcedure('dbo.usp_Reservation_GetById', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
    });
    return result.recordset[0] || null;
  }

  /**
   * SP 212: List reservations with filters and pagination
   */
  async listReservations({
    branchId = null,
    reservationDate = null,
    startDate = null,
    endDate = null,
    status = null,
    tableId = null,
    search = null,
    page = 1,
    limit = 20,
  }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      ReservationDate: { type: sql.Date, value: reservationDate || null },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
      Status: { type: sql.NVarChar(30), value: status ? status.toUpperCase() : null },
      TableId: { type: sql.Int, value: tableId ? Number(tableId) : null },
      Search: { type: sql.NVarChar(100), value: search || null },
      Page: { type: sql.Int, value: Number(page) },
      Limit: { type: sql.Int, value: Number(limit) },
    };

    const outputs = {
      TotalCount: sql.Int,
    };

    const result = await executeProcedure('dbo.usp_Reservation_List', inputs, outputs);
    const total = result.output.TotalCount !== undefined ? result.output.TotalCount : 0;
    return {
      reservations: result.recordset || [],
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * SP 213: Update reservation
   */
  async updateReservation(reservationId, {
    guestName,
    guestPhone,
    guestEmail = null,
    partySize,
    reservationDate,
    startTime,
    endTime = null,
    specialRequests = null,
    depositAmount = null,
    updatedByUserId = null,
  }) {
    const inputs = {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
      GuestName: { type: sql.NVarChar(100), value: guestName },
      GuestPhone: { type: sql.NVarChar(25), value: guestPhone },
      GuestEmail: { type: sql.NVarChar(120), value: guestEmail || null },
      PartySize: { type: sql.Int, value: Number(partySize) },
      ReservationDate: { type: sql.Date, value: reservationDate },
      StartTime: { type: sql.VarChar(8), value: startTime },
      EndTime: { type: sql.VarChar(8), value: endTime || null },
      SpecialRequests: { type: sql.NVarChar(500), value: specialRequests || null },
      DepositAmount: { type: sql.Decimal(10, 2), value: depositAmount !== null ? depositAmount : null },
      UpdatedByUserId: { type: sql.BigInt, value: updatedByUserId ? Number(updatedByUserId) : null },
    };

    const result = await executeProcedure('dbo.usp_Reservation_Update', inputs);
    return result.recordset[0] || null;
  }

  /**
   * SP 214: Cancel reservation
   */
  async cancelReservation(reservationId, { cancellationReason = null, cancelledByUserId = null } = {}) {
    const result = await executeProcedure('dbo.usp_Reservation_Cancel', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
      CancellationReason: { type: sql.NVarChar(500), value: cancellationReason || null },
      CancelledByUserId: { type: sql.BigInt, value: cancelledByUserId ? Number(cancelledByUserId) : null },
    });
    return result.recordset[0] || { reservationId, status: 'CANCELLED' };
  }

  /**
   * SP 215: Update reservation status
   */
  async updateStatus(reservationId, { newStatus, updatedByUserId = null, notes = null }) {
    const result = await executeProcedure('dbo.usp_Reservation_UpdateStatus', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
      NewStatus: { type: sql.NVarChar(30), value: newStatus.toUpperCase() },
      UpdatedByUserId: { type: sql.BigInt, value: updatedByUserId ? Number(updatedByUserId) : null },
      Notes: { type: sql.NVarChar(500), value: notes || null },
    });
    return result.recordset[0] || { reservationId, status: newStatus };
  }

  /**
   * SP 216: Assign table to reservation
   */
  async assignTable(reservationId, { tableId, assignedByUserId = null }) {
    const result = await executeProcedure('dbo.usp_Reservation_AssignTable', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
      TableId: { type: sql.Int, value: Number(tableId) },
      AssignedByUserId: { type: sql.BigInt, value: assignedByUserId ? Number(assignedByUserId) : null },
    });
    return result.recordset[0] || null;
  }

  /**
   * SP 217: Release table from reservation
   */
  async releaseTable(reservationId, { releasedByUserId = null } = {}) {
    const result = await executeProcedure('dbo.usp_Reservation_ReleaseTable', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
      ReleasedByUserId: { type: sql.BigInt, value: releasedByUserId ? Number(releasedByUserId) : null },
    });
    return result.recordset[0] || { reservationId, tableId: null };
  }

  /**
   * SP 218: Check table availability
   */
  async checkAvailability({ branchId, reservationDate, startTime, partySize = 2, durationMinutes = null, sectionId = null }) {
    const result = await executeProcedure('dbo.usp_Reservation_CheckAvailability', {
      BranchId: { type: sql.Int, value: Number(branchId) },
      ReservationDate: { type: sql.Date, value: reservationDate },
      StartTime: { type: sql.VarChar(8), value: startTime },
      PartySize: { type: sql.Int, value: Number(partySize) },
      DurationMinutes: { type: sql.Int, value: durationMinutes ? Number(durationMinutes) : null },
      SectionId: { type: sql.Int, value: sectionId ? Number(sectionId) : null },
    });
    return result.recordset || [];
  }

  /**
   * SP 219: Get dynamic time slots
   */
  async getTimeSlots({ branchId, reservationDate, partySize = 2, slotIntervalMinutes = 30 }) {
    const result = await executeProcedure('dbo.usp_Reservation_GetTimeSlots', {
      BranchId: { type: sql.Int, value: Number(branchId) },
      ReservationDate: { type: sql.Date, value: reservationDate },
      PartySize: { type: sql.Int, value: Number(partySize) },
      SlotIntervalMinutes: { type: sql.Int, value: Number(slotIntervalMinutes) },
    });
    return result.recordset || [];
  }

  /**
   * SP 220: List reservations by customer
   */
  async listByCustomer(customerId, { page = 1, limit = 20 } = {}) {
    const inputs = {
      CustomerId: { type: sql.BigInt, value: Number(customerId) },
      Page: { type: sql.Int, value: Number(page) },
      Limit: { type: sql.Int, value: Number(limit) },
    };

    const outputs = {
      TotalCount: sql.Int,
    };

    const result = await executeProcedure('dbo.usp_Reservation_ListByCustomer', inputs, outputs);
    const total = result.output.TotalCount !== undefined ? result.output.TotalCount : 0;
    return {
      reservations: result.recordset || [],
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * SP 221: Dashboard summary
   */
  async getDashboardSummary(branchId, targetDate = null) {
    const result = await executeProcedure('dbo.usp_Reservation_GetDashboardSummary', {
      BranchId: { type: sql.Int, value: Number(branchId) },
      TargetDate: { type: sql.Date, value: targetDate || null },
    });
    return result.recordset[0] || null;
  }

  /**
   * SP 222: Create walk-in seating
   */
  async createWalkIn({
    branchId,
    tableId,
    guestName = 'Walk-In Guest',
    guestPhone = 'N/A',
    partySize = 2,
    specialRequests = null,
    createdByUserId = null,
  }) {
    const inputs = {
      BranchId: { type: sql.Int, value: Number(branchId) },
      TableId: { type: sql.Int, value: Number(tableId) },
      GuestName: { type: sql.NVarChar(100), value: guestName },
      GuestPhone: { type: sql.NVarChar(25), value: guestPhone },
      PartySize: { type: sql.Int, value: Number(partySize) },
      SpecialRequests: { type: sql.NVarChar(500), value: specialRequests || null },
      CreatedByUserId: { type: sql.BigInt, value: createdByUserId ? Number(createdByUserId) : null },
    };

    const outputs = {
      NewReservationId: sql.BigInt,
    };

    const result = await executeProcedure('dbo.usp_Reservation_CreateWalkIn', inputs, outputs);
    const reservationId = result.output.NewReservationId || (result.recordset[0] && result.recordset[0].ReservationId);
    return reservationId;
  }

  /**
   * SP 223: Floor timeline
   */
  async getFloorTimeline({ branchId, reservationDate = null, sectionId = null }) {
    const result = await executeProcedure('dbo.usp_Reservation_GetFloorTimeline', {
      BranchId: { type: sql.Int, value: Number(branchId) },
      ReservationDate: { type: sql.Date, value: reservationDate || null },
      SectionId: { type: sql.Int, value: sectionId ? Number(sectionId) : null },
    });
    return result.recordset || [];
  }

  /**
   * SP 224: Get status history / audit trail
   */
  async getStatusHistory(reservationId) {
    const result = await executeProcedure('dbo.usp_Reservation_GetStatusHistory', {
      ReservationId: { type: sql.BigInt, value: Number(reservationId) },
    });
    return result.recordset || [];
  }

  /**
   * SP 225: Automated sweep of no-shows
   */
  async autoMarkNoShows({ branchId = null, gracePeriodMinutes = 15, currentUtcDateTime = null } = {}) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      GracePeriodMinutes: { type: sql.Int, value: Number(gracePeriodMinutes) },
      CurrentUtcDateTime: { type: sql.DateTime2, value: currentUtcDateTime || null },
    };

    const outputs = {
      UpdatedCount: sql.Int,
    };

    const result = await executeProcedure('dbo.usp_Reservation_AutoMarkNoShows', inputs, outputs);
    return {
      updatedCount: result.output.UpdatedCount !== undefined ? result.output.UpdatedCount : 0,
      updatedReservations: result.recordset || [],
    };
  }
}

module.exports = new ReservationRepository();

