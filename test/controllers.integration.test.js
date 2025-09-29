const request = require("supertest");
const app = require("../server");

describe("Controller Integration Tests", () => {
  describe("Health Check", () => {
    test("GET /api/health should return status OK", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.status).toBe("OK");
      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("Product Controller", () => {
    test("GET /api/products should return products with pagination", async () => {
      const response = await request(app).get("/api/products").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test("GET /api/products/search should require query parameter", async () => {
      const response = await request(app)
        .get("/api/products/search")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Search query is required");
    });

    test("GET /api/products/low-stock should return low stock products", async () => {
      const response = await request(app)
        .get("/api/products/low-stock")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
    });
  });

  describe("Supplier Controller", () => {
    test("GET /api/suppliers should return suppliers with pagination", async () => {
      const response = await request(app).get("/api/suppliers").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.suppliers).toBeInstanceOf(Array);
    });

    test("GET /api/suppliers/top-rated should return top rated suppliers", async () => {
      const response = await request(app)
        .get("/api/suppliers/top-rated")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suppliers).toBeInstanceOf(Array);
    });
  });

  describe("Category Controller", () => {
    test("GET /api/categories should return categories", async () => {
      const response = await request(app).get("/api/categories").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeInstanceOf(Array);
    });

    test("GET /api/categories/tree should return category tree", async () => {
      const response = await request(app)
        .get("/api/categories/tree")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("Transaction Controller", () => {
    test("GET /api/transactions should return transactions with pagination", async () => {
      const response = await request(app).get("/api/transactions").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
    });

    test("GET /api/transactions/recent should return recent transactions", async () => {
      const response = await request(app)
        .get("/api/transactions/recent")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
    });
  });

  describe("Dashboard Controller", () => {
    test("GET /api/dashboard/stats should return dashboard statistics", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overview).toBeDefined();
    });

    test("GET /api/dashboard/inventory-overview should return inventory overview", async () => {
      const response = await request(app)
        .get("/api/dashboard/inventory-overview")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test("GET /api/dashboard/alerts should return alerts", async () => {
      const response = await request(app)
        .get("/api/dashboard/alerts")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("GET /api/nonexistent should return 404", async () => {
      const response = await request(app).get("/api/nonexistent").expect(404);

      expect(response.body.error).toBe("Route not found");
    });

    test("GET /api/products/invalid-id should handle invalid ID gracefully", async () => {
      const response = await request(app).get("/api/products/invalid-id");

      // Should return either 404 or 500 depending on MongoDB validation
      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("CRUD Operations", () => {
    let createdProductId;
    let createdSupplierId;
    let createdCategoryId;

    test("POST /api/products should create a new product", async () => {
      const productData = {
        name: "Test Product Controller",
        description: "Product created during controller integration test",
        price: 99.99,
        quantity: 50,
        sku: `TEST-CTRL-${Date.now()}`,
        reorderLevel: 10,
        category: null,
        supplier: null,
      };

      const response = await request(app)
        .post("/api/products")
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
      createdProductId = response.body.data._id;
    });

    test("POST /api/suppliers should create a new supplier", async () => {
      const supplierData = {
        name: "Test Supplier Controller",
        code: `TSC-${Date.now()}`,
        contactPerson: "John Doe",
        email: "test@supplier.com",
        phone: "123-456-7890",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "TS",
          zipCode: "12345",
          country: "Test Country",
        },
        paymentTerms: "Net 30",
        creditLimit: 10000,
      };

      const response = await request(app)
        .post("/api/suppliers")
        .send(supplierData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(supplierData.name);
      createdSupplierId = response.body.data._id;
    });

    test("POST /api/categories should create a new category", async () => {
      const categoryData = {
        name: "Test Category Controller",
        description: "Category created during controller integration test",
        slug: `test-category-ctrl-${Date.now()}`,
        parent: null,
      };

      const response = await request(app)
        .post("/api/categories")
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(categoryData.name);
      createdCategoryId = response.body.data._id;
    });

    test("PUT /api/products/:id should update the created product", async () => {
      if (!createdProductId) {
        return; // Skip if product creation failed
      }

      const updateData = {
        name: "Updated Test Product Controller",
        price: 129.99,
        quantity: 75,
      };

      const response = await request(app)
        .put(`/api/products/${createdProductId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });

    test("GET /api/products/:id should retrieve the created product", async () => {
      if (!createdProductId) {
        return; // Skip if product creation failed
      }

      const response = await request(app)
        .get(`/api/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(createdProductId);
      expect(response.body.data.name).toBe("Updated Test Product Controller");
    });

    test("DELETE /api/products/:id should soft delete the created product", async () => {
      if (!createdProductId) {
        return; // Skip if product creation failed
      }

      const response = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");
    });
  });
});

// Setup and teardown
beforeAll(async () => {
  // Wait a moment for the server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Close any open connections if needed
  // This depends on your database connection setup
});
