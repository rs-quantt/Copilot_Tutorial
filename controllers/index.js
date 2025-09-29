// Controllers index file - exports all controllers
const ProductController = require("./ProductController");
const SupplierController = require("./SupplierController");
const CategoryController = require("./CategoryController");
const InventoryTransactionController = require("./InventoryTransactionController");
const DashboardController = require("./DashboardController");

module.exports = {
  ProductController,
  SupplierController,
  CategoryController,
  InventoryTransactionController,
  DashboardController,
};
