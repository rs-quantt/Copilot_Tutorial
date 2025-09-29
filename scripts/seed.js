const mongoose = require("mongoose");
require("dotenv").config();
const {
  Product,
  Supplier,
  Category,
  InventoryTransaction,
} = require("../models");

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/inventory_db"
    );
    console.log("MongoDB Connected for seeding...");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const seedSuppliers = async () => {
  console.log("🏪 Seeding suppliers...");

  const suppliers = [
    {
      name: "TechCorp Solutions",
      code: "TECH-001",
      contact: {
        email: "sales@techcorp.com",
        phone: "+15550123456",
        website: "https://techcorp.com",
      },
      address: {
        street: "123 Technology Drive",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "USA",
      },
      paymentTerms: "net_30",
      creditLimit: 50000,
      status: "active",
      rating: 4.5,
      primaryContact: {
        name: "John Smith",
        title: "Sales Manager",
        email: "john.smith@techcorp.com",
        phone: "+15550124567",
      },
      tags: ["electronics", "reliable", "fast-shipping"],
    },
    {
      name: "Global Supplies Inc",
      code: "GLOB-002",
      contact: {
        email: "orders@globalsupplies.com",
        phone: "+15550456789",
      },
      address: {
        street: "456 Supply Chain Blvd",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        country: "USA",
      },
      paymentTerms: "net_45",
      creditLimit: 25000,
      status: "active",
      rating: 4,
      tags: ["bulk-orders", "competitive-pricing"],
    },
    {
      name: "Premium Parts Ltd",
      code: "PREM-003",
      contact: {
        email: "info@premiumparts.com",
        phone: "+15550789012",
      },
      address: {
        street: "789 Premium Avenue",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
      paymentTerms: "net_15",
      creditLimit: 75000,
      status: "active",
      rating: 5,
      tags: ["premium", "quality", "expensive"],
    },
  ];

  await Supplier.deleteMany({});
  const createdSuppliers = await Supplier.insertMany(suppliers);
  console.log(`✅ Created ${createdSuppliers.length} suppliers`);
  return createdSuppliers;
};

const seedCategories = async () => {
  console.log("📁 Seeding categories...");

  // Create parent categories first
  const parentCategories = [
    {
      name: "Electronics",
      description: "Electronic devices and components",
      status: "active",
      sortOrder: 1,
    },
    {
      name: "Office Supplies",
      description: "Office and business supplies",
      status: "active",
      sortOrder: 2,
    },
    {
      name: "Industrial Equipment",
      description: "Industrial machinery and equipment",
      status: "active",
      sortOrder: 3,
    },
  ];

  await Category.deleteMany({});

  // Create parent categories one by one to ensure slug generation
  const createdParents = [];
  for (const categoryData of parentCategories) {
    const category = new Category(categoryData);
    await category.save();
    createdParents.push(category);
  }
  console.log(`✅ Created ${createdParents.length} parent categories`);

  // Create subcategories one by one
  const subcategoriesData = [
    {
      name: "Computers",
      description: "Desktop and laptop computers",
      parent: createdParents[0]._id,
      status: "active",
      sortOrder: 1,
    },
    {
      name: "Mobile Devices",
      description: "Smartphones and tablets",
      parent: createdParents[0]._id,
      status: "active",
      sortOrder: 2,
    },
    {
      name: "Audio Equipment",
      description: "Headphones, speakers, and audio devices",
      parent: createdParents[0]._id,
      status: "active",
      sortOrder: 3,
    },
    {
      name: "Stationery",
      description: "Pens, paper, and writing supplies",
      parent: createdParents[1]._id,
      status: "active",
      sortOrder: 1,
    },
    {
      name: "Furniture",
      description: "Office desks, chairs, and storage",
      parent: createdParents[1]._id,
      status: "active",
      sortOrder: 2,
    },
  ];

  const createdSubcategories = [];
  for (const categoryData of subcategoriesData) {
    const category = new Category(categoryData);
    await category.save();
    createdSubcategories.push(category);
  }
  console.log(`✅ Created ${createdSubcategories.length} subcategories`);

  return [...createdParents, ...createdSubcategories];
};

const seedProducts = async (suppliers, categories) => {
  console.log("📦 Seeding products...");

  const products = [
    {
      name: "MacBook Pro 16-inch",
      price: 2499.99,
      quantity: 15,
      category: "Computers",
      description: "Apple MacBook Pro with M2 Pro chip, 16GB RAM, 512GB SSD",
      supplier: {
        name: suppliers[2].name,
        id: suppliers[2]._id,
      },
      dimensions: {
        length: 35.57,
        width: 24.81,
        height: 1.68,
        weight: 2.15,
      },
      lowStockThreshold: 5,
      tags: ["apple", "laptop", "premium", "professional"],
      status: "active",
    },
    {
      name: "iPhone 15 Pro",
      price: 1199.99,
      quantity: 25,
      category: "Mobile Devices",
      description:
        "Latest iPhone with A17 Pro chip, 256GB storage, Titanium design",
      supplier: {
        name: suppliers[2].name,
        id: suppliers[2]._id,
      },
      dimensions: {
        length: 14.67,
        width: 7.81,
        height: 0.83,
        weight: 0.187,
      },
      lowStockThreshold: 10,
      tags: ["apple", "smartphone", "premium", "5g"],
      status: "active",
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      price: 1299.99,
      quantity: 8,
      category: "Mobile Devices",
      description: "Samsung flagship with S Pen, 512GB storage, 200MP camera",
      supplier: {
        name: suppliers[0].name,
        id: suppliers[0]._id,
      },
      lowStockThreshold: 5,
      tags: ["samsung", "android", "smartphone", "premium"],
      status: "active",
    },
    {
      name: "Sony WH-1000XM5 Headphones",
      price: 399.99,
      quantity: 30,
      category: "Audio Equipment",
      description: "Premium noise-cancelling wireless headphones",
      supplier: {
        name: suppliers[0].name,
        id: suppliers[0]._id,
      },
      dimensions: {
        length: 25.4,
        width: 21.6,
        height: 8.9,
        weight: 0.25,
      },
      lowStockThreshold: 10,
      tags: ["sony", "headphones", "wireless", "noise-cancelling"],
      status: "active",
    },
    {
      name: "Dell XPS 13",
      price: 1099.99,
      quantity: 12,
      category: "Computers",
      description: "Ultra-portable laptop with Intel i7, 16GB RAM, 512GB SSD",
      supplier: {
        name: suppliers[0].name,
        id: suppliers[0]._id,
      },
      lowStockThreshold: 8,
      tags: ["dell", "laptop", "ultrabook", "portable"],
      status: "active",
    },
    {
      name: "Office Chair - Ergonomic",
      price: 299.99,
      quantity: 20,
      category: "Furniture",
      description: "Adjustable ergonomic office chair with lumbar support",
      supplier: {
        name: suppliers[1].name,
        id: suppliers[1]._id,
      },
      dimensions: {
        length: 66,
        width: 66,
        height: 117,
        weight: 18.5,
      },
      lowStockThreshold: 5,
      tags: ["furniture", "ergonomic", "adjustable"],
      status: "active",
    },
    {
      name: "Wireless Mouse - Logitech MX Master 3",
      price: 99.99,
      quantity: 45,
      category: "Electronics",
      description: "Advanced wireless mouse with precision tracking",
      supplier: {
        name: suppliers[1].name,
        id: suppliers[1]._id,
      },
      lowStockThreshold: 15,
      tags: ["logitech", "mouse", "wireless", "precision"],
      status: "active",
    },
    {
      name: "Mechanical Keyboard - Keychron K2",
      price: 89.99,
      quantity: 35,
      category: "Electronics",
      description: "Compact mechanical keyboard with RGB backlighting",
      supplier: {
        name: suppliers[1].name,
        id: suppliers[1]._id,
      },
      lowStockThreshold: 12,
      tags: ["keyboard", "mechanical", "rgb", "compact"],
      status: "active",
    },
    {
      name: "Notebook Set - Moleskine",
      price: 24.99,
      quantity: 100,
      category: "Stationery",
      description: "Set of 3 premium notebooks with dotted pages",
      supplier: {
        name: suppliers[1].name,
        id: suppliers[1]._id,
      },
      lowStockThreshold: 25,
      tags: ["moleskine", "notebook", "premium", "dotted"],
      status: "active",
    },
    {
      name: "Standing Desk - Adjustable",
      price: 499.99,
      quantity: 3, // Low stock item
      category: "Furniture",
      description: "Electric height-adjustable standing desk",
      supplier: {
        name: suppliers[2].name,
        id: suppliers[2]._id,
      },
      dimensions: {
        length: 120,
        width: 60,
        height: 75,
        weight: 35,
      },
      lowStockThreshold: 5,
      tags: ["desk", "standing", "adjustable", "electric"],
      status: "active",
    },
  ];

  await Product.deleteMany({});
  const createdProducts = await Product.insertMany(products);
  console.log(`✅ Created ${createdProducts.length} products`);
  return createdProducts;
};

const seedTransactions = async (products) => {
  console.log("📊 Seeding inventory transactions...");

  const transactions = [];

  // Create some sample transactions for each product
  for (const product of products) {
    // Initial stock transaction
    transactions.push({
      product: product._id,
      type: "stock_in",
      quantity: product.quantity,
      previousQuantity: 0,
      newQuantity: product.quantity,
      reason: "Initial inventory",
      performedBy: "System",
      unitCost: product.price * 0.6, // Assume 40% markup
      reference: "INV-INIT-001",
    });

    // Random additional transactions
    if (Math.random() > 0.5) {
      const stockOut = Math.floor(Math.random() * 5) + 1;
      transactions.push({
        product: product._id,
        type: "stock_out",
        quantity: -stockOut,
        previousQuantity: product.quantity,
        newQuantity: product.quantity - stockOut,
        reason: "Customer order",
        performedBy: "Sales Team",
        reference: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      });
    }

    if (Math.random() > 0.7) {
      const adjustment = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      if (adjustment !== 0) {
        transactions.push({
          product: product._id,
          type: "adjustment",
          quantity: adjustment,
          previousQuantity: product.quantity,
          newQuantity: product.quantity + adjustment,
          reason:
            adjustment > 0
              ? "Stock recount - found additional items"
              : "Stock recount - damaged items removed",
          performedBy: "Warehouse Manager",
        });
      }
    }
  }

  await InventoryTransaction.deleteMany({});
  const createdTransactions = await InventoryTransaction.insertMany(
    transactions
  );
  console.log(
    `✅ Created ${createdTransactions.length} inventory transactions`
  );
  return createdTransactions;
};

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting database seeding...\n");

    const suppliers = await seedSuppliers();
    const categories = await seedCategories();
    const products = await seedProducts(suppliers, categories);
    const transactions = await seedTransactions(products);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("📊 Summary:");
    console.log(`   - Suppliers: ${suppliers.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Transactions: ${transactions.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
