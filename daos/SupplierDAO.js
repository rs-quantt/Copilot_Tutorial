const BaseDAO = require("./BaseDAO");
const { Supplier } = require("../models");

/**
 * Supplier Data Access Object
 * Handles all database operations related to suppliers
 */
class SupplierDAO extends BaseDAO {
  constructor() {
    super(Supplier);
  }

  /**
   * Search suppliers by name, code, or contact information
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options (limit, skip, sort)
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchTerm, options = {}) {
    try {
      const searchFilter = {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { code: { $regex: searchTerm, $options: "i" } },
          { "contact.email": { $regex: searchTerm, $options: "i" } },
          { "primaryContact.name": { $regex: searchTerm, $options: "i" } },
          { tags: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      };

      return await this.find(searchFilter, options);
    } catch (error) {
      throw this._handleError(error, "SEARCH");
    }
  }

  /**
   * Find supplier by code
   * @param {string} code - Supplier code
   * @returns {Promise<Object|null>} Supplier or null
   */
  async findByCode(code) {
    try {
      return await this.findOne({ code: code.toUpperCase() });
    } catch (error) {
      throw this._handleError(error, "FIND_BY_CODE");
    }
  }

  /**
   * Get active suppliers
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Active suppliers with pagination
   */
  async getActiveSuppliers(options = {}) {
    try {
      const filter = { status: "active" };
      return await this.find(filter, {
        ...options,
        sort: { name: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_ACTIVE_SUPPLIERS");
    }
  }

  /**
   * Get suppliers by payment terms
   * @param {string} paymentTerms - Payment terms (e.g., 'net_30', 'net_15')
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Suppliers with specific payment terms
   */
  async getByPaymentTerms(paymentTerms, options = {}) {
    try {
      const filter = {
        paymentTerms,
        status: "active",
      };
      return await this.find(filter, options);
    } catch (error) {
      throw this._handleError(error, "GET_BY_PAYMENT_TERMS");
    }
  }

  /**
   * Get suppliers by rating range
   * @param {number} minRating - Minimum rating
   * @param {number} maxRating - Maximum rating
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Suppliers within rating range
   */
  async getByRatingRange(minRating, maxRating = 5, options = {}) {
    try {
      const filter = {
        rating: { $gte: minRating, $lte: maxRating },
        status: "active",
      };
      return await this.find(filter, {
        ...options,
        sort: { rating: -1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_BY_RATING_RANGE");
    }
  }

  /**
   * Get suppliers by location
   * @param {string} location - City, state, or country
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Suppliers in location
   */
  async getByLocation(location, options = {}) {
    try {
      const filter = {
        $or: [
          { "address.city": { $regex: location, $options: "i" } },
          { "address.state": { $regex: location, $options: "i" } },
          { "address.country": { $regex: location, $options: "i" } },
        ],
        status: "active",
      };
      return await this.find(filter, options);
    } catch (error) {
      throw this._handleError(error, "GET_BY_LOCATION");
    }
  }

  /**
   * Update supplier rating
   * @param {string} supplierId - Supplier ID
   * @param {number} rating - New rating (1-5)
   * @param {string} reason - Reason for rating change
   * @returns {Promise<Object>} Updated supplier
   */
  async updateRating(supplierId, rating, reason = "") {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      const supplier = await this.findById(supplierId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const previousRating = supplier.rating;
      const updatedSupplier = await this.updateById(supplierId, {
        rating,
        lastRatingUpdate: new Date(),
      });

      return {
        supplier: updatedSupplier,
        ratingChange: {
          previous: previousRating,
          current: rating,
          difference: rating - previousRating,
          reason,
        },
      };
    } catch (error) {
      throw this._handleError(error, "UPDATE_RATING");
    }
  }

  /**
   * Update supplier credit limit
   * @param {string} supplierId - Supplier ID
   * @param {number} creditLimit - New credit limit
   * @param {string} reason - Reason for change
   * @returns {Promise<Object>} Updated supplier
   */
  async updateCreditLimit(supplierId, creditLimit, reason = "") {
    try {
      if (creditLimit < 0) {
        throw new Error("Credit limit cannot be negative");
      }

      const supplier = await this.findById(supplierId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const previousLimit = supplier.creditLimit;
      const updatedSupplier = await this.updateById(supplierId, {
        creditLimit,
        lastCreditUpdate: new Date(),
      });

      return {
        supplier: updatedSupplier,
        creditChange: {
          previous: previousLimit,
          current: creditLimit,
          difference: creditLimit - previousLimit,
          reason,
        },
      };
    } catch (error) {
      throw this._handleError(error, "UPDATE_CREDIT_LIMIT");
    }
  }

  /**
   * Get supplier statistics
   * @returns {Promise<Object>} Supplier statistics
   */
  async getSupplierStats() {
    try {
      const pipeline = [
        {
          $facet: {
            statusStats: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            paymentTermsStats: [
              {
                $match: { status: "active" },
              },
              {
                $group: {
                  _id: "$paymentTerms",
                  count: { $sum: 1 },
                },
              },
            ],
            ratingStats: [
              {
                $match: { status: "active" },
              },
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: "$rating" },
                  totalRated: {
                    $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] },
                  },
                  highRating: {
                    $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
                  },
                  lowRating: {
                    $sum: { $cond: [{ $lt: ["$rating", 3] }, 1, 0] },
                  },
                },
              },
            ],
            creditStats: [
              {
                $match: { status: "active" },
              },
              {
                $group: {
                  _id: null,
                  totalCreditLimit: { $sum: "$creditLimit" },
                  averageCreditLimit: { $avg: "$creditLimit" },
                  maxCreditLimit: { $max: "$creditLimit" },
                  minCreditLimit: { $min: "$creditLimit" },
                },
              },
            ],
            locationStats: [
              {
                $match: { status: "active" },
              },
              {
                $group: {
                  _id: "$address.country",
                  count: { $sum: 1 },
                },
              },
              {
                $sort: { count: -1 },
              },
            ],
          },
        },
      ];

      const [stats] = await this.aggregate(pipeline);

      // Format status stats
      const statusCounts = {};
      stats.statusStats.forEach((item) => {
        statusCounts[item._id] = item.count;
      });

      // Format payment terms stats
      const paymentTermsCounts = {};
      stats.paymentTermsStats.forEach((item) => {
        paymentTermsCounts[item._id] = item.count;
      });

      // Format rating stats
      const ratingStats = stats.ratingStats[0] || {
        averageRating: 0,
        totalRated: 0,
        highRating: 0,
        lowRating: 0,
      };

      // Format credit stats
      const creditStats = stats.creditStats[0] || {
        totalCreditLimit: 0,
        averageCreditLimit: 0,
        maxCreditLimit: 0,
        minCreditLimit: 0,
      };

      // Format location stats
      const locationCounts = {};
      stats.locationStats.forEach((item) => {
        locationCounts[item._id || "Unknown"] = item.count;
      });

      return {
        total: Object.values(statusCounts).reduce(
          (sum, count) => sum + count,
          0
        ),
        byStatus: statusCounts,
        byPaymentTerms: paymentTermsCounts,
        byLocation: locationCounts,
        ratings: {
          average: parseFloat((ratingStats.averageRating || 0).toFixed(2)),
          totalRated: ratingStats.totalRated,
          highRating: ratingStats.highRating,
          lowRating: ratingStats.lowRating,
        },
        credit: {
          total: parseFloat((creditStats.totalCreditLimit || 0).toFixed(2)),
          average: parseFloat((creditStats.averageCreditLimit || 0).toFixed(2)),
          max: creditStats.maxCreditLimit || 0,
          min: creditStats.minCreditLimit || 0,
        },
      };
    } catch (error) {
      throw this._handleError(error, "GET_SUPPLIER_STATS");
    }
  }

  /**
   * Get top suppliers by rating
   * @param {number} limit - Number of suppliers to return
   * @returns {Promise<Array>} Top rated suppliers
   */
  async getTopRatedSuppliers(limit = 10) {
    try {
      const { documents } = await this.find(
        { status: "active", rating: { $gt: 0 } },
        {
          limit,
          sort: { rating: -1, name: 1 },
          select: "name code rating contact.email address.city address.country",
        }
      );
      return documents;
    } catch (error) {
      throw this._handleError(error, "GET_TOP_RATED_SUPPLIERS");
    }
  }

  /**
   * Bulk update supplier status
   * @param {Array} supplierIds - Array of supplier IDs
   * @param {string} status - New status
   * @param {string} reason - Reason for change
   * @returns {Promise<Object>} Update results
   */
  async bulkUpdateStatus(supplierIds, status, reason = "") {
    try {
      const validStatuses = ["active", "inactive", "suspended"];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      const result = await this.updateMany(
        { _id: { $in: supplierIds } },
        {
          status,
          lastStatusUpdate: new Date(),
          statusUpdateReason: reason,
        }
      );

      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        status,
        reason,
      };
    } catch (error) {
      throw this._handleError(error, "BULK_UPDATE_STATUS");
    }
  }

  /**
   * Get suppliers with expiring contracts
   * @param {number} days - Days ahead to check (default: 30)
   * @returns {Promise<Array>} Suppliers with expiring contracts
   */
  async getSuppliersWithExpiringContracts(days = 30) {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);

      const { documents } = await this.find(
        {
          status: "active",
          contractExpiry: { $lte: expirationDate, $gte: new Date() },
        },
        {
          sort: { contractExpiry: 1 },
        }
      );

      return documents;
    } catch (error) {
      throw this._handleError(error, "GET_EXPIRING_CONTRACTS");
    }
  }

  /**
   * Advanced search with multiple filters
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Filtered suppliers with pagination
   */
  async advancedSearch(filters = {}, options = {}) {
    try {
      const query = {};

      // Text search
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { code: { $regex: filters.search, $options: "i" } },
          { "contact.email": { $regex: filters.search, $options: "i" } },
          { "primaryContact.name": { $regex: filters.search, $options: "i" } },
        ];
      }

      // Status filter
      if (filters.status) {
        query.status = filters.status;
      }

      // Rating range
      if (filters.minRating || filters.maxRating) {
        query.rating = {};
        if (filters.minRating) query.rating.$gte = filters.minRating;
        if (filters.maxRating) query.rating.$lte = filters.maxRating;
      }

      // Credit limit range
      if (filters.minCreditLimit || filters.maxCreditLimit) {
        query.creditLimit = {};
        if (filters.minCreditLimit)
          query.creditLimit.$gte = filters.minCreditLimit;
        if (filters.maxCreditLimit)
          query.creditLimit.$lte = filters.maxCreditLimit;
      }

      // Payment terms filter
      if (filters.paymentTerms) {
        query.paymentTerms = filters.paymentTerms;
      }

      // Location filter
      if (filters.location) {
        query.$or = [
          { "address.city": { $regex: filters.location, $options: "i" } },
          { "address.state": { $regex: filters.location, $options: "i" } },
          { "address.country": { $regex: filters.location, $options: "i" } },
        ];
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      return await this.find(query, options);
    } catch (error) {
      throw this._handleError(error, "ADVANCED_SEARCH");
    }
  }
}

module.exports = SupplierDAO;
