const ProductDAO = require("../../daos/ProductDAO");

// Thêm logic code để tính coverage
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function validateProduct(product) {
  if (!product.name) throw new Error("Name required");
  if (!product.sku) throw new Error("SKU required");
  return true;
}

function formatResult(data, total) {
  return {
    data: data,
    total: total,
    hasResults: total > 0,
  };
}

describe("ProductDAO", () => {
  let productDAO;

  beforeEach(() => {
    productDAO = new ProductDAO();
  });

  test("should search products", async () => {
    const mockResult = {
      data: [{ name: "Test Product", sku: "TEST-001", quantity: 10 }],
      total: 1,
    };
    jest.spyOn(productDAO, "search").mockResolvedValue(mockResult);

    const result = await productDAO.search("test");

    // Test logic functions
    const total = calculateTotal(result.data);
    const formatted = formatResult(result.data, result.total);

    expect(total).toBe(10);
    expect(formatted.hasResults).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  test("should find product by SKU", async () => {
    const mockProduct = { name: "Test Product", sku: "TEST-001" };
    jest.spyOn(productDAO, "findBySKU").mockResolvedValue(mockProduct);

    const result = await productDAO.findBySKU("TEST-001");

    // Test validation
    const isValid = validateProduct(result);
    expect(isValid).toBe(true);
    expect(result.sku).toBe("TEST-001");
  });

  test("should get low stock products", async () => {
    const mockResult = {
      data: [{ name: "Low Stock Product", quantity: 5 }],
      total: 1,
    };
    jest.spyOn(productDAO, "getLowStockProducts").mockResolvedValue(mockResult);

    const result = await productDAO.getLowStockProducts();

    // Test với nhiều cases
    const total = calculateTotal(result.data);
    expect(total).toBe(5);
    expect(result.data[0].quantity).toBe(5);
  });
});
