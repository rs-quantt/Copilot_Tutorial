const BaseDAO = require("./BaseDAO");
const { InventoryTransaction } = require("../models");

/**
 * Inventory Transaction Data Access Object
 * Handles all database operations related to inventory transactions and audit trails
 */
class InventoryTransactionDAO extends BaseDAO {
  constructor() {
    super(InventoryTransaction);
  }

  /**
   * Create a new inventory transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(transactionData) {
    try {
      // Validate required fields
      const required = ["product", "type", "quantity"];
      for (const field of required) {
        if (!transactionData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Ensure quantity is correctly signed based on transaction type
      if (
        ["stock_out", "damaged", "expired", "returned"].includes(
          transactionData.type
        )
      ) {
        transactionData.quantity = Math.abs(transactionData.quantity) * -1;
      } else if (["stock_in", "adjustment"].includes(transactionData.type)) {
        transactionData.quantity = Math.abs(transactionData.quantity);
      }

      return await this.create(transactionData);
    } catch (error) {
      throw this._handleError(error, "CREATE_TRANSACTION");
    }
  }

  /**
   * Get transactions for a specific product
   * @param {string} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Product transactions with pagination
   */
  async getProductTransactions(productId, options = {}) {
    try {
      const filter = { product: productId };
      return await this.find(filter, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
        populate: "product",
      });
    } catch (error) {
      throw this._handleError(error, "GET_PRODUCT_TRANSACTIONS");
    }
  }

  /**
   * Get transactions by type
   * @param {string} type - Transaction type
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Transactions by type with pagination
   */
  async getTransactionsByType(type, options = {}) {
    try {
      const filter = { type };
      return await this.find(filter, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
        populate: "product",
      });
    } catch (error) {
      throw this._handleError(error, "GET_TRANSACTIONS_BY_TYPE");
    }
  }

  /**
   * Get transactions within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Transactions in date range with pagination
   */
  async getTransactionsByDateRange(startDate, endDate, options = {}) {
    try {
      const filter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };
      return await this.find(filter, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
        populate: "product",
      });
    } catch (error) {
      throw this._handleError(error, "GET_TRANSACTIONS_BY_DATE_RANGE");
    }
  }

  /**
   * Get transactions performed by a specific user
   * @param {string} userId - User ID or name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User transactions with pagination
   */
  async getTransactionsByUser(userId, options = {}) {
    try {
      const filter = { performedBy: userId };
      return await this.find(filter, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
        populate: "product",
      });
    } catch (error) {
      throw this._handleError(error, "GET_TRANSACTIONS_BY_USER");
    }
  }

  /**
   * Get recent transactions
   * @param {number} days - Number of days to look back (default: 7)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Recent transactions with pagination
   */
  async getRecentTransactions(days = 7, options = {}) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.getTransactionsByDateRange(
        startDate,
        new Date(),
        options
      );
    } catch (error) {
      throw this._handleError(error, "GET_RECENT_TRANSACTIONS");
    }
  }

  /**
   * Get inventory movements summary for a product
   * @param {string} productId - Product ID
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Inventory movements summary
   */
  async getInventoryMovements(productId, startDate = null, endDate = null) {
    try {
      const matchStage = { product: productId };

      if (startDate && endDate) {
        matchStage.createdAt = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        matchStage.createdAt = { $gte: startDate };
      } else if (endDate) {
        matchStage.createdAt = { $lte: endDate };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: "$type",
            totalQuantity: { $sum: "$quantity" },
            transactionCount: { $sum: 1 },
            totalCost: { $sum: { $multiply: ["$quantity", "$unitCost"] } },
            averageCost: { $avg: "$unitCost" },
            lastTransaction: { $max: "$createdAt" },
          },
        },
        { $sort: { totalQuantity: -1 } },
      ];

      const movements = await this.aggregate(pipeline);

      // Calculate totals
      const summary = {
        totalIn: 0,
        totalOut: 0,
        netMovement: 0,
        totalTransactions: 0,
        totalCost: 0,
        byType: {},
      };

      movements.forEach((movement) => {
        const type = movement._id;
        const quantity = movement.totalQuantity;

        summary.byType[type] = {
          quantity: quantity,
          count: movement.transactionCount,
          totalCost: movement.totalCost || 0,
          averageCost: movement.averageCost || 0,
          lastTransaction: movement.lastTransaction,
        };

        if (quantity > 0) {
          summary.totalIn += quantity;
        } else {
          summary.totalOut += Math.abs(quantity);
        }

        summary.totalTransactions += movement.transactionCount;
        summary.totalCost += movement.totalCost || 0;
      });

      summary.netMovement = summary.totalIn - summary.totalOut;

      return summary;
    } catch (error) {
      throw this._handleError(error, "GET_INVENTORY_MOVEMENTS");
    }
  }

  /**
   * Get transaction statistics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Transaction statistics
   */
  async getTransactionStats(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $facet: {
            byType: [
              {
                $group: {
                  _id: "$type",
                  count: { $sum: 1 },
                  totalQuantity: { $sum: "$quantity" },
                  totalCost: {
                    $sum: { $multiply: ["$quantity", "$unitCost"] },
                  },
                },
              },
            ],
            byDate: [
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                  },
                  count: { $sum: 1 },
                  totalQuantity: { $sum: "$quantity" },
                },
              },
              { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            ],
            byUser: [
              {
                $group: {
                  _id: "$performedBy",
                  count: { $sum: 1 },
                  totalQuantity: { $sum: "$quantity" },
                },
              },
              { $sort: { count: -1 } },
            ],
            overall: [
              {
                $group: {
                  _id: null,
                  totalTransactions: { $sum: 1 },
                  totalQuantityIn: {
                    $sum: {
                      $cond: [{ $gt: ["$quantity", 0] }, "$quantity", 0],
                    },
                  },
                  totalQuantityOut: {
                    $sum: {
                      $cond: [
                        { $lt: ["$quantity", 0] },
                        { $abs: "$quantity" },
                        0,
                      ],
                    },
                  },
                  totalCost: {
                    $sum: { $multiply: ["$quantity", "$unitCost"] },
                  },
                  uniqueProducts: { $addToSet: "$product" },
                },
              },
            ],
          },
        },
      ];

      const [stats] = await this.aggregate(pipeline);

      const overall = stats.overall[0] || {
        totalTransactions: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
        totalCost: 0,
        uniqueProducts: [],
      };

      return {
        period: {
          startDate,
          endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        },
        overall: {
          ...overall,
          uniqueProducts: overall.uniqueProducts.length,
          netQuantity: overall.totalQuantityIn - overall.totalQuantityOut,
        },
        byType: stats.byType,
        byDate: stats.byDate,
        byUser: stats.byUser,
      };
    } catch (error) {
      throw this._handleError(error, "GET_TRANSACTION_STATS");
    }
  }

  /**
   * Get low stock alerts based on recent transactions
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Array>} Products with concerning stock movement patterns
   */
  async getLowStockAlerts(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate },
            type: { $in: ["stock_out", "damaged", "expired"] },
          },
        },
        {
          $group: {
            _id: "$product",
            totalOut: { $sum: { $abs: "$quantity" } },
            transactionCount: { $sum: 1 },
            lastTransaction: { $max: "$createdAt" },
            averageOutPerDay: { $avg: { $abs: "$quantity" } },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: "$product",
        },
        {
          $match: {
            $expr: {
              $or: [
                { $lte: ["$product.quantity", "$product.lowStockThreshold"] },
                {
                  $lt: [
                    "$product.quantity",
                    { $multiply: ["$averageOutPerDay", 7] },
                  ],
                },
              ],
            },
          },
        },
        {
          $project: {
            product: "$product",
            totalOut: 1,
            transactionCount: 1,
            lastTransaction: 1,
            averageOutPerDay: 1,
            daysUntilEmpty: {
              $cond: [
                { $gt: ["$averageOutPerDay", 0] },
                { $divide: ["$product.quantity", "$averageOutPerDay"] },
                999,
              ],
            },
          },
        },
        { $sort: { daysUntilEmpty: 1 } },
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      throw this._handleError(error, "GET_LOW_STOCK_ALERTS");
    }
  }

  /**
   * Bulk create transactions
   * @param {Array} transactions - Array of transaction data
   * @returns {Promise<Object>} Bulk creation results
   */
  async bulkCreateTransactions(transactions) {
    try {
      const results = {
        successful: [],
        failed: [],
      };

      for (const transactionData of transactions) {
        try {
          const transaction = await this.createTransaction(transactionData);
          results.successful.push(transaction);
        } catch (error) {
          results.failed.push({
            data: transactionData,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      throw this._handleError(error, "BULK_CREATE_TRANSACTIONS");
    }
  }

  /**
   * Get transaction history with filters
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Filtered transaction history
   */
  async getTransactionHistory(filters = {}, options = {}) {
    try {
      const query = {};

      // Product filter
      if (filters.productId) {
        query.product = filters.productId;
      }

      // Type filter
      if (filters.type) {
        query.type = filters.type;
      }

      // User filter
      if (filters.user) {
        query.performedBy = { $regex: filters.user, $options: "i" };
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      // Quantity range filter
      if (filters.minQuantity || filters.maxQuantity) {
        query.quantity = {};
        if (filters.minQuantity) query.quantity.$gte = filters.minQuantity;
        if (filters.maxQuantity) query.quantity.$lte = filters.maxQuantity;
      }

      // Cost range filter
      if (filters.minCost || filters.maxCost) {
        query.unitCost = {};
        if (filters.minCost) query.unitCost.$gte = filters.minCost;
        if (filters.maxCost) query.unitCost.$lte = filters.maxCost;
      }

      // Reference filter
      if (filters.reference) {
        query.reference = { $regex: filters.reference, $options: "i" };
      }

      // Location filter
      if (filters.location) {
        query.location = { $regex: filters.location, $options: "i" };
      }

      return await this.find(query, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
        populate: "product",
      });
    } catch (error) {
      throw this._handleError(error, "GET_TRANSACTION_HISTORY");
    }
  }

  /**
   * Get monthly transaction summary
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlyTransactionSummary(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      return await this.getTransactionStats(startDate, endDate);
    } catch (error) {
      throw this._handleError(error, "GET_MONTHLY_SUMMARY");
    }
  }

  /**
   * Get audit trail for a product
   * @param {string} productId - Product ID
   * @param {number} limit - Maximum number of transactions to return
   * @returns {Promise<Array>} Audit trail transactions
   */
  async getProductAuditTrail(productId, limit = 50) {
    try {
      const { documents } = await this.find(
        { product: productId },
        {
          limit,
          sort: { createdAt: -1 },
          select:
            "type quantity previousQuantity newQuantity reason performedBy createdAt reference",
        }
      );

      return documents;
    } catch (error) {
      throw this._handleError(error, "GET_PRODUCT_AUDIT_TRAIL");
    }
  }
}

module.exports = InventoryTransactionDAO;
