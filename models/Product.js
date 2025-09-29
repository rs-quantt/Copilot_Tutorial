const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [1, "Product name cannot be empty"],
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"],
      validate: {
        validator: function (value) {
          return !isNaN(value) && isFinite(value);
        },
        message: "Product price must be a valid number",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Product quantity is required"],
      min: [0, "Product quantity cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Product quantity must be an integer",
      },
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple documents without sku
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    supplier: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Supplier name cannot exceed 100 characters"],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (email) {
            if (!email) return true; // Optional field
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
          },
          message: "Please enter a valid email address",
        },
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      weight: { type: Number, min: 0 },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, "Low stock threshold cannot be negative"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: "",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total value
productSchema.virtual("totalValue").get(function () {
  return Number((this.price * this.quantity).toFixed(2));
});

// Virtual for stock status
productSchema.virtual("stockStatus").get(function () {
  if (this.quantity === 0) return "out_of_stock";
  if (this.quantity <= this.lowStockThreshold) return "low_stock";
  return "in_stock";
});

// Virtual for formatted price
productSchema.virtual("formattedPrice").get(function () {
  return `$${this.price.toFixed(2)}`;
});

// Index for better query performance
productSchema.index({ name: "text", description: "text", category: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ quantity: 1 });
productSchema.index({ "supplier.name": 1 });

// Pre-save middleware
productSchema.pre("save", function (next) {
  // Auto-generate SKU if not provided
  if (!this.sku && this.isNew) {
    const prefix = this.category
      ? this.category.substring(0, 3).toUpperCase()
      : "PRD";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.sku = `${prefix}-${timestamp}-${random}`;
  }

  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter((img) => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0) img.isPrimary = false;
      });
    } else if (primaryImages.length === 0 && this.images.length > 0) {
      // Set first image as primary if none is marked
      this.images[0].isPrimary = true;
    }
  }

  next();
});

// Static methods
productSchema.statics.findByCategory = function (category) {
  return this.find({ category: new RegExp(category, "i"), status: "active" });
};

productSchema.statics.findLowStock = function (threshold = null) {
  return this.find({
    $expr: {
      $lte: ["$quantity", threshold || "$lowStockThreshold"],
    },
    status: "active",
    quantity: { $gt: 0 },
  });
};

productSchema.statics.findOutOfStock = function () {
  return this.find({ quantity: 0, status: "active" });
};

productSchema.statics.searchProducts = function (searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, "i") },
      { description: new RegExp(searchTerm, "i") },
      { category: new RegExp(searchTerm, "i") },
      { sku: new RegExp(searchTerm, "i") },
      { tags: { $in: [new RegExp(searchTerm, "i")] } },
    ],
    status: "active",
  });
};

// Instance methods
productSchema.methods.isInStock = function () {
  return this.quantity > 0;
};

productSchema.methods.isLowStock = function () {
  return this.quantity <= this.lowStockThreshold && this.quantity > 0;
};

productSchema.methods.updateQuantity = function (change) {
  const newQuantity = this.quantity + change;
  if (newQuantity < 0) {
    throw new Error("Cannot reduce quantity below zero");
  }
  this.quantity = newQuantity;
  return this.save();
};

productSchema.methods.addImage = function (imageData) {
  // If this is the first image, make it primary
  if (this.images.length === 0) {
    imageData.isPrimary = true;
  }
  this.images.push(imageData);
  return this.save();
};

productSchema.methods.removeImage = function (imageId) {
  this.images.id(imageId).remove();
  // If we removed the primary image, make the first remaining image primary
  if (this.images.length > 0 && !this.images.some((img) => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }
  return this.save();
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
