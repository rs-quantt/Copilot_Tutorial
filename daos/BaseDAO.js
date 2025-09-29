/**
 * Base Data Access Object (DAO) class
 * Provides common CRUD operations that can be extended by specific DAOs
 */
class BaseDAO {
  constructor(model) {
    if (!model) {
      throw new Error("Model is required for DAO initialization");
    }
    this.model = model;
  }

  /**
   * Create a new document
   * @param {Object} data - Data to create
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw this._handleError(error, "CREATE");
    }
  }

  /**
   * Find a document by ID
   * @param {string} id - Document ID
   * @param {string|Object} populate - Fields to populate
   * @returns {Promise<Object|null>} Found document or null
   */
  async findById(id, populate = null) {
    try {
      let query = this.model.findById(id);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this._handleError(error, "FIND_BY_ID");
    }
  }

  /**
   * Find documents with optional filtering, pagination, and population
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options (limit, skip, sort, populate)
   * @returns {Promise<Object>} Result with documents and metadata
   */
  async find(filter = {}, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sort = { createdAt: -1 },
        populate = null,
        select = null,
      } = options;

      let query = this.model.find(filter);

      if (populate) {
        query = query.populate(populate);
      }

      if (select) {
        query = query.select(select);
      }

      const documents = await query.limit(limit).skip(skip).sort(sort).exec();

      const total = await this.model.countDocuments(filter);

      return {
        documents,
        pagination: {
          total,
          limit,
          skip,
          page: Math.floor(skip / limit) + 1,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: skip > 0,
        },
      };
    } catch (error) {
      throw this._handleError(error, "FIND");
    }
  }

  /**
   * Find one document
   * @param {Object} filter - Query filter
   * @param {string|Object} populate - Fields to populate
   * @returns {Promise<Object|null>} Found document or null
   */
  async findOne(filter, populate = null) {
    try {
      let query = this.model.findOne(filter);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this._handleError(error, "FIND_ONE");
    }
  }

  /**
   * Update a document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateById(id, data, options = {}) {
    try {
      const { returnDocument = "after", populate = null } = options;

      let query = this.model.findByIdAndUpdate(id, data, {
        new: returnDocument === "after",
        runValidators: true,
        ...options,
      });

      if (populate) {
        query = query.populate(populate);
      }

      return await query.exec();
    } catch (error) {
      throw this._handleError(error, "UPDATE_BY_ID");
    }
  }

  /**
   * Update multiple documents
   * @param {Object} filter - Query filter
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateMany(filter, data, options = {}) {
    try {
      return await this.model.updateMany(filter, data, {
        runValidators: true,
        ...options,
      });
    } catch (error) {
      throw this._handleError(error, "UPDATE_MANY");
    }
  }

  /**
   * Delete a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async deleteById(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw this._handleError(error, "DELETE_BY_ID");
    }
  }

  /**
   * Delete multiple documents
   * @param {Object} filter - Query filter
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(filter = {}) {
    try {
      return await this.model.deleteMany(filter);
    } catch (error) {
      throw this._handleError(error, "DELETE_MANY");
    }
  }

  /**
   * Count documents
   * @param {Object} filter - Query filter
   * @returns {Promise<number>} Document count
   */
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw this._handleError(error, "COUNT");
    }
  }

  /**
   * Check if document exists
   * @param {Object} filter - Query filter
   * @returns {Promise<boolean>} Whether document exists
   */
  async exists(filter) {
    try {
      const result = await this.model.exists(filter);
      return !!result;
    } catch (error) {
      throw this._handleError(error, "EXISTS");
    }
  }

  /**
   * Perform aggregation
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation result
   */
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw this._handleError(error, "AGGREGATE");
    }
  }

  /**
   * Create multiple documents
   * @param {Array} dataArray - Array of documents to create
   * @param {Object} options - Insert options
   * @returns {Promise<Array>} Created documents
   */
  async createMany(dataArray, options = {}) {
    try {
      return await this.model.insertMany(dataArray, {
        ordered: false,
        ...options,
      });
    } catch (error) {
      throw this._handleError(error, "CREATE_MANY");
    }
  }

  /**
   * Handle and format errors
   * @private
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Formatted error
   */
  _handleError(error, operation) {
    // Mongoose validation error
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));

      const formattedError = new Error(`Validation failed for ${operation}`);
      formattedError.name = "ValidationError";
      formattedError.details = validationErrors;
      formattedError.statusCode = 400;
      return formattedError;
    }

    // Mongoose cast error (invalid ObjectId, etc.)
    if (error.name === "CastError") {
      const formattedError = new Error(`Invalid ${error.path}: ${error.value}`);
      formattedError.name = "CastError";
      formattedError.statusCode = 400;
      return formattedError;
    }

    // Duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const formattedError = new Error(`${field} already exists`);
      formattedError.name = "DuplicateError";
      formattedError.statusCode = 409;
      return formattedError;
    }

    // Default error handling
    error.operation = operation;
    error.statusCode = error.statusCode || 500;
    return error;
  }
}

module.exports = BaseDAO;
