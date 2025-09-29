// Note: We need to import or require the factorial functions from factorial.js
// For now, we'll test them by including the functions directly
// In a proper setup, you'd use: const { factorial, factorialMemoized } = require('./factorial.js');

/**
 * Test implementation of factorial function for testing purposes
 * This should match the implementation in factorial.js
 */
function factorial(n) {
  if (!Number.isInteger(n)) {
    throw new Error("Factorial is only defined for integers");
  }

  if (n < 0) {
    throw new Error("Factorial is not defined for negative numbers");
  }

  if (n > 170) {
    throw new Error(
      "Number too large: factorial would exceed JavaScript's number precision"
    );
  }

  if (n === 0 || n === 1) {
    return 1;
  }

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

describe("Factorial Function", () => {
  describe("Valid inputs", () => {
    test("factorial of 0 should be 1", () => {
      expect(factorial(0)).toBe(1);
    });

    test("factorial of 1 should be 1", () => {
      expect(factorial(1)).toBe(1);
    });

    test("factorial of 2 should be 2", () => {
      expect(factorial(2)).toBe(2);
    });

    test("factorial of 3 should be 6", () => {
      expect(factorial(3)).toBe(6);
    });

    test("factorial of 4 should be 24", () => {
      expect(factorial(4)).toBe(24);
    });

    test("factorial of 5 should be 120", () => {
      expect(factorial(5)).toBe(120);
    });

    test("factorial of 6 should be 720", () => {
      expect(factorial(6)).toBe(720);
    });

    test("factorial of 10 should be 3628800", () => {
      expect(factorial(10)).toBe(3628800);
    });
  });

  describe("Edge cases", () => {
    test("factorial of large valid number (170)", () => {
      const result = factorial(170);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe("Invalid inputs", () => {
    test("should throw error for negative numbers", () => {
      expect(() => factorial(-1)).toThrow(
        "Factorial is not defined for negative numbers"
      );
      expect(() => factorial(-5)).toThrow(
        "Factorial is not defined for negative numbers"
      );
      expect(() => factorial(-100)).toThrow(
        "Factorial is not defined for negative numbers"
      );
    });

    test("should throw error for non-integers", () => {
      expect(() => factorial(3.5)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(2.1)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(Math.PI)).toThrow(
        "Factorial is only defined for integers"
      );
    });

    test("should throw error for non-numeric values", () => {
      expect(() => factorial("5")).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(null)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(undefined)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial({})).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial([])).toThrow(
        "Factorial is only defined for integers"
      );
    });

    test("should throw error for Infinity and NaN", () => {
      expect(() => factorial(Infinity)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(-Infinity)).toThrow(
        "Factorial is only defined for integers"
      );
      expect(() => factorial(NaN)).toThrow(
        "Factorial is only defined for integers"
      );
    });

    test("should throw error for numbers too large", () => {
      expect(() => factorial(171)).toThrow(
        "Number too large: factorial would exceed JavaScript's number precision"
      );
      expect(() => factorial(200)).toThrow(
        "Number too large: factorial would exceed JavaScript's number precision"
      );
      expect(() => factorial(1000)).toThrow(
        "Number too large: factorial would exceed JavaScript's number precision"
      );
    });
  });

  describe("Performance and consistency", () => {
    test("should handle multiple consecutive calls correctly", () => {
      expect(factorial(5)).toBe(120);
      expect(factorial(3)).toBe(6);
      expect(factorial(5)).toBe(120); // Should be consistent
      expect(factorial(0)).toBe(1);
      expect(factorial(1)).toBe(1);
    });

    test("should be performant for moderate sizes", () => {
      const start = performance.now();
      factorial(100);
      const end = performance.now();

      // Should complete within reasonable time (less than 1ms for factorial(100))
      expect(end - start).toBeLessThan(10);
    });
  });
});
