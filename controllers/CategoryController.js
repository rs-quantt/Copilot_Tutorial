const { categoryDAO } = require("../daos");

/**
 * Category Controller
 * Handles all category-related API endpoints including hierarchical operations
 */
class CategoryController {
  /**
   * Get all categories with hierarchical structure
   * GET /api/categories
   */
  async getAllCategories(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        status = "active",
        parentOnly = false,
        flat = false,
        sortBy = "name",
        sortOrder = "asc",
      } = req.query;

      // Build filters object
      const filters = {};
      if (search) filters.search = search;
      if (parentOnly === "true") filters.parent = null;

      // Build options object
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      };

      let result;

      if (flat === "true") {
        // Return flat list of categories
        result = await categoryDAO.advancedSearch(filters, options);
      } else {
        // Return hierarchical structure
        result = await categoryDAO.getCategoryTree(options);
      }

      res.json({
        success: true,
        data: {
          categories: result.documents || result,
          ...(result.pagination && { pagination: result.pagination }),
        },
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get single category by ID
   * GET /api/categories/:id
   */
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const { includeChildren = false } = req.query;

      let category;

      if (includeChildren === "true") {
        category = await categoryDAO.getCategoryWithChildren(id);
      } else {
        category = await categoryDAO.findById(id);
      }

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Create new category
   * POST /api/categories
   */
  async createCategory(req, res) {
    try {
      const category = await categoryDAO.create(req.body);

      res.status(201).json({
        success: true,
        data: category,
        message: "Category created successfully",
      });
    } catch (error) {
      console.error("Error creating category:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Update category by ID
   * PUT /api/categories/:id
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const category = await categoryDAO.updateById(id, req.body);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
        message: "Category updated successfully",
      });
    } catch (error) {
      console.error("Error updating category:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Delete category (soft delete)
   * DELETE /api/categories/:id
   */
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      const category = await categoryDAO.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      // Check if category has children
      const children = await categoryDAO.getChildren(id);
      if (children.length > 0 && force !== "true") {
        return res.status(400).json({
          success: false,
          error:
            "Category has subcategories. Use force=true to delete along with subcategories.",
        });
      }

      if (force === "true") {
        // Delete category and all its children
        await categoryDAO.deleteWithChildren(id);
      } else {
        // Soft delete by setting status to inactive
        await categoryDAO.updateById(id, { status: "inactive" });
      }

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Search categories
   * GET /api/categories/search
   */
  async searchCategories(req, res) {
    try {
      const { q, limit = 20, page = 1 } = req.query;

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

      const result = await categoryDAO.search(q, options);

      res.json({
        success: true,
        data: {
          categories: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error searching categories:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get category tree structure
   * GET /api/categories/tree
   */
  async getCategoryTree(req, res) {
    try {
      const { rootId = null, maxDepth, includeInactive = false } = req.query;

      const options = {};
      if (maxDepth) options.maxDepth = parseInt(maxDepth);
      if (includeInactive === "true") options.includeInactive = true;

      const tree = await categoryDAO.getCategoryTree(rootId, options);

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      console.error("Error fetching category tree:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get root categories (parent categories)
   * GET /api/categories/roots
   */
  async getRootCategories(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await categoryDAO.getRootCategories(options);

      res.json({
        success: true,
        data: {
          categories: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching root categories:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get children of a specific category
   * GET /api/categories/:id/children
   */
  async getCategoryChildren(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, page = 1, recursive = false } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      let result;

      if (recursive === "true") {
        result = await categoryDAO.getAllDescendants(id, options);
      } else {
        result = await categoryDAO.getChildren(id, options);
      }

      res.json({
        success: true,
        data: {
          categories: result.documents || result,
          ...(result.pagination && { pagination: result.pagination }),
        },
      });
    } catch (error) {
      console.error("Error fetching category children:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get category path (breadcrumb)
   * GET /api/categories/:id/path
   */
  async getCategoryPath(req, res) {
    try {
      const { id } = req.params;
      const path = await categoryDAO.getCategoryPath(id);

      res.json({
        success: true,
        data: {
          path,
          breadcrumb: path.map((cat) => ({
            id: cat._id,
            name: cat.name,
            slug: cat.slug,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching category path:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Move category to new parent
   * PATCH /api/categories/:id/move
   */
  async moveCategory(req, res) {
    try {
      const { id } = req.params;
      const { newParentId } = req.body;

      // Validate that we're not creating a circular reference
      if (newParentId) {
        const descendants = await categoryDAO.getAllDescendants(id);
        const descendantIds = descendants.map((d) => d._id.toString());

        if (descendantIds.includes(newParentId)) {
          return res.status(400).json({
            success: false,
            error:
              "Cannot move category to its own descendant (circular reference)",
          });
        }
      }

      const result = await categoryDAO.moveCategory(id, newParentId);

      res.json({
        success: true,
        data: result,
        message: "Category moved successfully",
      });
    } catch (error) {
      console.error("Error moving category:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Reorder categories within the same parent
   * PATCH /api/categories/reorder
   */
  async reorderCategories(req, res) {
    try {
      const { categoryOrders } = req.body;

      if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Category orders array is required",
        });
      }

      const result = await categoryDAO.reorderCategories(categoryOrders);

      res.json({
        success: true,
        data: result,
        message: "Categories reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering categories:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get category statistics
   * GET /api/categories/:id/statistics
   */
  async getCategoryStatistics(req, res) {
    try {
      const { id } = req.params;
      const statistics = await categoryDAO.getCategoryStatistics(id);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Error fetching category statistics:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get categories by level (depth in tree)
   * GET /api/categories/level/:level
   */
  async getCategoriesByLevel(req, res) {
    try {
      const { level } = req.params;
      const { limit = 50, page = 1 } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await categoryDAO.getCategoriesByLevel(
        parseInt(level),
        options
      );

      res.json({
        success: true,
        data: {
          categories: result.documents,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching categories by level:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Bulk create categories from tree structure
   * POST /api/categories/bulk
   */
  async bulkCreateCategories(req, res) {
    try {
      const { categories } = req.body;

      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Categories array is required",
        });
      }

      const result = await categoryDAO.bulkCreateCategories(categories);

      res.status(201).json({
        success: true,
        data: result,
        message: "Categories created successfully",
      });
    } catch (error) {
      console.error("Error bulk creating categories:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }
}

module.exports = new CategoryController();
