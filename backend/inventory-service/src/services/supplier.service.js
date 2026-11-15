/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SUPPLIER SERVICE
 * File: backend/inventory-service/src/services/supplier.service.js
 * Description: Business logic, validation, and domain rules for Vendors / Suppliers.
 * ============================================================================
 */

const { supplierRepository } = require('../repositories');

class SupplierService {
  /**
   * Create vendor
   */
  async createSupplier(data) {
    if (!data.supplierName || !data.phone) {
      const err = new Error('supplierName and phone are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    const supplierCode = data.supplierCode || `SUP-${Date.now().toString().slice(-6)}`;
    const payload = { ...data, supplierCode };

    try {
      return await supplierRepository.create(payload);
    } catch (err) {
      if (err.message && err.message.includes('SUPPLIER_CODE_EXISTS')) {
        const error = new Error(`Supplier with code '${supplierCode}' already exists.`);
        error.statusCode = 409;
        error.code = 'SUPPLIER_CODE_EXISTS';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Get vendor by ID
   */
  async getSupplierById(supplierId) {
    const supplier = await supplierRepository.getById(supplierId);
    if (!supplier) {
      const err = new Error(`Supplier #${supplierId} not found.`);
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }
    return supplier;
  }

  /**
   * List vendors with pagination
   */
  async listSuppliers(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));

    const { items, total } = await supplierRepository.list({
      ...filters,
      page,
      limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update vendor details
   */
  async updateSupplier(supplierId, data) {
    await this.getSupplierById(supplierId);
    return supplierRepository.update(supplierId, data);
  }

  /**
   * Soft-delete vendor
   */
  async deleteSupplier(supplierId) {
    await this.getSupplierById(supplierId);
    return supplierRepository.delete(supplierId);
  }
}

module.exports = new SupplierService();
