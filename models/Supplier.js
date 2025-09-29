const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [100, "Supplier name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      unique: true,
      required: [true, "Supplier code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "Supplier code cannot exceed 20 characters"],
    },
    contact: {
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
        validate: {
          validator: function (phone) {
            if (!phone) return true; // Optional field
            return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ""));
          },
          message: "Please enter a valid phone number",
        },
      },
      website: {
        type: String,
        trim: true,
        validate: {
          validator: function (url) {
            if (!url) return true; // Optional field
            return /^https?:\/\/.+/.test(url);
          },
          message: "Please enter a valid website URL",
        },
      },
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [100, "Street cannot exceed 100 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, "City cannot exceed 50 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, "State cannot exceed 50 characters"],
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, "Zip code cannot exceed 20 characters"],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, "Country cannot exceed 50 characters"],
        default: "USA",
      },
    },
    paymentTerms: {
      type: String,
      enum: ["net_15", "net_30", "net_45", "net_60", "cod", "prepaid"],
      default: "net_30",
    },
    creditLimit: {
      type: Number,
      min: [0, "Credit limit cannot be negative"],
      default: 0,
    },
    taxId: {
      type: String,
      trim: true,
      maxlength: [50, "Tax ID cannot exceed 50 characters"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: function (value) {
          return Number.isInteger(value) || value % 0.5 === 0;
        },
        message: "Rating must be a whole number or half number between 1 and 5",
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    primaryContact: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Contact name cannot exceed 100 characters"],
      },
      title: {
        type: String,
        trim: true,
        maxlength: [50, "Contact title cannot exceed 50 characters"],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (email) {
            if (!email) return true;
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full address
supplierSchema.virtual("fullAddress").get(function () {
  const addr = this.address;
  if (!addr.street && !addr.city && !addr.state) return "";

  let address = "";
  if (addr.street) address += addr.street;
  if (addr.city) address += (address ? ", " : "") + addr.city;
  if (addr.state) address += (address ? ", " : "") + addr.state;
  if (addr.zipCode) address += (address ? " " : "") + addr.zipCode;
  if (addr.country && addr.country !== "USA")
    address += (address ? ", " : "") + addr.country;

  return address;
});

// Virtual for product count
supplierSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "supplier.id",
  count: true,
});

// Indexes
supplierSchema.index({
  name: "text",
  code: "text",
  "primaryContact.name": "text",
});
supplierSchema.index({ status: 1 });
// code index already created by unique: true

// Pre-save middleware
supplierSchema.pre("save", function (next) {
  // Auto-generate supplier code if not provided
  if (!this.code && this.isNew) {
    const namePrefix = this.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    this.code = `${namePrefix || "SUP"}-${timestamp}-${random}`;
  }
  next();
});

// Static methods
supplierSchema.statics.findByStatus = function (status) {
  return this.find({ status });
};

supplierSchema.statics.searchSuppliers = function (searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, "i") },
      { code: new RegExp(searchTerm, "i") },
      { "primaryContact.name": new RegExp(searchTerm, "i") },
      { tags: { $in: [new RegExp(searchTerm, "i")] } },
    ],
  });
};

supplierSchema.statics.getTopSuppliers = function (limit = 10) {
  return this.aggregate([
    { $match: { status: "active" } },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "supplier.id",
        as: "products",
      },
    },
    {
      $addFields: {
        productCount: { $size: "$products" },
        totalInventoryValue: {
          $sum: {
            $map: {
              input: "$products",
              as: "product",
              in: { $multiply: ["$$product.price", "$$product.quantity"] },
            },
          },
        },
      },
    },
    { $sort: { totalInventoryValue: -1 } },
    { $limit: limit },
    { $project: { products: 0 } },
  ]);
};

// Instance methods
supplierSchema.methods.activate = function () {
  this.status = "active";
  return this.save();
};

supplierSchema.methods.deactivate = function () {
  this.status = "inactive";
  return this.save();
};

supplierSchema.methods.suspend = function () {
  this.status = "suspended";
  return this.save();
};

supplierSchema.methods.addTag = function (tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

supplierSchema.methods.removeTag = function (tag) {
  this.tags = this.tags.filter((t) => t !== tag);
  return this.save();
};

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;
