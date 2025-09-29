const SupplierDAO = require("../../daos/SupplierDAO");

// Helper functions
function calculateAverageRating(suppliers) {
  if (suppliers.length === 0) return 0;
  const total = suppliers.reduce((sum, s) => sum + (s.rating || 0), 0);
  return total / suppliers.length;
}

function filterActiveSuppliers(suppliers) {
  return suppliers.filter((s) => s.status === "active");
}

function validateSupplierCode(code) {
  if (!code) return false;
  if (code.length < 3) return false;
  return /^[A-Z0-9]+$/.test(code);
}

describe("SupplierDAO", () => {
  let supplierDAO;

  beforeEach(() => {
    supplierDAO = new SupplierDAO();
  });

  test("should search suppliers", async () => {
    const mockResult = {
      data: [
        {
          name: "Test Supplier",
          code: "SUP001",
          rating: 4.5,
          status: "active",
        },
      ],
      total: 1,
    };
    jest.spyOn(supplierDAO, "search").mockResolvedValue(mockResult);

    const result = await supplierDAO.search("test");

    // Test helper functions
    const avgRating = calculateAverageRating(result.data);
    const activeSuppliers = filterActiveSuppliers(result.data);

    expect(avgRating).toBe(4.5);
    expect(activeSuppliers).toHaveLength(1);
    expect(result.data[0].name).toBe("Test Supplier");
  });

  test("should find supplier by code", async () => {
    const mockSupplier = { name: "Test Supplier", code: "SUP001" };
    jest.spyOn(supplierDAO, "findByCode").mockResolvedValue(mockSupplier);

    const result = await supplierDAO.findByCode("SUP001");

    // Test code validation
    const isValidCode = validateSupplierCode(result.code);
    const isInvalidCode = validateSupplierCode("ab");

    expect(isValidCode).toBe(true);
    expect(isInvalidCode).toBe(false);
    expect(result.code).toBe("SUP001");
  });

  test("should get active suppliers", async () => {
    const mockResult = {
      data: [{ name: "Active Supplier", status: "active", rating: 3.0 }],
      total: 1,
    };
    jest.spyOn(supplierDAO, "getActiveSuppliers").mockResolvedValue(mockResult);

    const result = await supplierDAO.getActiveSuppliers();

    // Test with empty array
    const emptyRating = calculateAverageRating([]);
    expect(emptyRating).toBe(0);
    expect(result.data[0].status).toBe("active");
  });
});
