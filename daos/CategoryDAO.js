const BaseDAO = require("./BaseDAO");
const { Category } = require("../models");

/**
 * Category Data Access Object
 * Handles all database operations related to categories including hierarchical operations
 */
class CategoryDAO extends BaseDAO {
  constructor() {
    super(Category);
  }

  /**
   * Search categories by name or description
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
          { slug: { $regex: searchTerm, $options: "i" } },
        ],
      };

      return await this.find(searchFilter, options);
    } catch (error) {
      throw this._handleError(error, "SEARCH");
    }
  }

  /**
   * Find category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object|null>} Category or null
   */
  async findBySlug(slug) {
    try {
      return await this.findOne({ slug: slug.toLowerCase() });
    } catch (error) {
      throw this._handleError(error, "FIND_BY_SLUG");
    }
  }

  /**
   * Get root categories (categories without parent)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Root categories with pagination
   */
  async getRootCategories(options = {}) {
    try {
      const filter = {
        parent: null,
        status: "active",
      };
      return await this.find(filter, {
        ...options,
        sort: { sortOrder: 1, name: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_ROOT_CATEGORIES");
    }
  }

  /**
   * Get children of a specific category
   * @param {string} parentId - Parent category ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Child categories with pagination
   */
  async getChildren(parentId, options = {}) {
    try {
      const filter = {
        parent: parentId,
        status: "active",
      };
      return await this.find(filter, {
        ...options,
        sort: { sortOrder: 1, name: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_CHILDREN");
    }
  }

  /**
   * Get all descendants of a category (recursive)
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} All descendant categories
   */
  async getDescendants(categoryId, options = {}) {
    try {
      const category = await this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      // Use path to find all descendants
      const pathPattern = category.path
        ? `${category.path}/${categoryId}`
        : categoryId;
      const filter = {
        path: { $regex: `^${pathPattern}`, $options: "i" },
        status: "active",
      };

      const { documents } = await this.find(filter, {
        ...options,
        sort: { level: 1, sortOrder: 1, name: 1 },
      });

      return documents;
    } catch (error) {
      throw this._handleError(error, "GET_DESCENDANTS");
    }
  }

  /**
   * Get ancestors of a category (parent hierarchy)
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Ancestor categories in order from root to parent
   */
  async getAncestors(categoryId) {
    try {
      const category = await this.findById(categoryId);
      if (!category || !category.path) {
        return [];
      }

      const ancestorIds = category.path.split("/").filter((id) => id);
      if (ancestorIds.length === 0) {
        return [];
      }

      const { documents } = await this.find(
        { _id: { $in: ancestorIds } },
        { sort: { level: 1 } }
      );

      // Sort by level to ensure proper hierarchy order
      return documents.sort((a, b) => a.level - b.level);
    } catch (error) {
      throw this._handleError(error, "GET_ANCESTORS");
    }
  }

  /**
   * Get category tree (hierarchical structure)
   * @param {string} rootId - Root category ID (optional)
   * @param {number} maxDepth - Maximum depth to traverse (optional)
   * @returns {Promise<Array>} Category tree structure
   */
  async getCategoryTree(rootId = null, maxDepth = null) {
    try {
      const filter = { status: "active" };
      if (rootId) {
        const rootCategory = await this.findById(rootId);
        if (!rootCategory) {
          throw new Error("Root category not found");
        }
        const pathPattern = rootCategory.path
          ? `${rootCategory.path}/${rootId}`
          : rootId;
        filter.$or = [
          { _id: rootId },
          { path: { $regex: `^${pathPattern}`, $options: "i" } },
        ];
      }

      if (maxDepth !== null) {
        const startLevel = rootId ? (await this.findById(rootId)).level : 0;
        filter.level = { $lte: startLevel + maxDepth };
      }

      const { documents } = await this.find(filter, {
        sort: { level: 1, sortOrder: 1, name: 1 },
      });

      // Build tree structure
      const categoryMap = new Map();
      const rootCategories = [];

      // Create map of all categories
      documents.forEach((category) => {
        categoryMap.set(category._id.toString(), {
          ...category.toObject(),
          children: [],
        });
      });

      // Build tree structure
      documents.forEach((category) => {
        const categoryObj = categoryMap.get(category._id.toString());

        if (category.parent) {
          const parent = categoryMap.get(category.parent.toString());
          if (parent) {
            parent.children.push(categoryObj);
          }
        } else if (!rootId || category._id.toString() === rootId) {
          rootCategories.push(categoryObj);
        }
      });

      return rootId ? categoryMap.get(rootId) : rootCategories;
    } catch (error) {
      throw this._handleError(error, "GET_CATEGORY_TREE");
    }
  }

  /**
   * Move category to a new parent
   * @param {string} categoryId - Category ID to move
   * @param {string} newParentId - New parent category ID (null for root)
   * @param {number} sortOrder - New sort order (optional)
   * @returns {Promise<Object>} Updated category
   */
  async moveCategory(categoryId, newParentId = null, sortOrder = null) {
    try {
      const category = await this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check for circular reference
      if (newParentId) {
        const newParent = await this.findById(newParentId);
        if (!newParent) {
          throw new Error("New parent category not found");
        }

        // Check if new parent is a descendant of current category
        const descendants = await this.getDescendants(categoryId);
        if (descendants.some((desc) => desc._id.toString() === newParentId)) {
          throw new Error("Cannot move category to its own descendant");
        }

        // Calculate new level and path
        const newLevel = newParent.level + 1;
        const newPath = newParent.path
          ? `${newParent.path}/${newParentId}`
          : newParentId;

        // Update category
        const updateData = {
          parent: newParentId,
          level: newLevel,
          path: newPath,
        };
        if (sortOrder !== null) {
          updateData.sortOrder = sortOrder;
        }

        const updatedCategory = await this.updateById(categoryId, updateData);

        // Update all descendants' paths and levels
        await this._updateDescendantPaths(categoryId, newPath, newLevel);

        return updatedCategory;
      } else {
        // Moving to root
        const updateData = {
          parent: null,
          level: 0,
          path: "",
        };
        if (sortOrder !== null) {
          updateData.sortOrder = sortOrder;
        }

        const updatedCategory = await this.updateById(categoryId, updateData);

        // Update all descendants' paths and levels
        await this._updateDescendantPaths(categoryId, "", 0);

        return updatedCategory;
      }
    } catch (error) {
      throw this._handleError(error, "MOVE_CATEGORY");
    }
  }

  /**
   * Update descendant paths and levels after moving a category
   * @private
   */
  async _updateDescendantPaths(categoryId, newParentPath, newParentLevel) {
    try {
      const descendants = await this.getDescendants(categoryId);

      for (const descendant of descendants) {
        const oldPathParts = descendant.path.split("/");
        const categoryIndex = oldPathParts.indexOf(categoryId);

        if (categoryIndex !== -1) {
          const relativePath = oldPathParts.slice(categoryIndex + 1).join("/");
          const newPath = newParentPath
            ? `${newParentPath}/${categoryId}${
                relativePath ? "/" + relativePath : ""
              }`
            : `${categoryId}${relativePath ? "/" + relativePath : ""}`;

          const levelDifference =
            oldPathParts.length - newPath.split("/").filter((p) => p).length;
          const newLevel = descendant.level - levelDifference;

          await this.updateById(descendant._id, {
            path: newPath,
            level: newLevel,
          });
        }
      }
    } catch (error) {
      throw this._handleError(error, "UPDATE_DESCENDANT_PATHS");
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} Category statistics
   */
  async getCategoryStats() {
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
            levelStats: [
              {
                $match: { status: "active" },
              },
              {
                $group: {
                  _id: "$level",
                  count: { $sum: 1 },
                },
              },
              {
                $sort: { _id: 1 },
              },
            ],
            generalStats: [
              {
                $group: {
                  _id: null,
                  totalCategories: { $sum: 1 },
                  activeCategories: {
                    $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                  },
                  rootCategories: {
                    $sum: { $cond: [{ $eq: ["$parent", null] }, 1, 0] },
                  },
                  maxLevel: { $max: "$level" },
                },
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

      // Format level stats
      const levelCounts = {};
      stats.levelStats.forEach((item) => {
        levelCounts[`level_${item._id}`] = item.count;
      });

      // Format general stats
      const generalStats = stats.generalStats[0] || {
        totalCategories: 0,
        activeCategories: 0,
        rootCategories: 0,
        maxLevel: 0,
      };

      return {
        total: generalStats.totalCategories,
        active: generalStats.activeCategories,
        rootCategories: generalStats.rootCategories,
        maxLevel: generalStats.maxLevel,
        byStatus: statusCounts,
        byLevel: levelCounts,
      };
    } catch (error) {
      throw this._handleError(error, "GET_CATEGORY_STATS");
    }
  }

  /**
   * Get categories by level
   * @param {number} level - Category level
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Categories at specific level
   */
  async getCategoriesByLevel(level, options = {}) {
    try {
      const filter = {
        level,
        status: "active",
      };
      return await this.find(filter, {
        ...options,
        sort: { sortOrder: 1, name: 1, ...options.sort },
      });
    } catch (error) {
      throw this._handleError(error, "GET_CATEGORIES_BY_LEVEL");
    }
  }

  /**
   * Reorder categories within the same parent
   * @param {Array} categoryOrders - Array of {categoryId, sortOrder} objects
   * @returns {Promise<Object>} Update results
   */
  async reorderCategories(categoryOrders) {
    try {
      const results = {
        successful: [],
        failed: [],
      };

      for (const order of categoryOrders) {
        try {
          const updatedCategory = await this.updateById(order.categoryId, {
            sortOrder: order.sortOrder,
          });
          results.successful.push({
            categoryId: order.categoryId,
            sortOrder: order.sortOrder,
            category: updatedCategory,
          });
        } catch (error) {
          results.failed.push({
            categoryId: order.categoryId,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      throw this._handleError(error, "REORDER_CATEGORIES");
    }
  }

  /**
   * Delete category and handle children
   * @param {string} categoryId - Category ID to delete
   * @param {string} action - Action for children: 'move_to_parent', 'delete_all', 'move_to_root'
   * @returns {Promise<Object>} Deletion result
   */
  async deleteWithChildren(categoryId, action = "move_to_parent") {
    try {
      const category = await this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      const children = await this.getChildren(categoryId);
      const childrenIds = children.documents.map((child) =>
        child._id.toString()
      );

      let childrenHandled = 0;

      switch (action) {
        case "move_to_parent":
          // Move children to the parent of the deleted category
          for (const childId of childrenIds) {
            await this.moveCategory(childId, category.parent);
            childrenHandled++;
          }
          break;

        case "move_to_root":
          // Move children to root level
          for (const childId of childrenIds) {
            await this.moveCategory(childId, null);
            childrenHandled++;
          }
          break;

        case "delete_all":
          // Delete all descendants
          const descendants = await this.getDescendants(categoryId);
          const descendantIds = descendants.map((desc) => desc._id);
          await this.deleteMany({ _id: { $in: descendantIds } });
          childrenHandled = descendants.length;
          break;

        default:
          throw new Error(
            "Invalid action. Use: move_to_parent, delete_all, or move_to_root"
          );
      }

      // Delete the category itself
      const deletedCategory = await this.deleteById(categoryId);

      return {
        deletedCategory,
        childrenHandled,
        action,
      };
    } catch (error) {
      throw this._handleError(error, "DELETE_WITH_CHILDREN");
    }
  }

  /**
   * Get breadcrumb trail for a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Breadcrumb trail from root to category
   */
  async getBreadcrumb(categoryId) {
    try {
      const category = await this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      const ancestors = await this.getAncestors(categoryId);
      return [...ancestors, category];
    } catch (error) {
      throw this._handleError(error, "GET_BREADCRUMB");
    }
  }
}

module.exports = CategoryDAO;
