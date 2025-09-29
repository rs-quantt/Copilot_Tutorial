const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    path: {
      type: String,
      default: "",
    },
    image: {
      url: String,
      alt: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [60, "SEO title cannot exceed 60 characters"],
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, "SEO description cannot exceed 160 characters"],
    },
    attributes: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["text", "number", "boolean", "select", "multiselect"],
          default: "text",
        },
        options: [String], // For select/multiselect types
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for product count
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Virtual for children categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Indexes
categorySchema.index({ name: "text", description: "text" });
// slug index already created by unique: true
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ status: 1 });

// Pre-save middleware
categorySchema.pre("save", async function (next) {
  // Generate slug from name
  if (this.isModified("name") || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[-\s]+/g, "-") // Replace spaces and multiple dashes with single dash
      .trim();
  }

  // Calculate level and path
  if (this.parent) {
    try {
      const parentCategory = await this.constructor.findById(this.parent);
      if (parentCategory) {
        this.level = parentCategory.level + 1;
        this.path = parentCategory.path
          ? `${parentCategory.path}/${parentCategory.slug}`
          : parentCategory.slug;
      }
    } catch (error) {
      return next(error);
    }
  } else {
    this.level = 0;
    this.path = "";
  }

  next();
});

// Pre-remove middleware to handle cascading deletes
categorySchema.pre("remove", async function (next) {
  try {
    // Check if category has children
    const childrenCount = await this.constructor.countDocuments({
      parent: this._id,
    });
    if (childrenCount > 0) {
      return next(new Error("Cannot delete category that has subcategories"));
    }

    // Check if category has products
    const Product = mongoose.model("Product");
    const productCount = await Product.countDocuments({ category: this.name });
    if (productCount > 0) {
      return next(new Error("Cannot delete category that has products"));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods
categorySchema.statics.findByLevel = function (level) {
  return this.find({ level, status: "active" }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.getRootCategories = function () {
  return this.find({ parent: null, status: "active" }).sort({
    sortOrder: 1,
    name: 1,
  });
};

categorySchema.statics.getChildCategories = function (parentId) {
  return this.find({ parent: parentId, status: "active" }).sort({
    sortOrder: 1,
    name: 1,
  });
};

categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ status: "active" })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .lean();

  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => {
        if (parentId === null)
          return cat.parent === null || cat.parent === undefined;
        return cat.parent && cat.parent.toString() === parentId.toString();
      })
      .map((cat) => ({
        ...cat,
        children: buildTree(cat._id),
      }));
  };

  return buildTree();
};

categorySchema.statics.searchCategories = function (searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, "i") },
      { description: new RegExp(searchTerm, "i") },
    ],
    status: "active",
  });
};

// Instance methods
categorySchema.methods.getAncestors = async function () {
  const ancestors = [];
  let current = this;

  while (current.parent) {
    current = await this.constructor.findById(current.parent);
    if (current) {
      ancestors.unshift(current);
    } else {
      break;
    }
  }

  return ancestors;
};

categorySchema.methods.getDescendants = async function () {
  const descendants = [];
  const findChildren = async (parentId) => {
    const children = await this.constructor.find({ parent: parentId });
    for (const child of children) {
      descendants.push(child);
      await findChildren(child._id);
    }
  };

  await findChildren(this._id);
  return descendants;
};

categorySchema.methods.getBreadcrumb = async function () {
  const ancestors = await this.getAncestors();
  return [...ancestors, this];
};

categorySchema.methods.activate = function () {
  this.status = "active";
  return this.save();
};

categorySchema.methods.deactivate = function () {
  this.status = "inactive";
  return this.save();
};

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
