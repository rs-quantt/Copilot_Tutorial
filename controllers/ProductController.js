const { productDAO, inventoryTransactionDAO } = require('../daos');

/**
 * Product Controller
 * Handles all product-related API endpoints
 */
class ProductController {
  /**
   * Get all products with filtering and pagination
   * GET /api/products
   */
  async getAllProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        status = "active",
        stockStatus,
        minPrice,
        maxPrice,
        supplier,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = req.query;

      // Build filters object
      const filters = {};
      if (search) filters.search = search;
      if (category) filters.category = category;
      if (stockStatus) filters.stockStatus = stockStatus;
      if (minPrice) filters.minPrice = parseFloat(minPrice);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
      if (supplier) filters.supplier = supplier;

      // Build options object
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
      };

      const result = await productDAO.advancedSearch(filters, options);

      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await productDAO.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Create new product
   * POST /api/products
   */
  async createProduct(req, res) {
    try {
      const product = await productDAO.create(req.body);

      // Create inventory transaction for initial stock
      if (product.quantity > 0) {
        await inventoryTransactionDAO.createTransaction({
          product: product._id,
          type: "stock_in",
          quantity: product.quantity,
          previousQuantity: 0,
          newQuantity: product.quantity,
          reason: "Initial stock",
          performedBy: req.user?.name || "System",
          unitCost: product.price,
        });
      }

      res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully"
      });
    } catch (error) {
      console.error('Error creating product:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Update product by ID
   * PUT /api/products/:id
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const existingProduct = await productDAO.findById(id);
      
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      const previousQuantity = existingProduct.quantity;
      const updatedProduct = await productDAO.updateById(id, req.body);

      // Create inventory transaction if quantity changed
      if (previousQuantity !== updatedProduct.quantity) {
        await inventoryTransactionDAO.createTransaction({
          product: updatedProduct._id,
          type: "adjustment",
          quantity: updatedProduct.quantity - previousQuantity,
          previousQuantity,
          newQuantity: updatedProduct.quantity,
          reason: "Product update",
          performedBy: req.user?.name || "User",
        });
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: "Product updated successfully"
      });
    } catch (error) {
      console.error('Error updating product:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Delete product (soft delete)
   * DELETE /api/products/:id
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await productDAO.findById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Soft delete by setting status to inactive
      await productDAO.updateById(id, { status: "inactive" });

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Search products
   * GET /api/products/search
   */
  async searchProducts(req, res) {
    try {
      const { q, limit = 10, page = 1 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          error: "Search query is required"
        });
      }

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.search(q, options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error searching products:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  async getLowStockProducts(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.getLowStockProducts(options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get out of stock products
   * GET /api/products/out-of-stock
   */
  async getOutOfStockProducts(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.getOutOfStockProducts(options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching out of stock products:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get products by category
   * GET /api/products/category/:category
   */
  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { limit = 50, page = 1 } = req.query;
      
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.getByCategory(category, options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching products by category:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get products by supplier
   * GET /api/products/supplier/:supplier
   */
  async getProductsBySupplier(req, res) {
    try {
      const { supplier } = req.params;
      const { limit = 50, page = 1 } = req.query;
      
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.getBySupplier(supplier, options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching products by supplier:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Get recently added products
   * GET /api/products/recent
   */
  async getRecentlyAddedProducts(req, res) {
    try {
      const { days = 7, limit = 20, page = 1 } = req.query;
      
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const result = await productDAO.getRecentlyAdded(parseInt(days), options);
      
      res.json({
        success: true,
        data: {
          products: result.documents,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching recently added products:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Update product quantity
   * PATCH /api/products/:id/quantity
   */
  async updateProductQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason = "Manual adjustment" } = req.body;

      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({
          success: false,
          error: "Valid quantity is required"
        });
      }

      const result = await productDAO.updateQuantity(id, quantity, reason);
      
      res.json({
        success: true,
        data: result,
        message: "Product quantity updated successfully"
      });
    } catch (error) {
      console.error('Error updating product quantity:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }

  /**
   * Bulk update product quantities
   * PATCH /api/products/bulk-quantity
   */
  async bulkUpdateQuantities(req, res) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Updates array is required"
        });
      }

      const result = await productDAO.bulkUpdateQuantities(updates);
      
      res.json({
        success: true,
        data: result,
        message: "Bulk quantity update completed"
      });
    } catch (error) {
      console.error('Error bulk updating quantities:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }
  }
}

module.exports = new ProductController();