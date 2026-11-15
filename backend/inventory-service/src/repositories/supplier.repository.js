/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SUPPLIER REPOSITORY
 * File: backend/inventory-service/src/repositories/supplier.repository.js
 * Description: Data access methods for Raw Material Suppliers using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class SupplierRepository {
  /**
   * Create a new raw material vendor
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_Supplier_Create', {
      BranchId: data.branchId || null,
      SupplierCode: data.supplierCode,
      SupplierName: data.supplierName,
      ContactPerson: data.contactPerson || null,
      Phone: data.phone,
      Email: data.email || null,
      Address: data.address || null,
      GSTIN: data.gstin || null,
      PaymentTerms: data.paymentTerms || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Get supplier by ID
   */
  async getById(supplierId) {
    const result = await executeProcedure('dbo.usp_Supplier_GetById', {
      SupplierId: supplierId,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * List suppliers with branch filter, search, and pagination
   */
  async list(filters = {}) {
    const result = await executeProcedure('dbo.usp_Supplier_List', {
      BranchId: filters.branchId || null,
      Search: filters.search || null,
      IsActive: filters.isActive !== undefined ? filters.isActive : null,
      Page: filters.page || 1,
      Limit: filters.limit || 20,
    });

    return {
      items: result.recordsets?.[0] || [],
      total: result.recordsets?.[1]?.[0]?.TotalCount || 0,
    };
  }

  /**
   * Update supplier details
   */
  async update(supplierId, data) {
    const result = await executeProcedure('dbo.usp_Supplier_Update', {
      SupplierId: supplierId,
      SupplierName: data.supplierName,
      ContactPerson: data.contactPerson || null,
      Phone: data.phone,
      Email: data.email || null,
      Address: data.address || null,
      GSTIN: data.gstin || null,
      PaymentTerms: data.paymentTerms || null,
      IsActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Soft-delete supplier
   */
  async delete(supplierId) {
    const result = await executeProcedure('dbo.usp_Supplier_Delete', {
      SupplierId: supplierId,
    });

    return result.recordset?.[0] || { Success: 1 };
  }
}

module.exports = new SupplierRepository();

