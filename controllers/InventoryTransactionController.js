const { inventoryTransactionDAO } = require("../daos");

/**
 * Inventory Transaction Controller
 * Handles all inventory transaction-related API endpoints
 */
class InventoryTransactionController {
  /**
   * Get all inventory transactions with filtering and pagination
   * GET /api/transactions
   */
  async getAllTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        product,
        startDate,
        endDate,
        performedBy,
        minQuantity,
        maxQuantity,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filters object
      const filters = {};
      if (type) filters.type = type;
      if (product) filters.product = product;
      if (performedBy) filters.performedBy = performedBy;
      if (minQuantity) filters.minQuantity = parseInt(minQuantity);
      if (maxQuantity) filters.maxQuantity = parseInt(maxQuantity);

      // Date range filter
      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      // Build options object
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      };

      const result = await inventoryTransactionDAO.advancedSearch(
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get single transaction by ID
   * GET /api/transactions/:id
   */
  async getTransactionById(req, res) {
    try {
      const { id } = req.params;
      const transaction = await inventoryTransactionDAO.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Error fetching transaction:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Create new inventory transaction
   * POST /api/transactions
   */
  async createTransaction(req, res) {
    try {
      const transaction = await inventoryTransactionDAO.createTransaction(
        req.body
      );

      res.status(201).json({
        success: true,
        data: transaction,
        message: "Transaction created successfully",
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get transactions by product
   * GET /api/transactions/product/:productId
   */
  async getTransactionsByProduct(req, res) {
    try {
      const { productId } = req.params;
      const { limit = 50, page = 1, type, startDate, endDate } = req.query;

      const filters = { product: productId };
      if (type) filters.type = type;
      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { createdAt: -1 },
      };

      const result = await inventoryTransactionDAO.getByProduct(
        productId,
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching transactions by product:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get transactions by type
   * GET /api/transactions/type/:type
   */
  async getTransactionsByType(req, res) {
    try {
      const { type } = req.params;
      const { limit = 50, page = 1, startDate, endDate } = req.query;

      const filters = {};
      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { createdAt: -1 },
      };

      const result = await inventoryTransactionDAO.getByType(
        type,
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching transactions by type:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get transactions by date range
   * GET /api/transactions/date-range
   */
  async getTransactionsByDateRange(req, res) {
    try {
      const {
        startDate,
        endDate,
        limit = 100,
        page = 1,
        type,
        product,
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        });
      }

      const dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };

      const filters = {};
      if (type) filters.type = type;
      if (product) filters.product = product;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { createdAt: -1 },
      };

      const result = await inventoryTransactionDAO.getByDateRange(
        dateRange,
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
          summary: {
            dateRange: {
              start: startDate,
              end: endDate,
            },
            totalTransactions:
              result.pagination?.totalDocuments || result.length,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching transactions by date range:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get recent transactions
   * GET /api/transactions/recent
   */
  async getRecentTransactions(req, res) {
    try {
      const { days = 7, limit = 50, page = 1, type } = req.query;

      const filters = {};
      if (type) filters.type = type;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await inventoryTransactionDAO.getRecentTransactions(
        parseInt(days),
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get transaction summary statistics
   * GET /api/transactions/summary
   */
  async getTransactionSummary(req, res) {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const summary = await inventoryTransactionDAO.getTransactionSummary(
        dateRange,
        groupBy
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error fetching transaction summary:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get inventory movement analysis
   * GET /api/transactions/movement-analysis
   */
  async getMovementAnalysis(req, res) {
    try {
      const { startDate, endDate, productId, category } = req.query;

      const filters = {};
      if (productId) filters.product = productId;
      if (category) filters.category = category;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const analysis = await inventoryTransactionDAO.getMovementAnalysis(
        dateRange,
        filters
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error("Error fetching movement analysis:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get audit trail for a product
   * GET /api/transactions/audit/:productId
   */
  async getAuditTrail(req, res) {
    try {
      const { productId } = req.params;
      const { limit = 100, page = 1, startDate, endDate } = req.query;

      const filters = {};
      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const auditTrail = await inventoryTransactionDAO.getAuditTrail(
        productId,
        filters,
        options
      );

      res.json({
        success: true,
        data: {
          auditTrail: auditTrail.documents,
          pagination: auditTrail.pagination,
          productId,
        },
      });
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get transactions requiring approval
   * GET /api/transactions/pending-approval
   */
  async getPendingApprovalTransactions(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { createdAt: 1 }, // Oldest first for approval queue
      };

      const result = await inventoryTransactionDAO.getPendingApproval(options);

      res.json({
        success: true,
        data: {
          transactions: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching pending approval transactions:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Approve a transaction
   * PATCH /api/transactions/:id/approve
   */
  async approveTransaction(req, res) {
    try {
      const { id } = req.params;
      const { approvedBy, approvalNotes } = req.body;

      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          error: "Approved by information is required",
        });
      }

      const result = await inventoryTransactionDAO.approveTransaction(
        id,
        approvedBy,
        approvalNotes
      );

      res.json({
        success: true,
        data: result,
        message: "Transaction approved successfully",
      });
    } catch (error) {
      console.error("Error approving transaction:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Reject a transaction
   * PATCH /api/transactions/:id/reject
   */
  async rejectTransaction(req, res) {
    try {
      const { id } = req.params;
      const { rejectedBy, rejectionReason } = req.body;

      if (!rejectedBy || !rejectionReason) {
        return res.status(400).json({
          success: false,
          error: "Rejected by and rejection reason are required",
        });
      }

      const result = await inventoryTransactionDAO.rejectTransaction(
        id,
        rejectedBy,
        rejectionReason
      );

      res.json({
        success: true,
        data: result,
        message: "Transaction rejected successfully",
      });
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Bulk create transactions
   * POST /api/transactions/bulk
   */
  async bulkCreateTransactions(req, res) {
    try {
      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Transactions array is required",
        });
      }

      const result = await inventoryTransactionDAO.bulkCreateTransactions(
        transactions
      );

      res.status(201).json({
        success: true,
        data: result,
        message: `${result.length} transactions created successfully`,
      });
    } catch (error) {
      console.error("Error bulk creating transactions:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Export transactions to CSV
   * GET /api/transactions/export
   */
  async exportTransactions(req, res) {
    try {
      const { startDate, endDate, type, product, format = "csv" } = req.query;

      // Build filters
      const filters = {};
      if (type) filters.type = type;
      if (product) filters.product = product;
      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      const exportData = await inventoryTransactionDAO.exportTransactions(
        filters,
        format
      );

      // Set appropriate headers for file download
      const filename = `inventory_transactions_${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        format === "csv" ? "text/csv" : "application/json"
      );

      res.send(exportData);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }
}

module.exports = new InventoryTransactionController();
