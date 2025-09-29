/**
 * CORS Testing Utility
 * Simple utility to test CORS configuration
 */

const axios = require("axios");

class CorsTestUtil {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Test CORS with different origins
   * @param {array} origins - Array of origins to test
   * @param {string} endpoint - API endpoint to test (default: /api/health)
   */
  async testOrigins(origins = [], endpoint = "/api/health") {
    console.log("🧪 Testing CORS Configuration\n");
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Endpoint: ${endpoint}\n`);

    const results = [];

    for (const origin of origins) {
      try {
        console.log(`Testing origin: ${origin}`);

        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
          },
        });

        console.log(`✅ Success: ${response.status}`);
        console.log(
          `   Access-Control-Allow-Origin: ${response.headers["access-control-allow-origin"]}`
        );
        console.log(
          `   Access-Control-Allow-Credentials: ${response.headers["access-control-allow-credentials"]}\n`
        );

        results.push({
          origin,
          success: true,
          status: response.status,
          headers: response.headers,
        });
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.status || "Network Error"}`);
        console.log(`   Error: ${error.message}\n`);

        results.push({
          origin,
          success: false,
          error: error.message,
          status: error.response?.status,
        });
      }
    }

    return results;
  }

  /**
   * Test preflight request (OPTIONS)
   * @param {string} origin - Origin to test
   * @param {string} endpoint - API endpoint to test
   * @param {string} method - HTTP method to test
   */
  async testPreflight(origin, endpoint = "/api/products", method = "POST") {
    console.log("🚀 Testing CORS Preflight Request\n");
    console.log(`Origin: ${origin}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Method: ${method}\n`);

    try {
      const response = await axios.options(`${this.baseUrl}${endpoint}`, {
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": method,
          "Access-Control-Request-Headers": "Content-Type",
        },
      });

      console.log(`✅ Preflight Success: ${response.status}`);
      console.log(
        `   Access-Control-Allow-Origin: ${response.headers["access-control-allow-origin"]}`
      );
      console.log(
        `   Access-Control-Allow-Methods: ${response.headers["access-control-allow-methods"]}`
      );
      console.log(
        `   Access-Control-Allow-Headers: ${response.headers["access-control-allow-headers"]}`
      );
      console.log(
        `   Access-Control-Max-Age: ${response.headers["access-control-max-age"]}\n`
      );

      return {
        success: true,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.log(
        `❌ Preflight Failed: ${error.response?.status || "Network Error"}`
      );
      console.log(`   Error: ${error.message}\n`);

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  /**
   * Get CORS debug information from the server
   */
  async getDebugInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/cors-debug`);
      console.log("🔍 CORS Debug Information:");
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log("❌ Could not get debug info:", error.message);
      return null;
    }
  }
}

// Example usage
if (require.main === module) {
  const corsTest = new CorsTestUtil();

  const testOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://example.com",
    "https://malicious-site.com",
  ];

  async function runTests() {
    console.log("🎯 Starting CORS Tests\n");

    // Test debug endpoint first
    await corsTest.getDebugInfo();
    console.log("\n" + "=".repeat(50) + "\n");

    // Test different origins
    await corsTest.testOrigins(testOrigins);
    console.log("=".repeat(50) + "\n");

    // Test preflight
    await corsTest.testPreflight("http://localhost:3000");

    console.log("✨ CORS Testing Complete!");
  }

  runTests().catch(console.error);
}

module.exports = CorsTestUtil;
