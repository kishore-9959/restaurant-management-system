/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SUPPLIER CONTROLLER
 * File: backend/inventory-service/src/controllers/supplier.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { supplierService } = require('../services');
const { validateSupplierPayload } = require('../validators');

class SupplierController {
  /**
   * POST /api/v1/inventory/suppliers
   */
  async create(req, res, next) {
    try {
      const validationErrors = validateSupplierPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid supplier payload.',
          details: validationErrors,
        });
      }

      const supplier = await supplierService.createSupplier(req.body);

      return successResponse(res, {
        statusCode: 201,
        message: 'Supplier created successfully.',
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/suppliers/:id
   */
  async getById(req, res, next) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      const supplier = await supplierService.getSupplierById(supplierId);

      return successResponse(res, {
        message: 'Supplier retrieved successfully.',
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/suppliers
   */
  async list(req, res, next) {
    try {
      const filters = {
        branchId: req.query.branchId ? parseInt(req.query.branchId, 10) : null,
        search: req.query.search || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' || req.query.isActive === '1' : null,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await supplierService.listSuppliers(filters);

      return successResponse(res, {
        message: 'Suppliers retrieved successfully.',
        data: result.items,
        meta: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/inventory/suppliers/:id
   */
  async update(req, res, next) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      const updated = await supplierService.updateSupplier(supplierId, req.body);

      return successResponse(res, {
        message: 'Supplier updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/inventory/suppliers/:id
   */
  async delete(req, res, next) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      await supplierService.deleteSupplier(supplierId);

      return successResponse(res, {
        message: 'Supplier deleted successfully.',
        data: { supplierId, isDeleted: true },
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new SupplierController();
module.exports = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  list: controller.list.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
};

