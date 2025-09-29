/**
 * DAOs Index File
 * Central export point for all Data Access Objects
 */

const BaseDAO = require("./BaseDAO");
const ProductDAO = require("./ProductDAO");
const SupplierDAO = require("./SupplierDAO");
const CategoryDAO = require("./CategoryDAO");
const InventoryTransactionDAO = require("./InventoryTransactionDAO");

// Create DAO instances
const productDAO = new ProductDAO();
const supplierDAO = new SupplierDAO();
const categoryDAO = new CategoryDAO();
const inventoryTransactionDAO = new InventoryTransactionDAO();

module.exports = {
  // DAO Classes (for creating new instances if needed)
  BaseDAO,
  ProductDAO,
  SupplierDAO,
  CategoryDAO,
  InventoryTransactionDAO,

  // DAO Instances (ready to use)
  productDAO,
  supplierDAO,
  categoryDAO,
  inventoryTransactionDAO,
};
