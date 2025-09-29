const {
  productDAO,
  supplierDAO,
  categoryDAO,
  inventoryTransactionDAO,
} = require("../daos");

/**
 * Dashboard Controller
 * Handles analytics, statistics, and dashboard data endpoints
 */
class DashboardController {
  /**
   * Get overall dashboard statistics
   * GET /api/dashboard/stats
   */
  async getDashboardStats(req, res) {
    try {
      const { period = "30" } = req.query;
      const days = parseInt(period);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get parallel statistics
      const [
        totalProducts,
        totalSuppliers,
        totalCategories,
        lowStockProducts,
        outOfStockProducts,
        recentTransactions,
        topProducts,
        inventoryValue,
      ] = await Promise.all([
        productDAO.count({ status: "active" }),
        supplierDAO.count({ status: "active" }),
        categoryDAO.count({ status: "active" }),
        productDAO.getLowStockProducts({ limit: 1 }),
        productDAO.getOutOfStockProducts({ limit: 1 }),
        inventoryTransactionDAO.getRecentTransactions(days, {}, { limit: 10 }),
        this._getTopProducts(days),
        this._calculateInventoryValue(),
      ]);

      const stats = {
        overview: {
          totalProducts,
          totalSuppliers,
          totalCategories,
          lowStockCount: lowStockProducts.pagination?.totalDocuments || 0,
          outOfStockCount: outOfStockProducts.pagination?.totalDocuments || 0,
          inventoryValue: inventoryValue.total,
          lastUpdated: new Date(),
        },
        recent: {
          transactions: recentTransactions.documents || recentTransactions,
          topProducts: topProducts,
          period: `${days} days`,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get inventory overview
   * GET /api/dashboard/inventory-overview
   */
  async getInventoryOverview(req, res) {
    try {
      const [
        totalValue,
        stockLevels,
        categoryBreakdown,
        supplierBreakdown,
        lowStockAlerts,
        recentMovements,
      ] = await Promise.all([
        this._calculateInventoryValue(),
        this._getStockLevelDistribution(),
        this._getCategoryBreakdown(),
        this._getSupplierBreakdown(),
        productDAO.getLowStockProducts({ limit: 5 }),
        inventoryTransactionDAO.getRecentTransactions(7, {}, { limit: 10 }),
      ]);

      const overview = {
        totalValue,
        stockLevels,
        categoryBreakdown,
        supplierBreakdown,
        alerts: {
          lowStock: lowStockAlerts.documents || lowStockAlerts,
        },
        recentMovements: recentMovements.documents || recentMovements,
      };

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error("Error fetching inventory overview:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get sales analytics
   * GET /api/dashboard/sales-analytics
   */
  async getSalesAnalytics(req, res) {
    try {
      const { period = "30", groupBy = "day" } = req.query;
      const days = parseInt(period);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        salesTrend,
        topSellingProducts,
        categoryPerformance,
        supplierPerformance,
      ] = await Promise.all([
        this._getSalesTrend(startDate, endDate, groupBy),
        this._getTopSellingProducts(startDate, endDate),
        this._getCategoryPerformance(startDate, endDate),
        this._getSupplierPerformance(startDate, endDate),
      ]);

      const analytics = {
        period: {
          start: startDate,
          end: endDate,
          days: days,
        },
        salesTrend,
        topSellingProducts,
        categoryPerformance,
        supplierPerformance,
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get alerts and notifications
   * GET /api/dashboard/alerts
   */
  async getAlerts(req, res) {
    try {
      const { severity = "all", limit = 50 } = req.query;

      const [
        lowStockAlerts,
        outOfStockAlerts,
        lowCreditSuppliers,
        recentHighValueTransactions,
        expiringSoonProducts,
      ] = await Promise.all([
        productDAO.getLowStockProducts({ limit: parseInt(limit) }),
        productDAO.getOutOfStockProducts({ limit: parseInt(limit) }),
        supplierDAO.getLowCredit(5000, { limit: parseInt(limit) }),
        this._getHighValueTransactions(7),
        this._getExpiringSoonProducts(30),
      ]);

      const alerts = {
        critical: [
          ...(outOfStockAlerts.documents?.map((p) => ({
            type: "out_of_stock",
            severity: "critical",
            message: `Product "${p.name}" is out of stock`,
            productId: p._id,
            createdAt: new Date(),
          })) || []),
          ...expiringSoonProducts.map((p) => ({
            type: "expiring_soon",
            severity: "critical",
            message: `Product "${p.name}" expires in ${p.daysUntilExpiry} days`,
            productId: p._id,
            createdAt: new Date(),
          })),
        ],
        warning: [
          ...(lowStockAlerts.documents?.map((p) => ({
            type: "low_stock",
            severity: "warning",
            message: `Product "${p.name}" is running low (${p.quantity} left)`,
            productId: p._id,
            createdAt: new Date(),
          })) || []),
          ...(lowCreditSuppliers.documents?.map((s) => ({
            type: "low_credit",
            severity: "warning",
            message: `Supplier "${s.name}" has low credit limit ($${s.creditLimit})`,
            supplierId: s._id,
            createdAt: new Date(),
          })) || []),
        ],
        info: recentHighValueTransactions.map((t) => ({
          type: "high_value_transaction",
          severity: "info",
          message: `High value ${t.type} transaction: ${t.quantity} units`,
          transactionId: t._id,
          createdAt: t.createdAt,
        })),
      };

      // Filter by severity if specified
      let filteredAlerts = alerts;
      if (severity !== "all") {
        filteredAlerts = { [severity]: alerts[severity] || [] };
      }

      res.json({
        success: true,
        data: {
          alerts: filteredAlerts,
          summary: {
            critical: alerts.critical.length,
            warning: alerts.warning.length,
            info: alerts.info.length,
            total:
              alerts.critical.length +
              alerts.warning.length +
              alerts.info.length,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching alerts:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get supplier performance dashboard
   * GET /api/dashboard/supplier-performance
   */
  async getSupplierPerformance(req, res) {
    try {
      const { period = "30" } = req.query;
      const days = parseInt(period);

      const [
        topRatedSuppliers,
        supplierStats,
        deliveryPerformance,
        paymentTermsAnalysis,
      ] = await Promise.all([
        supplierDAO.getTopRated({ limit: 10 }),
        this._getSupplierStatistics(days),
        this._getDeliveryPerformance(days),
        this._getPaymentTermsAnalysis(),
      ]);

      const performance = {
        topRated: topRatedSuppliers.documents || topRatedSuppliers,
        statistics: supplierStats,
        deliveryPerformance,
        paymentTermsAnalysis,
        period: `${days} days`,
      };

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error("Error fetching supplier performance:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  /**
   * Get trend analysis
   * GET /api/dashboard/trends
   */
  async getTrendAnalysis(req, res) {
    try {
      const {
        period = "30",
        metrics = "inventory,sales,suppliers",
        granularity = "day",
      } = req.query;

      const days = parseInt(period);
      const metricsArray = metrics.split(",");

      const trends = {};

      if (metricsArray.includes("inventory")) {
        trends.inventory = await this._getInventoryTrend(days, granularity);
      }

      if (metricsArray.includes("sales")) {
        trends.sales = await this._getSalesTrend(
          new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          new Date(),
          granularity
        );
      }

      if (metricsArray.includes("suppliers")) {
        trends.suppliers = await this._getSupplierTrend(days, granularity);
      }

      res.json({
        success: true,
        data: {
          trends,
          period: `${days} days`,
          granularity,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error fetching trend analysis:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  // Helper methods for complex calculations

  async _calculateInventoryValue() {
    try {
      const products = await productDAO.findAll({ status: "active" });
      let total = 0;
      let totalItems = 0;

      products.forEach((product) => {
        const value = product.quantity * product.price;
        total += value;
        totalItems += product.quantity;
      });

      return {
        total: Math.round(total * 100) / 100,
        totalItems,
        averageItemValue:
          totalItems > 0 ? Math.round((total / totalItems) * 100) / 100 : 0,
      };
    } catch (error) {
      console.error("Error calculating inventory value:", error);
      return { total: 0, totalItems: 0, averageItemValue: 0 };
    }
  }

  async _getStockLevelDistribution() {
    try {
      const products = await productDAO.findAll({ status: "active" });

      const distribution = {
        outOfStock: 0,
        lowStock: 0,
        adequateStock: 0,
        overStock: 0,
      };

      products.forEach((product) => {
        if (product.quantity === 0) {
          distribution.outOfStock++;
        } else if (product.quantity <= product.reorderLevel) {
          distribution.lowStock++;
        } else if (product.quantity > product.reorderLevel * 3) {
          distribution.overStock++;
        } else {
          distribution.adequateStock++;
        }
      });

      return distribution;
    } catch (error) {
      console.error("Error getting stock level distribution:", error);
      return { outOfStock: 0, lowStock: 0, adequateStock: 0, overStock: 0 };
    }
  }

  async _getCategoryBreakdown() {
    try {
      const products = await productDAO.findAll(
        { status: "active" },
        { populate: "category" }
      );
      const breakdown = {};

      products.forEach((product) => {
        const categoryName = product.category?.name || "Uncategorized";
        if (!breakdown[categoryName]) {
          breakdown[categoryName] = { count: 0, value: 0 };
        }
        breakdown[categoryName].count++;
        breakdown[categoryName].value += product.quantity * product.price;
      });

      return Object.entries(breakdown)
        .map(([name, data]) => ({
          name,
          count: data.count,
          value: Math.round(data.value * 100) / 100,
        }))
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error getting category breakdown:", error);
      return [];
    }
  }

  async _getSupplierBreakdown() {
    try {
      const products = await productDAO.findAll(
        { status: "active" },
        { populate: "supplier" }
      );
      const breakdown = {};

      products.forEach((product) => {
        const supplierName = product.supplier?.name || "No Supplier";
        if (!breakdown[supplierName]) {
          breakdown[supplierName] = { count: 0, value: 0 };
        }
        breakdown[supplierName].count++;
        breakdown[supplierName].value += product.quantity * product.price;
      });

      return Object.entries(breakdown)
        .map(([name, data]) => ({
          name,
          count: data.count,
          value: Math.round(data.value * 100) / 100,
        }))
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error getting supplier breakdown:", error);
      return [];
    }
  }

  async _getTopProducts(days) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await inventoryTransactionDAO.getByDateRange(
        { startDate, endDate: new Date() },
        { type: "sale" },
        { limit: 1000 }
      );

      const productSales = {};
      const docs = transactions.documents || transactions;

      docs.forEach((transaction) => {
        const productId = transaction.product._id || transaction.product;
        if (!productSales[productId]) {
          productSales[productId] = {
            product: transaction.product,
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        productSales[productId].totalQuantity += Math.abs(transaction.quantity);
        productSales[productId].totalValue +=
          Math.abs(transaction.quantity) * (transaction.unitCost || 0);
      });

      return Object.values(productSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);
    } catch (error) {
      console.error("Error getting top products:", error);
      return [];
    }
  }

  async _getSalesTrend(startDate, endDate, groupBy) {
    try {
      const transactions = await inventoryTransactionDAO.getByDateRange(
        { startDate, endDate },
        { type: "sale" },
        { limit: 10000 }
      );

      // Group transactions by date based on granularity
      const grouped = {};
      const docs = transactions.documents || transactions;

      docs.forEach((transaction) => {
        let dateKey;
        const date = new Date(transaction.createdAt);

        switch (groupBy) {
          case "hour":
            dateKey = date.toISOString().substring(0, 13);
            break;
          case "day":
            dateKey = date.toISOString().substring(0, 10);
            break;
          case "week":
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = weekStart.toISOString().substring(0, 10);
            break;
          case "month":
            dateKey = date.toISOString().substring(0, 7);
            break;
          default:
            dateKey = date.toISOString().substring(0, 10);
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = { quantity: 0, value: 0, transactions: 0 };
        }
        grouped[dateKey].quantity += Math.abs(transaction.quantity);
        grouped[dateKey].value +=
          Math.abs(transaction.quantity) * (transaction.unitCost || 0);
        grouped[dateKey].transactions++;
      });

      return Object.entries(grouped)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("Error getting sales trend:", error);
      return [];
    }
  }

  async _getTopSellingProducts(startDate, endDate) {
    return this._getTopProducts(
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    );
  }

  async _getCategoryPerformance(startDate, endDate) {
    try {
      const transactions = await inventoryTransactionDAO.getByDateRange(
        { startDate, endDate },
        { type: "sale" },
        { limit: 10000, populate: "product" }
      );

      const categoryPerformance = {};
      const docs = transactions.documents || transactions;

      docs.forEach((transaction) => {
        const categoryName =
          transaction.product?.category?.name || "Uncategorized";
        if (!categoryPerformance[categoryName]) {
          categoryPerformance[categoryName] = {
            quantity: 0,
            value: 0,
            transactions: 0,
          };
        }
        categoryPerformance[categoryName].quantity += Math.abs(
          transaction.quantity
        );
        categoryPerformance[categoryName].value +=
          Math.abs(transaction.quantity) * (transaction.unitCost || 0);
        categoryPerformance[categoryName].transactions++;
      });

      return Object.entries(categoryPerformance)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error getting category performance:", error);
      return [];
    }
  }

  async _getSupplierPerformance(startDate, endDate) {
    try {
      const transactions = await inventoryTransactionDAO.getByDateRange(
        { startDate, endDate },
        {},
        { limit: 10000, populate: "product" }
      );

      const supplierPerformance = {};
      const docs = transactions.documents || transactions;

      docs.forEach((transaction) => {
        const supplierName =
          transaction.product?.supplier?.name || "No Supplier";
        if (!supplierPerformance[supplierName]) {
          supplierPerformance[supplierName] = {
            stockIn: 0,
            stockOut: 0,
            value: 0,
            transactions: 0,
          };
        }

        if (transaction.type === "stock_in") {
          supplierPerformance[supplierName].stockIn += transaction.quantity;
        } else if (
          transaction.type === "stock_out" ||
          transaction.type === "sale"
        ) {
          supplierPerformance[supplierName].stockOut += Math.abs(
            transaction.quantity
          );
        }

        supplierPerformance[supplierName].value +=
          Math.abs(transaction.quantity) * (transaction.unitCost || 0);
        supplierPerformance[supplierName].transactions++;
      });

      return Object.entries(supplierPerformance)
        .map(([supplier, data]) => ({ supplier, ...data }))
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error getting supplier performance:", error);
      return [];
    }
  }

  async _getHighValueTransactions(days) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await inventoryTransactionDAO.getByDateRange(
        { startDate, endDate: new Date() },
        {},
        { limit: 100, sort: { createdAt: -1 } }
      );

      const docs = transactions.documents || transactions;

      return docs
        .filter((t) => {
          const value = Math.abs(t.quantity) * (t.unitCost || 0);
          return value > 1000; // Transactions over $1000
        })
        .slice(0, 10);
    } catch (error) {
      console.error("Error getting high value transactions:", error);
      return [];
    }
  }

  async _getExpiringSoonProducts(days) {
    try {
      const products = await productDAO.findAll({ status: "active" });
      const currentDate = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(currentDate.getDate() + days);

      return products
        .filter((product) => {
          if (!product.expiryDate) return false;
          const expiryDate = new Date(product.expiryDate);
          const daysUntilExpiry = Math.ceil(
            (expiryDate - currentDate) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry <= days && daysUntilExpiry > 0) {
            product.daysUntilExpiry = daysUntilExpiry;
            return true;
          }
          return false;
        })
        .slice(0, 20);
    } catch (error) {
      console.error("Error getting expiring products:", error);
      return [];
    }
  }

  async _getSupplierStatistics(days) {
    try {
      const suppliers = await supplierDAO.findAll({ status: "active" });
      const totalSuppliers = suppliers.length;
      const averageRating =
        suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / totalSuppliers;
      const totalCreditLimit = suppliers.reduce(
        (sum, s) => sum + (s.creditLimit || 0),
        0
      );

      return {
        total: totalSuppliers,
        averageRating: Math.round(averageRating * 100) / 100,
        totalCreditLimit: Math.round(totalCreditLimit * 100) / 100,
        topRated: suppliers.filter((s) => s.rating >= 4).length,
        newThisPeriod: suppliers.filter((s) => {
          const createdDate = new Date(s.createdAt);
          const thresholdDate = new Date();
          thresholdDate.setDate(thresholdDate.getDate() - days);
          return createdDate > thresholdDate;
        }).length,
      };
    } catch (error) {
      console.error("Error getting supplier statistics:", error);
      return {
        total: 0,
        averageRating: 0,
        totalCreditLimit: 0,
        topRated: 0,
        newThisPeriod: 0,
      };
    }
  }

  async _getDeliveryPerformance(days) {
    // Placeholder for delivery performance analysis
    // This would typically integrate with shipping/logistics data
    return {
      onTimeDeliveries: 85,
      averageDeliveryTime: "3.2 days",
      totalDeliveries: 124,
      performanceScore: 4.2,
    };
  }

  async _getPaymentTermsAnalysis() {
    try {
      const suppliers = await supplierDAO.findAll({ status: "active" });
      const termsBreakdown = {};

      suppliers.forEach((supplier) => {
        const terms = supplier.paymentTerms || "Not specified";
        termsBreakdown[terms] = (termsBreakdown[terms] || 0) + 1;
      });

      return Object.entries(termsBreakdown).map(([terms, count]) => ({
        terms,
        count,
        percentage: Math.round((count / suppliers.length) * 100),
      }));
    } catch (error) {
      console.error("Error getting payment terms analysis:", error);
      return [];
    }
  }

  async _getInventoryTrend(days, granularity) {
    try {
      // This would track inventory levels over time
      // For now, return placeholder data
      const trend = [];
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        trend.push({
          date: date.toISOString().substring(0, 10),
          totalValue: Math.random() * 100000 + 50000, // Placeholder
          totalItems: Math.floor(Math.random() * 1000 + 500), // Placeholder
        });
      }
      return trend;
    } catch (error) {
      console.error("Error getting inventory trend:", error);
      return [];
    }
  }

  async _getSupplierTrend(days, granularity) {
    try {
      const suppliers = await supplierDAO.findAll({ status: "active" });

      // Group suppliers by creation date
      const trend = {};
      suppliers.forEach((supplier) => {
        let dateKey;
        const date = new Date(supplier.createdAt);

        switch (granularity) {
          case "day":
            dateKey = date.toISOString().substring(0, 10);
            break;
          case "week":
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = weekStart.toISOString().substring(0, 10);
            break;
          case "month":
            dateKey = date.toISOString().substring(0, 7);
            break;
          default:
            dateKey = date.toISOString().substring(0, 10);
        }

        trend[dateKey] = (trend[dateKey] || 0) + 1;
      });

      return Object.entries(trend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("Error getting supplier trend:", error);
      return [];
    }
  }
}

module.exports = new DashboardController();
