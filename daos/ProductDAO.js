const BaseDAO = require("./BaseDAO");
const { Product } = require("../models");

/**
 * Product Data Access Object
 * Handles all database operations related to products
 */
class ProductDAO extends BaseDAO {
  constructor() {
    super(Product);
  }

  /**
   * Search products by name, description, or category
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options (limit, skip, sort)
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchTerm, options = {}) {
    try {
      const searchFilter = {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { category: { $regex: searchTerm, $options: "i" } },
          { sku: { $regex: searchTerm, $options: "i" } },
          { tags: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      };

      return await this.find(searchFilter, options);
    } catch (error) {
      throw this._handleError(error, "SEARCH");
    }
  }

  /**
   * Get products with low stock (quantity <= lowStockThreshold)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Low stock products with pagination
   */
  async getLowStockProducts(options = {}) {
    try {
      const filter = {
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
        status: "active",
      };

      return await this.find(filter, {
        ...options,
        sort: { quantity: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_LOW_STOCK");
    }
  }

  /**
   * Get out of stock products (quantity = 0)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Out of stock products with pagination
   */
  async getOutOfStockProducts(options = {}) {
    try {
      const filter = {
        quantity: 0,
        status: "active",
      };

      return await this.find(filter, options);
    } catch (error) {
      throw this._handleError(error, "GET_OUT_OF_STOCK");
    }
  }

  /**
   * Get products by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Products in category with pagination
   */
  async getByCategory(category, options = {}) {
    try {
      const filter = {
        category: { $regex: category, $options: "i" },
        status: "active",
      };

      return await this.find(filter, options);
    } catch (error) {
      throw this._handleError(error, "GET_BY_CATEGORY");
    }
  }

  /**
   * Get products by supplier
   * @param {string} supplierName - Supplier name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Products from supplier with pagination
   */
  async getBySupplier(supplierName, options = {}) {
    try {
      const filter = {
        "supplier.name": { $regex: supplierName, $options: "i" },
        status: "active",
      };

      return await this.find(filter, options);
    } catch (error) {
      throw this._handleError(error, "GET_BY_SUPPLIER");
    }
  }

  /**
   * Get products within price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Products in price range with pagination
   */
  async getByPriceRange(minPrice, maxPrice, options = {}) {
    try {
      const filter = {
        price: { $gte: minPrice, $lte: maxPrice },
        status: "active",
      };

      return await this.find(filter, {
        ...options,
        sort: { price: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_BY_PRICE_RANGE");
    }
  }

  /**
   * Update product quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @param {string} reason - Reason for quantity change
   * @returns {Promise<Object>} Updated product
   */
  async updateQuantity(productId, quantity, reason = "Manual adjustment") {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const previousQuantity = product.quantity;
      const updatedProduct = await this.updateById(productId, { quantity });

      // Note: In a full implementation, you might want to create an inventory transaction here
      // This would require importing the InventoryTransactionDAO

      return {
        product: updatedProduct,
        quantityChange: {
          previous: previousQuantity,
          current: quantity,
          difference: quantity - previousQuantity,
          reason,
        },
      };
    } catch (error) {
      throw this._handleError(error, "UPDATE_QUANTITY");
    }
  }

  /**
   * Bulk update product quantities
   * @param {Array} updates - Array of {productId, quantity} objects
   * @returns {Promise<Object>} Update results
   */
  async bulkUpdateQuantities(updates) {
    try {
      const results = {
        successful: [],
        failed: [],
      };

      for (const update of updates) {
        try {
          const result = await this.updateQuantity(
            update.productId,
            update.quantity,
            update.reason || "Bulk update"
          );
          results.successful.push({
            productId: update.productId,
            result,
          });
        } catch (error) {
          results.failed.push({
            productId: update.productId,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      throw this._handleError(error, "BULK_UPDATE_QUANTITIES");
    }
  }

  /**
   * Get inventory statistics
   * @returns {Promise<Object>} Inventory statistics
   */
  async getInventoryStats() {
    try {
      const pipeline = [
        {
          $match: { status: "active" },
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$price"] } },
            averagePrice: { $avg: "$price" },
            lowStockProducts: {
              $sum: {
                $cond: [{ $lte: ["$quantity", "$lowStockThreshold"] }, 1, 0],
              },
            },
            outOfStockProducts: {
              $sum: {
                $cond: [{ $eq: ["$quantity", 0] }, 1, 0],
              },
            },
          },
        },
      ];

      const [stats] = await this.aggregate(pipeline);

      if (!stats) {
        return {
          totalProducts: 0,
          totalQuantity: 0,
          totalValue: 0,
          averagePrice: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
        };
      }

      return {
        totalProducts: stats.totalProducts || 0,
        totalQuantity: stats.totalQuantity || 0,
        totalValue: parseFloat((stats.totalValue || 0).toFixed(2)),
        averagePrice: parseFloat((stats.averagePrice || 0).toFixed(2)),
        lowStockProducts: stats.lowStockProducts || 0,
        outOfStockProducts: stats.outOfStockProducts || 0,
      };
    } catch (error) {
      throw this._handleError(error, "GET_INVENTORY_STATS");
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Array>} Category statistics
   */
  async getCategoryStats() {
    try {
      const pipeline = [
        {
          $match: { status: "active" },
        },
        {
          $group: {
            _id: "$category",
            productCount: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$price"] } },
            averagePrice: { $avg: "$price" },
          },
        },
        {
          $sort: { productCount: -1 },
        },
      ];

      const stats = await this.aggregate(pipeline);

      return stats.map((stat) => ({
        category: stat._id || "Uncategorized",
        productCount: stat.productCount,
        totalQuantity: stat.totalQuantity,
        totalValue: parseFloat(stat.totalValue.toFixed(2)),
        averagePrice: parseFloat(stat.averagePrice.toFixed(2)),
      }));
    } catch (error) {
      throw this._handleError(error, "GET_CATEGORY_STATS");
    }
  }

  /**
   * Find products by SKU
   * @param {string} sku - Product SKU
   * @returns {Promise<Object|null>} Product or null
   */
  async findBySKU(sku) {
    try {
      return await this.findOne({ sku: sku.toUpperCase() });
    } catch (error) {
      throw this._handleError(error, "FIND_BY_SKU");
    }
  }

  /**
   * Find products by barcode
   * @param {string} barcode - Product barcode
   * @returns {Promise<Object|null>} Product or null
   */
  async findByBarcode(barcode) {
    try {
      return await this.findOne({ barcode });
    } catch (error) {
      throw this._handleError(error, "FIND_BY_BARCODE");
    }
  }

  /**
   * Get recently added products
   * @param {number} days - Number of days to look back (default: 7)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Recently added products with pagination
   */
  async getRecentlyAdded(days = 7, options = {}) {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const filter = {
        createdAt: { $gte: dateThreshold },
        status: "active",
      };

      return await this.find(filter, {
        ...options,
        sort: { createdAt: -1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_RECENTLY_ADDED");
    }
  }

  /**
   * Advanced search with multiple filters
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Filtered products with pagination
   */
  async advancedSearch(filters = {}, options = {}) {
    try {
      const query = { status: "active" };

      // Text search
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { description: { $regex: filters.search, $options: "i" } },
          { category: { $regex: filters.search, $options: "i" } },
          { sku: { $regex: filters.search, $options: "i" } },
          { tags: { $in: [new RegExp(filters.search, "i")] } },
        ];
      }

      // Category filter
      if (filters.category) {
        query.category = { $regex: filters.category, $options: "i" };
      }

      // Price range
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = filters.minPrice;
        if (filters.maxPrice) query.price.$lte = filters.maxPrice;
      }

      // Quantity range
      if (filters.minQuantity || filters.maxQuantity) {
        query.quantity = {};
        if (filters.minQuantity) query.quantity.$gte = filters.minQuantity;
        if (filters.maxQuantity) query.quantity.$lte = filters.maxQuantity;
      }

      // Supplier filter
      if (filters.supplier) {
        query["supplier.name"] = { $regex: filters.supplier, $options: "i" };
      }

      // Stock status filter
      if (filters.stockStatus) {
        switch (filters.stockStatus) {
          case "in_stock":
            query.quantity = { $gt: 0 };
            break;
          case "out_of_stock":
            query.quantity = 0;
            break;
          case "low_stock":
            query.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
            break;
        }
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

module.exports = ProductDAO;
