const { supplierDAO } = require("../daos");

/**
 * Supplier Controller
 * Handles all supplier-related API endpoints
 */
class SupplierController {
  /**
   * Get all suppliers with filtering and pagination
   * GET /api/suppliers
   */
  async getAllSuppliers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status = "active",
        minRating,
        maxRating,
        location,
        paymentTerms,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filters object
      const filters = {};
      if (search) filters.search = search;
      if (minRating) filters.minRating = parseFloat(minRating);
      if (maxRating) filters.maxRating = parseFloat(maxRating);
      if (location) filters.location = location;
      if (paymentTerms) filters.paymentTerms = paymentTerms;

      // Build options object
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      };

      const result = await supplierDAO.advancedSearch(filters, options);

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get single supplier by ID
   * GET /api/suppliers/:id
   */
  async getSupplierById(req, res) {
    try {
      const { id } = req.params;
      const supplier = await supplierDAO.findById(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: "Supplier not found",
        });
      }

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      console.error("Error fetching supplier:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Create new supplier
   * POST /api/suppliers
   */
  async createSupplier(req, res) {
    try {
      const supplier = await supplierDAO.create(req.body);

      res.status(201).json({
        success: true,
        data: supplier,
        message: "Supplier created successfully",
      });
    } catch (error) {
      console.error("Error creating supplier:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Update supplier by ID
   * PUT /api/suppliers/:id
   */
  async updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const supplier = await supplierDAO.updateById(id, req.body);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: "Supplier not found",
        });
      }

      res.json({
        success: true,
        data: supplier,
        message: "Supplier updated successfully",
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Delete supplier (soft delete)
   * DELETE /api/suppliers/:id
   */
  async deleteSupplier(req, res) {
    try {
      const { id } = req.params;
      const supplier = await supplierDAO.findById(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: "Supplier not found",
        });
      }

      // Soft delete by setting status to inactive
      await supplierDAO.updateById(id, { status: "inactive" });

      res.json({
        success: true,
        message: "Supplier deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Search suppliers
   * GET /api/suppliers/search
   */
  async searchSuppliers(req, res) {
    try {
      const { q, limit = 10, page = 1 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await supplierDAO.search(q, options);

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error searching suppliers:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get top-rated suppliers
   * GET /api/suppliers/top-rated
   */
  async getTopRatedSuppliers(req, res) {
    try {
      const { limit = 10, page = 1 } = req.query;
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await supplierDAO.getTopRated(options);

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching top-rated suppliers:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get suppliers with low credit limits
   * GET /api/suppliers/low-credit
   */
  async getLowCreditSuppliers(req, res) {
    try {
      const { threshold = 5000, limit = 50, page = 1 } = req.query;
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await supplierDAO.getLowCredit(
        parseFloat(threshold),
        options
      );

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching low credit suppliers:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get suppliers by location
   * GET /api/suppliers/location/:location
   */
  async getSuppliersByLocation(req, res) {
    try {
      const { location } = req.params;
      const { limit = 50, page = 1 } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await supplierDAO.getByLocation(location, options);

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching suppliers by location:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get suppliers by payment terms
   * GET /api/suppliers/payment-terms/:terms
   */
  async getSuppliersByPaymentTerms(req, res) {
    try {
      const { terms } = req.params;
      const { limit = 50, page = 1 } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await supplierDAO.getByPaymentTerms(terms, options);

      res.json({
        success: true,
        data: {
          suppliers: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching suppliers by payment terms:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Update supplier rating
   * PATCH /api/suppliers/:id/rating
   */
  async updateSupplierRating(req, res) {
    try {
      const { id } = req.params;
      const { rating, performanceNotes } = req.body;

      if (typeof rating !== "number" || rating < 0 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Rating must be a number between 0 and 5",
        });
      }

      const result = await supplierDAO.updateRating(
        id,
        rating,
        performanceNotes
      );

      res.json({
        success: true,
        data: result,
        message: "Supplier rating updated successfully",
      });
    } catch (error) {
      console.error("Error updating supplier rating:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Update supplier credit limit
   * PATCH /api/suppliers/:id/credit-limit
   */
  async updateCreditLimit(req, res) {
    try {
      const { id } = req.params;
      const { creditLimit, reason = "Manual adjustment" } = req.body;

      if (typeof creditLimit !== "number" || creditLimit < 0) {
        return res.status(400).json({
          success: false,
          error: "Valid credit limit is required",
        });
      }

      const result = await supplierDAO.updateCreditLimit(
        id,
        creditLimit,
        reason
      );

      res.json({
        success: true,
        data: result,
        message: "Supplier credit limit updated successfully",
      });
    } catch (error) {
      console.error("Error updating credit limit:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get supplier statistics
   * GET /api/suppliers/:id/statistics
   */
  async getSupplierStatistics(req, res) {
    try {
      const { id } = req.params;
      const statistics = await supplierDAO.getSupplierStatistics(id);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Error fetching supplier statistics:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get supplier performance analysis
   * GET /api/suppliers/:id/performance
   */
  async getSupplierPerformance(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const performance = await supplierDAO.getPerformanceAnalysis(
        id,
        dateRange
      );

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error("Error fetching supplier performance:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Add supplier review/note
   * POST /api/suppliers/:id/reviews
   */
  async addSupplierReview(req, res) {
    try {
      const { id } = req.params;
      const { rating, review, reviewer = "System" } = req.body;

      if (!review || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Valid rating (1-5) and review text are required",
        });
      }

      const supplier = await supplierDAO.findById(id);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: "Supplier not found",
        });
      }

      // Add review to supplier's performance notes
      const reviewEntry = {
        date: new Date(),
        rating,
        review,
        reviewer,
      };

      supplier.performanceNotes = supplier.performanceNotes || [];
      supplier.performanceNotes.push(reviewEntry);

      // Update overall rating (average of all reviews)
      const totalRating = supplier.performanceNotes.reduce(
        (sum, note) => sum + (note.rating || 0),
        0
      );
      const avgRating = totalRating / supplier.performanceNotes.length;

      const updatedSupplier = await supplierDAO.updateById(id, {
        performanceNotes: supplier.performanceNotes,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      });

      res.json({
        success: true,
        data: updatedSupplier,
        message: "Supplier review added successfully",
      });
    } catch (error) {
      console.error("Error adding supplier review:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }
}

module.exports = new SupplierController();
