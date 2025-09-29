const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/database");
const {
  productDAO,
  supplierDAO,
  categoryDAO,
  inventoryTransactionDAO,
} = require("./daos");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan("combined")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Product Routes
app.get("/api/products", async (req, res) => {
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
    } = req.query;

    // Use advanced search from ProductDAO
    const filters = {
      search,
      category,
      stockStatus,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      supplier,
    };

    // Remove null/undefined values
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] === null ||
        filters[key] === undefined ||
        filters[key] === ""
      ) {
        delete filters[key];
      }
    });

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { createdAt: -1 },
    };

    const result = await productDAO.advancedSearch(filters, options);

    res.json({
      products: result.documents,
      totalPages: result.pagination.totalPages,
      currentPage: result.pagination.page,
      total: result.pagination.total,
      hasNext: result.pagination.hasNext,
      hasPrev: result.pagination.hasPrev,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
});

app.post("/api/products", async (req, res) => {
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
        performedBy: "System",
        unitCost: product.price,
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await productDAO.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const existingProduct = await productDAO.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const previousQuantity = existingProduct.quantity;
    const updatedProduct = await productDAO.updateById(req.params.id, req.body);

    // Create inventory transaction if quantity changed
    if (previousQuantity !== updatedProduct.quantity) {
      await inventoryTransactionDAO.createTransaction({
        product: updatedProduct._id,
        type: "adjustment",
        quantity: updatedProduct.quantity - previousQuantity,
        previousQuantity,
        newQuantity: updatedProduct.quantity,
        reason: "Product update",
        performedBy: "User", // In real app, get from auth
      });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await productDAO.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Soft delete by setting status to inactive
    await productDAO.updateById(req.params.id, { status: "inactive" });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
});

// Inventory Transaction Routes
app.get("/api/products/:id/transactions", async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { createdAt: -1 }
    };
    
    const result = await inventoryTransactionDAO.getProductTransactions(req.params.id, options);
    res.json({
      transactions: result.documents,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching product transactions:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

app.post("/api/products/:id/transactions", async (req, res) => {
  try {
    const product = await productDAO.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { type, quantity, reason, performedBy = "User" } = req.body;
    const previousQuantity = product.quantity;
    let newQuantity;

    // Calculate new quantity based on transaction type
    switch (type) {
      case "stock_in":
        newQuantity = previousQuantity + Math.abs(quantity);
        break;
      case "stock_out":
        newQuantity = previousQuantity - Math.abs(quantity);
        if (newQuantity < 0) {
          return res.status(400).json({
            error: "Insufficient stock for this transaction",
          });
        }
        break;
      case "adjustment":
        newQuantity = previousQuantity + quantity;
        if (newQuantity < 0) {
          return res.status(400).json({
            error: "Adjustment would result in negative stock",
          });
        }
        break;
      default:
        return res.status(400).json({ error: "Invalid transaction type" });
    }

    // Update product quantity
    await productDAO.updateById(req.params.id, { quantity: newQuantity });

    // Create transaction record
    const transaction = await inventoryTransactionDAO.createTransaction({
      product: product._id,
      type,
      quantity: type === "stock_out" ? -Math.abs(quantity) : 
                type === "stock_in" ? Math.abs(quantity) : quantity,
      previousQuantity,
      newQuantity,
      reason,
      performedBy,
      ...req.body
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Supplier Routes
app.get("/api/suppliers", async (req, res) => {
  try {
    const { search, status = "active" } = req.query;

    let query = { status };
    if (search) {
      query = {
        ...query,
        $or: [
          { name: new RegExp(search, "i") },
          { code: new RegExp(search, "i") },
        ],
      };
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Category Routes
app.get("/api/categories", async (req, res) => {
  try {
    const { tree } = req.query;

    if (tree === "true") {
      const categoryTree = await Category.getCategoryTree();
      res.json(categoryTree);
    } else {
      const categories = await Category.find({ status: "active" }).sort({
        level: 1,
        sortOrder: 1,
        name: 1,
      });
      res.json(categories);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Dashboard/Analytics Routes
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    // Get inventory statistics
    const inventoryStats = await productDAO.getInventoryStats();
    const categoryStats = await productDAO.getCategoryStats();
    
    // Get recent transactions
    const recentTransactions = await inventoryTransactionDAO.getRecentTransactions(7, { limit: 10 });

    res.json({
      ...inventoryStats,
      categoryStats,
      recentTransactions: recentTransactions.documents
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Product Search Routes
app.get("/api/products/search", async (req, res) => {
  try {
    const { q, limit = 10, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const result = await productDAO.search(q, options);
    
    res.json({
      products: result.documents,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error searching products:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Low Stock Routes
app.get("/api/products/low-stock", async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const result = await productDAO.getLowStockProducts(options);
    
    res.json({
      products: result.documents,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Out of Stock Routes
app.get("/api/products/out-of-stock", async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const result = await productDAO.getOutOfStockProducts(options);
    
    res.json({
      products: result.documents,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching out of stock products:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Supplier Routes  
app.get("/api/suppliers", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (status) filters.status = status;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { name: 1 }
    };

    const result = await supplierDAO.advancedSearch(filters, options);
    
    res.json({
      suppliers: result.documents,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const supplier = await supplierDAO.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message,
      ...(error.details && { details: error.details })
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📝 API Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
