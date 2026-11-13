/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING TABLE & FLOOR REPOSITORY
 * File: backend/restaurant-service/src/repositories/diningTable.repository.js
 * Description: Data access methods for Dining Tables & Floor Plans using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class DiningTableRepository {
  async create(data) {
    const result = await executeProcedure('dbo.usp_DiningTable_Create', {
      BranchId: parseInt(data.branchId, 10),
      SectionId: parseInt(data.sectionId, 10),
      TableNumber: data.tableNumber,
      SeatingCapacity: data.seatingCapacity !== undefined ? parseInt(data.seatingCapacity, 10) : 4,
      QrCodeHash: data.qrCodeHash || null,
      PosX: data.posX !== undefined ? parseInt(data.posX, 10) : 0,
      PosY: data.posY !== undefined ? parseInt(data.posY, 10) : 0,
      CurrentStatus: data.currentStatus || 'AVAILABLE',
    });
    return result.recordset?.[0] || null;
  }

  async update(tableId, data) {
    const result = await executeProcedure('dbo.usp_DiningTable_Update', {
      TableId: parseInt(tableId, 10),
      SectionId: data.sectionId ? parseInt(data.sectionId, 10) : null,
      TableNumber: data.tableNumber || null,
      SeatingCapacity: data.seatingCapacity ? parseInt(data.seatingCapacity, 10) : null,
      PosX: data.posX !== undefined ? parseInt(data.posX, 10) : null,
      PosY: data.posY !== undefined ? parseInt(data.posY, 10) : null,
    });
    return result.recordset?.[0] || null;
  }

  async getById(tableId) {
    const result = await executeProcedure('dbo.usp_DiningTable_GetById', {
      TableId: parseInt(tableId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async getByQrHash(qrCodeHash) {
    const result = await executeProcedure('dbo.usp_DiningTable_GetByQrHash', {
      QrCodeHash: qrCodeHash,
    });
    return result.recordset?.[0] || null;
  }

  async listByBranch(branchId, { sectionId = null, currentStatus = null, isActive = null } = {}) {
    const result = await executeProcedure('dbo.usp_DiningTable_ListByBranch', {
      BranchId: parseInt(branchId, 10),
      SectionId: sectionId ? parseInt(sectionId, 10) : null,
      CurrentStatus: currentStatus ? currentStatus.toUpperCase() : null,
      IsActive: isActive === null ? null : (isActive ? 1 : 0),
    });
    return result.recordset || [];
  }

  async listBySection(sectionId, { isActive = null } = {}) {
    const result = await executeProcedure('dbo.usp_DiningTable_ListBySection', {
      SectionId: parseInt(sectionId, 10),
      IsActive: isActive === null ? null : (isActive ? 1 : 0),
    });
    return result.recordset || [];
  }

  async updateCapacity(tableId, seatingCapacity) {
    const result = await executeProcedure('dbo.usp_DiningTable_UpdateCapacity', {
      TableId: parseInt(tableId, 10),
      SeatingCapacity: parseInt(seatingCapacity, 10),
    });
    return result.recordset?.[0] || null;
  }

  async updateStatus(tableId, currentStatus, activeOrderId = null) {
    const result = await executeProcedure('dbo.usp_DiningTable_UpdateStatus', {
      TableId: parseInt(tableId, 10),
      CurrentStatus: currentStatus.toUpperCase(),
      ActiveOrderId: activeOrderId ? parseInt(activeOrderId, 10) : null,
    });
    return result.recordset?.[0] || null;
  }

  async getAvailable(branchId, { minCapacity = null, sectionId = null } = {}) {
    const result = await executeProcedure('dbo.usp_DiningTable_GetAvailable', {
      BranchId: parseInt(branchId, 10),
      MinCapacity: minCapacity ? parseInt(minCapacity, 10) : null,
      SectionId: sectionId ? parseInt(sectionId, 10) : null,
    });
    return result.recordset || [];
  }

  async getOccupied(branchId, { sectionId = null } = {}) {
    const result = await executeProcedure('dbo.usp_DiningTable_GetOccupied', {
      BranchId: parseInt(branchId, 10),
      SectionId: sectionId ? parseInt(sectionId, 10) : null,
    });
    return result.recordset || [];
  }

  async delete(tableId) {
    const result = await executeProcedure('dbo.usp_DiningTable_Delete', {
      TableId: parseInt(tableId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async getFloorLayout(branchId, floorLevel = null) {
    const result = await executeProcedure('dbo.usp_Floor_GetLayout', {
      BranchId: parseInt(branchId, 10),
      FloorLevel: floorLevel ? parseInt(floorLevel, 10) : null,
    });

    const summary = result.recordsets?.[0]?.[0] || {
      BranchId: parseInt(branchId, 10),
      TotalTables: 0,
      TotalSeatingCapacity: 0,
      AvailableTables: 0,
      OccupiedTables: 0,
      ReservedTables: 0,
      BilledTables: 0,
      CleaningTables: 0,
    };
    const sections = result.recordsets?.[1] || [];
    const tables = result.recordsets?.[2] || [];

    // Group tables under their respective sections
    const sectionsWithTables = sections.map((sec) => ({
      ...sec,
      tables: tables.filter((t) => t.SectionId === sec.SectionId),
    }));

    return {
      summary: {
        ...summary,
        utilizationRate: summary.TotalTables > 0
          ? Math.round(((summary.OccupiedTables + summary.BilledTables) / summary.TotalTables) * 100)
          : 0,
      },
      sections: sectionsWithTables,
      allTables: tables,
    };
  }
}

module.exports = new DiningTableRepository();

