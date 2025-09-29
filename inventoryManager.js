/**
 * Product class representing a single product in the inventory
 */
class Product {
  /**
   * Creates a new Product instance
   * @param {string} name - The product name
   * @param {number} price - The product price (must be non-negative)
   * @param {number} quantity - The product quantity (must be non-negative integer)
   * @throws {Error} Throws error for invalid input parameters
   */
  constructor(name, price, quantity) {
    this.setName(name);
    this.setPrice(price);
    this.setQuantity(quantity);
    this.id = Product.generateId();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Sets the product name
   * @param {string} name - The product name
   * @throws {Error} Throws error if name is not a valid string
   */
  setName(name) {
    if (typeof name !== "string") {
      throw new Error("Product name must be a string");
    }

    if (name.trim().length === 0) {
      throw new Error("Product name cannot be empty");
    }

    this._name = name.trim();
    this.updatedAt = new Date();
  }

  /**
   * Gets the product name
   * @returns {string} The product name
   */
  getName() {
    return this._name;
  }

  /**
   * Sets the product price
   * @param {number} price - The product price
   * @throws {Error} Throws error if price is not a valid non-negative number
   */
  setPrice(price) {
    if (typeof price !== "number" || isNaN(price)) {
      throw new Error("Product price must be a number");
    }

    if (price < 0) {
      throw new Error("Product price cannot be negative");
    }

    this._price = Number(price.toFixed(2)); // Round to 2 decimal places
    this.updatedAt = new Date();
  }

  /**
   * Gets the product price
   * @returns {number} The product price
   */
  getPrice() {
    return this._price;
  }

  /**
   * Sets the product quantity
   * @param {number} quantity - The product quantity
   * @throws {Error} Throws error if quantity is not a valid non-negative integer
   */
  setQuantity(quantity) {
    if (typeof quantity !== "number" || isNaN(quantity)) {
      throw new Error("Product quantity must be a number");
    }

    if (!Number.isInteger(quantity)) {
      throw new Error("Product quantity must be an integer");
    }

    if (quantity < 0) {
      throw new Error("Product quantity cannot be negative");
    }

    this._quantity = quantity;
    this.updatedAt = new Date();
  }

  /**
   * Gets the product quantity
   * @returns {number} The product quantity
   */
  getQuantity() {
    return this._quantity;
  }

  /**
   * Calculates the total value of this product (price * quantity)
   * @returns {number} The total value
   */
  getTotalValue() {
    return Number((this._price * this._quantity).toFixed(2));
  }

  /**
   * Checks if the product is in stock
   * @returns {boolean} True if quantity > 0, false otherwise
   */
  isInStock() {
    return this._quantity > 0;
  }

  /**
   * Updates multiple product properties at once
   * @param {Object} updates - Object containing properties to update
   * @param {string} [updates.name] - New product name
   * @param {number} [updates.price] - New product price
   * @param {number} [updates.quantity] - New product quantity
   * @returns {Product} Returns this instance for method chaining
   */
  update(updates) {
    if (typeof updates !== "object" || updates === null) {
      throw new Error("Updates must be an object");
    }

    if (updates.name !== undefined) {
      this.setName(updates.name);
    }

    if (updates.price !== undefined) {
      this.setPrice(updates.price);
    }

    if (updates.quantity !== undefined) {
      this.setQuantity(updates.quantity);
    }

    return this;
  }

  /**
   * Gets a string representation of the product
   * @returns {string} String representation of the product
   */
  toString() {
    const stockStatus = this.isInStock() ? "In Stock" : "Out of Stock";
    return `${this._name} - $${this._price} (Qty: ${this._quantity}) [${stockStatus}]`;
  }

  /**
   * Gets a JSON representation of the product
   * @returns {Object} JSON object representing the product
   */
  toJSON() {
    return {
      id: this.id,
      name: this._name,
      price: this._price,
      quantity: this._quantity,
      totalValue: this.getTotalValue(),
      inStock: this.isInStock(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a Product instance from a JSON object
   * @param {Object} json - JSON object with product data
   * @returns {Product} New Product instance
   * @static
   */
  static fromJSON(json) {
    if (!json || typeof json !== "object") {
      throw new Error("Invalid JSON object");
    }

    const product = new Product(json.name, json.price, json.quantity);

    if (json.id) {
      product.id = json.id;
    }

    if (json.createdAt) {
      product.createdAt = new Date(json.createdAt);
    }

    if (json.updatedAt) {
      product.updatedAt = new Date(json.updatedAt);
    }

    return product;
  }

  /**
   * Generates a unique ID for the product
   * @returns {string} Unique identifier
   * @static
   * @private
   */
  static generateId() {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * InventoryManager class for managing a collection of products
 */
class InventoryManager {
  /**
   * Creates a new InventoryManager instance
   */
  constructor() {
    this.products = [];
  }

  /**
   * Adds a new product to the inventory
   * @param {string} name - The product name
   * @param {number} price - The product price
   * @param {number} quantity - The product quantity
   * @returns {Product} The newly created product
   * @throws {Error} Throws error for invalid input or duplicate product names
   */
  addProduct(name, price, quantity) {
    // Check for duplicate product names
    const existingProduct = this.findProductByName(name);
    if (existingProduct) {
      throw new Error(`Product with name "${name}" already exists`);
    }

    const product = new Product(name, price, quantity);
    this.products.push(product);
    return product;
  }

  /**
   * Removes a product from the inventory by ID
   * @param {string} productId - The ID of the product to remove
   * @returns {boolean} True if product was found and removed, false otherwise
   */
  removeProduct(productId) {
    const productIndex = this.products.findIndex((p) => p.id === productId);
    if (productIndex !== -1) {
      this.products.splice(productIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Removes a product from the inventory by name
   * @param {string} name - The name of the product to remove
   * @returns {boolean} True if product was found and removed, false otherwise
   */
  removeProductByName(name) {
    const productIndex = this.products.findIndex(
      (p) => p.getName().toLowerCase() === name.toLowerCase()
    );
    if (productIndex !== -1) {
      this.products.splice(productIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Updates a product in the inventory
   * @param {string} productId - The ID of the product to update
   * @param {Object} updates - Object containing properties to update
   * @returns {boolean} True if product was found and updated, false otherwise
   */
  updateProduct(productId, updates) {
    const product = this.findProductById(productId);
    if (product) {
      // Check for name conflicts when updating name
      if (updates.name && updates.name !== product.getName()) {
        const existingProduct = this.findProductByName(updates.name);
        if (existingProduct && existingProduct.id !== productId) {
          throw new Error(`Product with name "${updates.name}" already exists`);
        }
      }

      product.update(updates);
      return true;
    }
    return false;
  }

  /**
   * Updates a product's quantity (useful for stock management)
   * @param {string} productId - The ID of the product
   * @param {number} quantityChange - The change in quantity (can be negative)
   * @returns {boolean} True if product was found and updated, false otherwise
   * @throws {Error} Throws error if resulting quantity would be negative
   */
  updateProductQuantity(productId, quantityChange) {
    const product = this.findProductById(productId);
    if (product) {
      const newQuantity = product.getQuantity() + quantityChange;
      if (newQuantity < 0) {
        throw new Error("Cannot reduce quantity below zero");
      }
      product.setQuantity(newQuantity);
      return true;
    }
    return false;
  }

  /**
   * Lists all products in the inventory
   * @returns {Product[]} Array of all products
   */
  listProducts() {
    return [...this.products]; // Return a copy to prevent external modification
  }

  /**
   * Finds a product by its ID
   * @param {string} productId - The ID of the product to find
   * @returns {Product|null} The product if found, null otherwise
   */
  findProductById(productId) {
    return this.products.find((p) => p.id === productId) || null;
  }

  /**
   * Gets a product by its ID (alias for findProductById)
   * @param {string} productId - The ID of the product to find
   * @returns {Product|null} The product if found, null otherwise
   */
  getProductById(productId) {
    return this.findProductById(productId);
  }

  /**
   * Finds a product by its name (case-insensitive)
   * @param {string} name - The name of the product to find
   * @returns {Product|null} The product if found, null otherwise
   */
  findProductByName(name) {
    return (
      this.products.find(
        (p) => p.getName().toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  /**
   * Searches products by name pattern (case-insensitive)
   * @param {string} searchTerm - The search term to match against product names
   * @returns {Product[]} Array of matching products
   */
  searchProducts(searchTerm) {
    if (typeof searchTerm !== "string") {
      return [];
    }

    const term = searchTerm.toLowerCase();
    return this.products.filter((p) =>
      p.getName().toLowerCase().includes(term)
    );
  }

  /**
   * Gets products that are out of stock
   * @returns {Product[]} Array of out-of-stock products
   */
  getOutOfStockProducts() {
    return this.products.filter((p) => !p.isInStock());
  }

  /**
   * Gets products that are low in stock (below specified threshold)
   * @param {number} threshold - The quantity threshold (default: 5)
   * @returns {Product[]} Array of low-stock products
   */
  getLowStockProducts(threshold = 5) {
    if (typeof threshold !== "number" || threshold < 0) {
      threshold = 5;
    }
    return this.products.filter(
      (p) => p.getQuantity() <= threshold && p.isInStock()
    );
  }

  /**
   * Gets all products in inventory
   * @returns {Product[]} Array of all products
   */
  getAllProducts() {
    return [...this.products]; // Return a copy to prevent external modification
  }

  /**
   * Gets the total number of products in inventory
   * @returns {number} Total number of products
   */
  getProductCount() {
    return this.products.length;
  }

  /**
   * Gets the total value of all inventory
   * @returns {number} Total inventory value
   */
  getTotalInventoryValue() {
    return Number(
      this.products
        .reduce((total, product) => {
          return total + product.getTotalValue();
        }, 0)
        .toFixed(2)
    );
  }

  /**
   * Gets inventory statistics
   * @returns {Object} Object containing inventory statistics
   */
  getInventoryStats() {
    const totalProducts = this.getProductCount();
    const outOfStock = this.getOutOfStockProducts().length;
    const inStock = totalProducts - outOfStock;
    const lowStock = this.getLowStockProducts().length;
    const totalValue = this.getTotalInventoryValue();
    const totalItems = this.products.reduce(
      (sum, p) => sum + p.getQuantity(),
      0
    );

    return {
      totalProducts,
      inStock,
      outOfStock,
      lowStock,
      totalValue,
      totalItems,
      averageProductValue:
        totalProducts > 0 ? Number((totalValue / totalProducts).toFixed(2)) : 0,
    };
  }

  /**
   * Displays all products in a formatted way
   * @returns {string} Formatted string of all products
   */
  displayProducts() {
    if (this.products.length === 0) {
      return "No products in inventory.";
    }

    return this.products
      .map((product, index) => `${index + 1}. ${product.toString()}`)
      .join("\n");
  }

  /**
   * Exports inventory to JSON format
   * @returns {Object} JSON representation of the inventory
   */
  exportToJSON() {
    return {
      products: this.products.map((p) => p.toJSON()),
      stats: this.getInventoryStats(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Imports inventory from JSON format
   * @param {Object} jsonData - JSON data containing products
   * @param {boolean} replace - Whether to replace existing inventory (default: false)
   * @returns {number} Number of products imported
   */
  importFromJSON(jsonData, replace = false) {
    if (!jsonData || !Array.isArray(jsonData.products)) {
      throw new Error("Invalid JSON data format");
    }

    if (replace) {
      this.products = [];
    }

    let importedCount = 0;
    for (const productData of jsonData.products) {
      try {
        // Skip if product with same name already exists (when not replacing)
        if (!replace && this.findProductByName(productData.name)) {
          continue;
        }

        const product = Product.fromJSON(productData);
        this.products.push(product);
        importedCount++;
      } catch (error) {
        // Skip invalid products but continue importing others
        console.warn(`Failed to import product: ${error.message}`);
      }
    }

    return importedCount;
  }

  /**
   * Clears all products from the inventory
   * @returns {number} Number of products that were removed
   */
  clearInventory() {
    const count = this.products.length;
    this.products = [];
    return count;
  }
}

// Export classes (for Node.js environments)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Product, InventoryManager };
}

// Make classes available globally (for browser environments)
if (typeof window !== "undefined") {
  window.Product = Product;
  window.InventoryManager = InventoryManager;
}
