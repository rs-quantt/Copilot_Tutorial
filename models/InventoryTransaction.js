const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    type: {
      type: String,
      enum: [
        "stock_in",
        "stock_out",
        "adjustment",
        "damaged",
        "expired",
        "transfer",
      ],
      required: [true, "Transaction type is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      validate: {
        validator: function (value) {
          return Number.isInteger(value) && value !== 0;
        },
        message: "Quantity must be a non-zero integer",
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      min: [0, "Unit cost cannot be negative"],
    },
    totalCost: {
      type: Number,
      min: [0, "Total cost cannot be negative"],
    },
    reason: {
      type: String,
      required: [true, "Transaction reason is required"],
      trim: true,
      maxlength: [200, "Reason cannot exceed 200 characters"],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [50, "Reference cannot exceed 50 characters"],
    },
    supplier: {
      name: String,
      id: String,
    },
    performedBy: {
      type: String,
      required: [true, "User performing transaction is required"],
      trim: true,
    },
    location: {
      warehouse: String,
      section: String,
      shelf: String,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ performedBy: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate total cost
inventoryTransactionSchema.pre("save", function (next) {
  if (this.unitCost && this.quantity) {
    this.totalCost = Math.abs(this.quantity * this.unitCost);
  }
  next();
});

// Static methods
inventoryTransactionSchema.statics.getProductHistory = function (
  productId,
  limit = 50
) {
  return this.find({ product: productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("product", "name sku");
};

inventoryTransactionSchema.statics.getTransactionsByType = function (
  type,
  startDate,
  endDate
) {
  const query = { type };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate("product", "name sku");
};

inventoryTransactionSchema.statics.getInventorySummary = function (
  startDate,
  endDate
) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$type",
        totalTransactions: { $sum: 1 },
        totalQuantity: { $sum: { $abs: "$quantity" } },
        totalValue: { $sum: "$totalCost" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

module.exports = InventoryTransaction;
