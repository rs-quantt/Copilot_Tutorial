const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/database");
const {
  ProductController,
  SupplierController,
  CategoryController,
  InventoryTransactionController,
  DashboardController,
} = require("./controllers");

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
app.get("/api/products", ProductController.getAllProducts);

app.post("/api/products", ProductController.createProduct);

app.get("/api/products/:id", ProductController.getProductById);

app.put("/api/products/:id", ProductController.updateProduct);

app.delete("/api/products/:id", ProductController.deleteProduct);

// Inventory Transaction Routes
app.get(
  "/api/transactions/product/:productId",
  InventoryTransactionController.getTransactionsByProduct
);

app.post("/api/transactions", InventoryTransactionController.createTransaction);

// Supplier Routes
app.get("/api/suppliers", SupplierController.getAllSuppliers);
app.post("/api/suppliers", SupplierController.createSupplier);
app.get("/api/suppliers/:id", SupplierController.getSupplierById);
app.put("/api/suppliers/:id", SupplierController.updateSupplier);
app.delete("/api/suppliers/:id", SupplierController.deleteSupplier);
app.get("/api/suppliers/search", SupplierController.searchSuppliers);
app.get("/api/suppliers/top-rated", SupplierController.getTopRatedSuppliers);
app.get("/api/suppliers/low-credit", SupplierController.getLowCreditSuppliers);
app.get(
  "/api/suppliers/location/:location",
  SupplierController.getSuppliersByLocation
);
app.get(
  "/api/suppliers/payment-terms/:terms",
  SupplierController.getSuppliersByPaymentTerms
);
app.patch("/api/suppliers/:id/rating", SupplierController.updateSupplierRating);
app.patch(
  "/api/suppliers/:id/credit-limit",
  SupplierController.updateCreditLimit
);
app.get(
  "/api/suppliers/:id/statistics",
  SupplierController.getSupplierStatistics
);
app.get(
  "/api/suppliers/:id/performance",
  SupplierController.getSupplierPerformance
);
app.post("/api/suppliers/:id/reviews", SupplierController.addSupplierReview);

// Category Routes
app.get("/api/categories", CategoryController.getAllCategories);
app.post("/api/categories", CategoryController.createCategory);
app.get("/api/categories/:id", CategoryController.getCategoryById);
app.put("/api/categories/:id", CategoryController.updateCategory);
app.delete("/api/categories/:id", CategoryController.deleteCategory);
app.get("/api/categories/search", CategoryController.searchCategories);
app.get("/api/categories/tree", CategoryController.getCategoryTree);
app.get("/api/categories/roots", CategoryController.getRootCategories);
app.get("/api/categories/:id/children", CategoryController.getCategoryChildren);
app.get("/api/categories/:id/path", CategoryController.getCategoryPath);
app.patch("/api/categories/:id/move", CategoryController.moveCategory);
app.patch("/api/categories/reorder", CategoryController.reorderCategories);
app.get(
  "/api/categories/:id/statistics",
  CategoryController.getCategoryStatistics
);
app.get(
  "/api/categories/level/:level",
  CategoryController.getCategoriesByLevel
);
app.post("/api/categories/bulk", CategoryController.bulkCreateCategories);

// Dashboard/Analytics Routes
app.get("/api/dashboard/stats", DashboardController.getDashboardStats);
app.get(
  "/api/dashboard/inventory-overview",
  DashboardController.getInventoryOverview
);
app.get(
  "/api/dashboard/sales-analytics",
  DashboardController.getSalesAnalytics
);
app.get("/api/dashboard/alerts", DashboardController.getAlerts);
app.get(
  "/api/dashboard/supplier-performance",
  DashboardController.getSupplierPerformance
);
app.get("/api/dashboard/trends", DashboardController.getTrendAnalysis);

// Product Search Routes
app.get("/api/products/search", ProductController.searchProducts);

// Stock Status Routes
app.get("/api/products/low-stock", ProductController.getLowStockProducts);
app.get("/api/products/out-of-stock", ProductController.getOutOfStockProducts);
app.get("/api/products/recent", ProductController.getRecentlyAddedProducts);
app.get(
  "/api/products/category/:category",
  ProductController.getProductsByCategory
);
app.get(
  "/api/products/supplier/:supplier",
  ProductController.getProductsBySupplier
);
app.patch(
  "/api/products/:id/quantity",
  ProductController.updateProductQuantity
);
app.patch(
  "/api/products/bulk-quantity",
  ProductController.bulkUpdateQuantities
);

// Transaction Routes
app.get("/api/transactions", InventoryTransactionController.getAllTransactions);
app.get(
  "/api/transactions/:id",
  InventoryTransactionController.getTransactionById
);
app.get(
  "/api/transactions/type/:type",
  InventoryTransactionController.getTransactionsByType
);
app.get(
  "/api/transactions/date-range",
  InventoryTransactionController.getTransactionsByDateRange
);
app.get(
  "/api/transactions/recent",
  InventoryTransactionController.getRecentTransactions
);
app.get(
  "/api/transactions/summary",
  InventoryTransactionController.getTransactionSummary
);
app.get(
  "/api/transactions/movement-analysis",
  InventoryTransactionController.getMovementAnalysis
);
app.get(
  "/api/transactions/audit/:productId",
  InventoryTransactionController.getAuditTrail
);
app.get(
  "/api/transactions/pending-approval",
  InventoryTransactionController.getPendingApprovalTransactions
);
app.patch(
  "/api/transactions/:id/approve",
  InventoryTransactionController.approveTransaction
);
app.patch(
  "/api/transactions/:id/reject",
  InventoryTransactionController.rejectTransaction
);
app.post(
  "/api/transactions/bulk",
  InventoryTransactionController.bulkCreateTransactions
);
app.get(
  "/api/transactions/export",
  InventoryTransactionController.exportTransactions
);

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
