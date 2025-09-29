const { Product, InventoryManager } = require("./inventoryManager");

describe("Product Class", () => {
  describe("Constructor", () => {
    test("should create a product with valid parameters", () => {
      const product = new Product("Test Product", 10.5, 5);

      expect(product.getName()).toBe("Test Product");
      expect(product.getPrice()).toBe(10.5);
      expect(product.getQuantity()).toBe(5);
      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    test("should throw error for invalid name", () => {
      expect(() => new Product("", 10, 5)).toThrow(
        "Product name cannot be empty"
      );
      expect(() => new Product(123, 10, 5)).toThrow(
        "Product name must be a string"
      );
      expect(() => new Product("   ", 10, 5)).toThrow(
        "Product name cannot be empty"
      );
    });

    test("should throw error for invalid price", () => {
      expect(() => new Product("Test", -1, 5)).toThrow(
        "Product price cannot be negative"
      );
      expect(() => new Product("Test", "invalid", 5)).toThrow(
        "Product price must be a number"
      );
      expect(() => new Product("Test", NaN, 5)).toThrow(
        "Product price must be a number"
      );
    });

    test("should throw error for invalid quantity", () => {
      expect(() => new Product("Test", 10, -1)).toThrow(
        "Product quantity cannot be negative"
      );
      expect(() => new Product("Test", 10, 1.5)).toThrow(
        "Product quantity must be an integer"
      );
      expect(() => new Product("Test", 10, "invalid")).toThrow(
        "Product quantity must be a number"
      );
    });
  });

  describe("Setters and Getters", () => {
    let product;

    beforeEach(() => {
      product = new Product("Test Product", 10.99, 5);
    });

    test("should set and get name correctly", () => {
      product.setName("Updated Product");
      expect(product.getName()).toBe("Updated Product");
    });

    test("should set and get price correctly", () => {
      product.setPrice(15.75);
      expect(product.getPrice()).toBe(15.75);
    });

    test("should set and get quantity correctly", () => {
      product.setQuantity(10);
      expect(product.getQuantity()).toBe(10);
    });

    test("should update updatedAt when properties change", () => {
      const originalUpdatedAt = product.updatedAt;

      // Wait a small amount to ensure time difference
      setTimeout(() => {
        product.setName("New Name");
        expect(product.updatedAt).not.toEqual(originalUpdatedAt);
      }, 1);
    });
  });

  describe("Methods", () => {
    let product;

    beforeEach(() => {
      product = new Product("Test Product", 10.5, 5);
    });

    test("should calculate total value correctly", () => {
      expect(product.getTotalValue()).toBe(52.5);
    });

    test("should check if product is in stock", () => {
      expect(product.isInStock()).toBe(true);

      product.setQuantity(0);
      expect(product.isInStock()).toBe(false);
    });

    test("should update multiple properties at once", () => {
      const updates = {
        name: "Updated Product",
        price: 20.0,
        quantity: 10,
      };

      const result = product.update(updates);

      expect(result).toBe(product); // Should return this for chaining
      expect(product.getName()).toBe("Updated Product");
      expect(product.getPrice()).toBe(20.0);
      expect(product.getQuantity()).toBe(10);
    });

    test("should throw error for invalid updates object", () => {
      expect(() => product.update(null)).toThrow("Updates must be an object");
      expect(() => product.update("invalid")).toThrow(
        "Updates must be an object"
      );
    });

    test("should return correct string representation", () => {
      const str = product.toString();
      expect(str).toBe("Test Product - $10.5 (Qty: 5) [In Stock]");

      product.setQuantity(0);
      const outOfStockStr = product.toString();
      expect(outOfStockStr).toBe(
        "Test Product - $10.5 (Qty: 0) [Out of Stock]"
      );
    });

    test("should return correct JSON representation", () => {
      const json = product.toJSON();

      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("name", "Test Product");
      expect(json).toHaveProperty("price", 10.5);
      expect(json).toHaveProperty("quantity", 5);
      expect(json).toHaveProperty("totalValue", 52.5);
      expect(json).toHaveProperty("inStock", true);
      expect(json).toHaveProperty("createdAt");
      expect(json).toHaveProperty("updatedAt");
    });
  });

  describe("Static Methods", () => {
    test("should create product from JSON", () => {
      const jsonData = {
        name: "JSON Product",
        price: 25.99,
        quantity: 3,
        id: "custom_id",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      const product = Product.fromJSON(jsonData);

      expect(product.getName()).toBe("JSON Product");
      expect(product.getPrice()).toBe(25.99);
      expect(product.getQuantity()).toBe(3);
      expect(product.id).toBe("custom_id");
    });

    test("should throw error for invalid JSON", () => {
      expect(() => Product.fromJSON(null)).toThrow("Invalid JSON object");
      expect(() => Product.fromJSON("invalid")).toThrow("Invalid JSON object");
    });

    test("should generate unique IDs", () => {
      const id1 = Product.generateId();
      const id2 = Product.generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^product_\d+_[a-z0-9]+$/);
    });
  });
});

describe("InventoryManager Class", () => {
  let inventoryManager;

  beforeEach(() => {
    inventoryManager = new InventoryManager();
  });

  describe("Constructor", () => {
    test("should initialize with empty products array", () => {
      expect(inventoryManager.products).toEqual([]);
      expect(inventoryManager.getProductCount()).toBe(0);
    });
  });

  describe("Adding Products", () => {
    test("should add product successfully", () => {
      const product = inventoryManager.addProduct("Test Product", 10.99, 5);

      expect(product).toBeInstanceOf(Product);
      expect(product.getName()).toBe("Test Product");
      expect(inventoryManager.getProductCount()).toBe(1);
    });

    test("should throw error for duplicate product names", () => {
      inventoryManager.addProduct("Duplicate Product", 10, 5);

      expect(() => {
        inventoryManager.addProduct("Duplicate Product", 15, 3);
      }).toThrow('Product with name "Duplicate Product" already exists');
    });

    test("should be case-insensitive for duplicate names", () => {
      inventoryManager.addProduct("Test Product", 10, 5);

      expect(() => {
        inventoryManager.addProduct("test product", 15, 3);
      }).toThrow('Product with name "test product" already exists');
    });
  });

  describe("Removing Products", () => {
    let product;

    beforeEach(() => {
      product = inventoryManager.addProduct("Test Product", 10.99, 5);
    });

    test("should remove product by ID", () => {
      const result = inventoryManager.removeProduct(product.id);

      expect(result).toBe(true);
      expect(inventoryManager.getProductCount()).toBe(0);
    });

    test("should return false for non-existent product ID", () => {
      const result = inventoryManager.removeProduct("non_existent_id");

      expect(result).toBe(false);
      expect(inventoryManager.getProductCount()).toBe(1);
    });

    test("should remove product by name", () => {
      const result = inventoryManager.removeProductByName("Test Product");

      expect(result).toBe(true);
      expect(inventoryManager.getProductCount()).toBe(0);
    });

    test("should be case-insensitive when removing by name", () => {
      const result = inventoryManager.removeProductByName("test product");

      expect(result).toBe(true);
      expect(inventoryManager.getProductCount()).toBe(0);
    });

    test("should return false for non-existent product name", () => {
      const result = inventoryManager.removeProductByName("Non Existent");

      expect(result).toBe(false);
      expect(inventoryManager.getProductCount()).toBe(1);
    });
  });

  describe("Updating Products", () => {
    let product;

    beforeEach(() => {
      product = inventoryManager.addProduct("Test Product", 10.99, 5);
    });

    test("should update product successfully", () => {
      const updates = {
        name: "Updated Product",
        price: 15.99,
        quantity: 10,
      };

      const result = inventoryManager.updateProduct(product.id, updates);

      expect(result).toBe(true);
      expect(product.getName()).toBe("Updated Product");
      expect(product.getPrice()).toBe(15.99);
      expect(product.getQuantity()).toBe(10);
    });

    test("should return false for non-existent product", () => {
      const result = inventoryManager.updateProduct("non_existent_id", {
        name: "Test",
      });

      expect(result).toBe(false);
    });

    test("should throw error when updating to duplicate name", () => {
      inventoryManager.addProduct("Another Product", 20, 3);

      expect(() => {
        inventoryManager.updateProduct(product.id, { name: "Another Product" });
      }).toThrow('Product with name "Another Product" already exists');
    });

    test("should update product quantity", () => {
      const result = inventoryManager.updateProductQuantity(product.id, 5);

      expect(result).toBe(true);
      expect(product.getQuantity()).toBe(10);
    });

    test("should allow negative quantity changes", () => {
      const result = inventoryManager.updateProductQuantity(product.id, -2);

      expect(result).toBe(true);
      expect(product.getQuantity()).toBe(3);
    });

    test("should throw error when quantity would become negative", () => {
      expect(() => {
        inventoryManager.updateProductQuantity(product.id, -10);
      }).toThrow("Cannot reduce quantity below zero");
    });

    test("should return false for non-existent product quantity update", () => {
      const result = inventoryManager.updateProductQuantity(
        "non_existent_id",
        5
      );

      expect(result).toBe(false);
    });
  });

  describe("Finding Products", () => {
    let product1, product2;

    beforeEach(() => {
      product1 = inventoryManager.addProduct("Apple iPhone", 999.99, 10);
      product2 = inventoryManager.addProduct("Samsung Galaxy", 899.99, 5);
    });

    test("should find product by ID", () => {
      const found = inventoryManager.findProductById(product1.id);

      expect(found).toBe(product1);
    });

    test("should return null for non-existent ID", () => {
      const found = inventoryManager.findProductById("non_existent_id");

      expect(found).toBeNull();
    });

    test("should get product by ID (alias)", () => {
      const found = inventoryManager.getProductById(product1.id);

      expect(found).toBe(product1);
    });

    test("should find product by name", () => {
      const found = inventoryManager.findProductByName("Apple iPhone");

      expect(found).toBe(product1);
    });

    test("should be case-insensitive when finding by name", () => {
      const found = inventoryManager.findProductByName("apple iphone");

      expect(found).toBe(product1);
    });

    test("should return null for non-existent name", () => {
      const found = inventoryManager.findProductByName("Non Existent");

      expect(found).toBeNull();
    });
  });

  describe("Searching Products", () => {
    beforeEach(() => {
      inventoryManager.addProduct("Apple iPhone 13", 999.99, 10);
      inventoryManager.addProduct("Apple iPad", 599.99, 5);
      inventoryManager.addProduct("Samsung Galaxy S21", 899.99, 8);
      inventoryManager.addProduct("Samsung Galaxy Tab", 449.99, 3);
    });

    test("should search products by name pattern", () => {
      const results = inventoryManager.searchProducts("Apple");

      expect(results).toHaveLength(2);
      expect(results[0].getName()).toContain("Apple");
      expect(results[1].getName()).toContain("Apple");
    });

    test("should be case-insensitive", () => {
      const results = inventoryManager.searchProducts("apple");

      expect(results).toHaveLength(2);
    });

    test("should return empty array for non-string search term", () => {
      const results = inventoryManager.searchProducts(123);

      expect(results).toEqual([]);
    });

    test("should return empty array for no matches", () => {
      const results = inventoryManager.searchProducts("Nokia");

      expect(results).toEqual([]);
    });
  });

  describe("Stock Management", () => {
    beforeEach(() => {
      inventoryManager.addProduct("In Stock Product", 10, 15);
      inventoryManager.addProduct("Low Stock Product", 20, 3);
      inventoryManager.addProduct("Out of Stock Product", 30, 0);
      inventoryManager.addProduct("Another Low Stock", 40, 1);
    });

    test("should get out of stock products", () => {
      const outOfStock = inventoryManager.getOutOfStockProducts();

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].getName()).toBe("Out of Stock Product");
    });

    test("should get low stock products with default threshold", () => {
      const lowStock = inventoryManager.getLowStockProducts();

      expect(lowStock).toHaveLength(2);
      expect(lowStock.map((p) => p.getName())).toContain("Low Stock Product");
      expect(lowStock.map((p) => p.getName())).toContain("Another Low Stock");
    });

    test("should get low stock products with custom threshold", () => {
      const lowStock = inventoryManager.getLowStockProducts(10);

      expect(lowStock).toHaveLength(2);
    });

    test("should handle invalid threshold", () => {
      const lowStock = inventoryManager.getLowStockProducts("invalid");

      expect(lowStock).toHaveLength(2); // Should use default threshold of 5
    });
  });

  describe("Inventory Operations", () => {
    beforeEach(() => {
      inventoryManager.addProduct("Product 1", 10.5, 5);
      inventoryManager.addProduct("Product 2", 20.0, 3);
      inventoryManager.addProduct("Product 3", 15.75, 0);
    });

    test("should get all products", () => {
      const products = inventoryManager.getAllProducts();

      expect(products).toHaveLength(3);
      expect(products[0]).toBeInstanceOf(Product);
    });

    test("should return copy of products array", () => {
      const products = inventoryManager.getAllProducts();
      products.push("fake_product");

      expect(inventoryManager.getProductCount()).toBe(3);
    });

    test("should list all products (alias)", () => {
      const products = inventoryManager.listProducts();

      expect(products).toHaveLength(3);
    });

    test("should get product count", () => {
      expect(inventoryManager.getProductCount()).toBe(3);
    });

    test("should calculate total inventory value", () => {
      const totalValue = inventoryManager.getTotalInventoryValue();

      expect(totalValue).toBe(112.5); // (10.50*5) + (20.00*3) + (15.75*0)
    });

    test("should get inventory statistics", () => {
      const stats = inventoryManager.getInventoryStats();

      expect(stats).toHaveProperty("totalProducts", 3);
      expect(stats).toHaveProperty("inStock", 2);
      expect(stats).toHaveProperty("outOfStock", 1);
      expect(stats).toHaveProperty("lowStock", 2);
      expect(stats).toHaveProperty("totalValue", 112.5);
      expect(stats).toHaveProperty("totalItems", 8);
      expect(stats).toHaveProperty("averageProductValue");
    });

    test("should display products as formatted string", () => {
      const display = inventoryManager.displayProducts();

      expect(display).toContain("1. Product 1");
      expect(display).toContain("2. Product 2");
      expect(display).toContain("3. Product 3");
    });

    test("should display message for empty inventory", () => {
      const emptyManager = new InventoryManager();
      const display = emptyManager.displayProducts();

      expect(display).toBe("No products in inventory.");
    });

    test("should clear inventory", () => {
      const count = inventoryManager.clearInventory();

      expect(count).toBe(3);
      expect(inventoryManager.getProductCount()).toBe(0);
    });
  });

  describe("Import/Export", () => {
    let sampleData;

    beforeEach(() => {
      inventoryManager.addProduct("Product 1", 10.5, 5);
      inventoryManager.addProduct("Product 2", 20.0, 3);

      sampleData = {
        products: [
          {
            name: "Imported Product 1",
            price: 25.99,
            quantity: 10,
            id: "import_1",
            createdAt: "2023-01-01T00:00:00.000Z",
            updatedAt: "2023-01-01T00:00:00.000Z",
          },
          {
            name: "Imported Product 2",
            price: 35.5,
            quantity: 7,
            id: "import_2",
            createdAt: "2023-01-01T00:00:00.000Z",
            updatedAt: "2023-01-01T00:00:00.000Z",
          },
        ],
      };
    });

    test("should export to JSON", () => {
      const exported = inventoryManager.exportToJSON();

      expect(exported).toHaveProperty("products");
      expect(exported).toHaveProperty("stats");
      expect(exported).toHaveProperty("exportedAt");
      expect(exported.products).toHaveLength(2);
    });

    test("should import from JSON without replacing", () => {
      const importedCount = inventoryManager.importFromJSON(sampleData, false);

      expect(importedCount).toBe(2);
      expect(inventoryManager.getProductCount()).toBe(4);
    });

    test("should import from JSON with replacing", () => {
      const importedCount = inventoryManager.importFromJSON(sampleData, true);

      expect(importedCount).toBe(2);
      expect(inventoryManager.getProductCount()).toBe(2);
    });

    test("should skip duplicate products when not replacing", () => {
      inventoryManager.addProduct("Imported Product 1", 10, 5);
      const importedCount = inventoryManager.importFromJSON(sampleData, false);

      expect(importedCount).toBe(1); // Only one product imported
      expect(inventoryManager.getProductCount()).toBe(4);
    });

    test("should throw error for invalid JSON data", () => {
      expect(() => {
        inventoryManager.importFromJSON(null);
      }).toThrow("Invalid JSON data format");

      expect(() => {
        inventoryManager.importFromJSON({ products: "invalid" });
      }).toThrow("Invalid JSON data format");
    });

    test("should handle invalid products in import gracefully", () => {
      const invalidData = {
        products: [
          { name: "Valid Product", price: 10, quantity: 5 },
          { name: "", price: 20, quantity: 3 }, // Invalid name
          { name: "Another Valid", price: 15, quantity: 2 },
        ],
      };

      // Mock console.warn to avoid test output
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const importedCount = inventoryManager.importFromJSON(invalidData, true);

      expect(importedCount).toBe(2); // Should import only valid products
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe("Integration Tests", () => {
  test("should handle complete inventory workflow", () => {
    const manager = new InventoryManager();

    // Add products
    const product1 = manager.addProduct("iPhone 13", 999.99, 10);
    const product2 = manager.addProduct("Samsung Galaxy", 899.99, 5);
    const product3 = manager.addProduct("iPad", 599.99, 0);

    // Verify initial state
    expect(manager.getProductCount()).toBe(3);
    expect(manager.getTotalInventoryValue()).toBe(14499.85);

    // Update quantities
    manager.updateProductQuantity(product1.id, -2);
    manager.updateProductQuantity(product2.id, 3);

    // Check updated state
    expect(product1.getQuantity()).toBe(8);
    expect(product2.getQuantity()).toBe(8);

    // Search and filter
    const appleProducts = manager.searchProducts("i");
    expect(appleProducts).toHaveLength(2);

    const outOfStock = manager.getOutOfStockProducts();
    expect(outOfStock).toHaveLength(1);
    expect(outOfStock[0]).toBe(product3);

    // Update product details
    manager.updateProduct(product3.id, {
      name: "iPad Pro",
      price: 799.99,
      quantity: 5,
    });

    expect(product3.getName()).toBe("iPad Pro");
    expect(product3.getPrice()).toBe(799.99);
    expect(product3.getQuantity()).toBe(5);

    // Export and reimport
    const exportData = manager.exportToJSON();
    const newManager = new InventoryManager();
    const importedCount = newManager.importFromJSON(exportData, true);

    expect(importedCount).toBe(3);
    expect(newManager.getProductCount()).toBe(3);
    expect(newManager.getTotalInventoryValue()).toBe(
      manager.getTotalInventoryValue()
    );

    // Remove product
    manager.removeProduct(product1.id);
    expect(manager.getProductCount()).toBe(2);

    // Clear all
    const clearedCount = manager.clearInventory();
    expect(clearedCount).toBe(2);
    expect(manager.getProductCount()).toBe(0);
  });
});
