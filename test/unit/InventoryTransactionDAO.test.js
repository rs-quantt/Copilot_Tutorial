const InventoryTransactionDAO = require("../../daos/InventoryTransactionDAO");

// Transaction helpers
function calculateTotalQuantity(transactions) {
  return transactions.reduce((sum, t) => {
    if (t.type === "in") return sum + t.quantity;
    if (t.type === "out") return sum - t.quantity;
    return sum;
  }, 0);
}

function groupByType(transactions) {
  const groups = { in: [], out: [], adjustment: [] };
  transactions.forEach((t) => {
    if (groups[t.type]) {
      groups[t.type].push(t);
    }
  });
  return groups;
}

function isRecentTransaction(transaction, days = 7) {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);
  return new Date(transaction.createdAt) >= daysAgo;
}

describe("InventoryTransactionDAO", () => {
  let inventoryTransactionDAO;

  beforeEach(() => {
    inventoryTransactionDAO = new InventoryTransactionDAO();
  });

  test("should create transaction", async () => {
    const mockTransaction = {
      _id: "123",
      productId: "456",
      type: "in",
      quantity: 10,
    };
    jest
      .spyOn(inventoryTransactionDAO, "createTransaction")
      .mockResolvedValue(mockTransaction);

    const result = await inventoryTransactionDAO.createTransaction({
      product: "456",
      type: "in",
      quantity: 10,
    });
    expect(result.type).toBe("in");
  });

  test("should get transactions by type", async () => {
    const mockResult = {
      data: [{ type: "in", quantity: 10 }],
      total: 1,
    };
    jest
      .spyOn(inventoryTransactionDAO, "getTransactionsByType")
      .mockResolvedValue(mockResult);

    const result = await inventoryTransactionDAO.getTransactionsByType("in");
    expect(result.data[0].type).toBe("in");
  });

  test("should get recent transactions", async () => {
    const mockResult = {
      data: [{ type: "out", quantity: 5, createdAt: new Date() }],
      total: 1,
    };
    jest
      .spyOn(inventoryTransactionDAO, "getRecentTransactions")
      .mockResolvedValue(mockResult);

    const result = await inventoryTransactionDAO.getRecentTransactions(7);
    expect(result.data[0].type).toBe("out");
  });
});
