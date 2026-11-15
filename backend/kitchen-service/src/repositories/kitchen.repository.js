/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN REPOSITORY
 * File: backend/kitchen-service/src/repositories/kitchen.repository.js
 * Description: 100% Parameterized Stored Procedure execution for KDS.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class KitchenRepository {
  /**
   * Create a new KOT with idempotency check and station splitting.
   */
  async createKOT({ branchId, orderId, kitchenStation = 'MAIN_KITCHEN', specialKitchenNotes = null, itemIds = null }) {
    const itemIdsJson = Array.isArray(itemIds) && itemIds.length > 0 ? JSON.stringify(itemIds) : null;

    const result = await executeProcedure(
      'dbo.usp_KOT_Create',
      {
        BranchId: { type: sql.Int, value: branchId },
        OrderId: { type: sql.BigInt, value: orderId },
        KitchenStation: { type: sql.NVarChar(40), value: kitchenStation },
        SpecialKitchenNotes: { type: sql.NVarChar(500), value: specialKitchenNotes },
        ItemIdsJson: { type: sql.NVarChar(sql.MAX), value: itemIdsJson },
      },
      {
        KOTId: sql.BigInt,
        KOTNumber: sql.NVarChar(35),
        IsIdempotent: sql.Bit,
      }
    );

    return {
      kotId: result.output.KOTId,
      kotNumber: result.output.KOTNumber,
      isIdempotent: Boolean(result.output.IsIdempotent),
    };
  }

  /**
   * Retrieve KOT header, items, and addons (multi-recordset).
   */
  async getKOTById(kotId) {
    const result = await executeProcedure(
      'dbo.usp_KOT_GetById',
      {
        KOTId: { type: sql.BigInt, value: kotId },
      }
    );

    const header = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : null;
    if (!header) return null;

    const items = result.recordsets[1] || [];
    const addons = result.recordsets[2] || [];

    // Map addons to their corresponding items
    const itemsWithAddons = items.map((item) => ({
      ...item,
      addons: addons.filter((a) => String(a.OrderItemId) === String(item.OrderItemId)),
    }));

    return {
      ...header,
      items: itemsWithAddons,
    };
  }

  /**
   * Get all KOT tickets for a specific customer order.
   */
  async getKOTsByOrderId(orderId) {
    const result = await executeProcedure(
      'dbo.usp_KOT_GetByOrderId',
      {
        OrderId: { type: sql.BigInt, value: orderId },
      }
    );
    return result.recordset || [];
  }

  /**
   * Fetch live KDS board active tickets for a branch and optional station/status.
   */
  async getActiveBoard({ branchId, kitchenStation = null, ticketStatus = null }) {
    const result = await executeProcedure(
      'dbo.usp_KOT_GetActiveBoard',
      {
        BranchId: { type: sql.Int, value: branchId },
        KitchenStation: { type: sql.NVarChar(40), value: kitchenStation || null },
        TicketStatus: { type: sql.NVarChar(30), value: ticketStatus || null },
      }
    );
    return result.recordset || [];
  }

  /**
   * Update KOT ticket status (NEW -> PREPARING -> READY -> BUMPED).
   */
  async updateKOTStatus({ kotId, newStatus, updatedByUserId = null }) {
    await executeProcedure(
      'dbo.usp_KOT_UpdateStatus',
      {
        KOTId: { type: sql.BigInt, value: kotId },
        NewStatus: { type: sql.NVarChar(30), value: newStatus },
        UpdatedByUserId: { type: sql.BigInt, value: updatedByUserId || null },
      }
    );
    return true;
  }

  /**
   * Update single item preparation status with parent KOT auto-rollup.
   */
  async updateItemStatus({ kotItemId, newPreparationStatus }) {
    const result = await executeProcedure(
      'dbo.usp_KOT_UpdateItemStatus',
      {
        KOTItemId: { type: sql.BigInt, value: kotItemId },
        NewPreparationStatus: { type: sql.NVarChar(30), value: newPreparationStatus },
      },
      {
        ParentKOTStatus: sql.NVarChar(30),
        AllOrderKOTsReady: sql.Bit,
        ParentOrderId: sql.BigInt,
      }
    );

    return {
      parentKOTStatus: result.output.ParentKOTStatus,
      allOrderKOTsReady: Boolean(result.output.AllOrderKOTsReady),
      parentOrderId: result.output.ParentOrderId,
    };
  }

  /**
   * Bump ticket off the active KDS screen.
   */
  async bumpKOT({ kotId, bumpedByUserId = null }) {
    await executeProcedure(
      'dbo.usp_KOT_Bump',
      {
        KOTId: { type: sql.BigInt, value: kotId },
        BumpedByUserId: { type: sql.BigInt, value: bumpedByUserId || null },
      }
    );
    return true;
  }

  /**
   * Cancel and bump all active KOT tickets for an order.
   */
  async cancelByOrderId({ orderId, reason = null }) {
    const result = await executeProcedure(
      'dbo.usp_KOT_CancelByOrderId',
      {
        OrderId: { type: sql.BigInt, value: orderId },
        Reason: { type: sql.NVarChar(255), value: reason || null },
      },
      {
        CancelledKOTCount: sql.Int,
      }
    );
    return {
      cancelledKOTCount: result.output.CancelledKOTCount || 0,
    };
  }

  /**
   * Operational analytics and turnaround times for KDS.
   */
  async getMetrics({ branchId, date = null }) {
    const result = await executeProcedure(
      'dbo.usp_KOT_GetMetrics',
      {
        BranchId: { type: sql.Int, value: branchId },
        Date: { type: sql.Date, value: date || null },
      }
    );

    const summary = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : {};
    const stations = result.recordsets[1] || [];

    return {
      ...summary,
      stations,
    };
  }

  /**
   * Assign chef to a KOT ticket.
   */
  async assignChef({ kotId, chefUserId, assignedByUserId = null }) {
    await executeProcedure(
      'dbo.usp_KOT_AssignChef',
      {
        KOTId: { type: sql.BigInt, value: kotId },
        ChefUserId: { type: sql.BigInt, value: chefUserId },
        AssignedByUserId: { type: sql.BigInt, value: assignedByUserId || null },
      }
    );
    return true;
  }
}

module.exports = new KitchenRepository();

