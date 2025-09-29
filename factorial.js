/**
 * Calculates the factorial of a given non-negative integer
 * @param {number} n - The non-negative integer to calculate factorial for
 * @returns {number} The factorial of n
 * @throws {Error} Throws error for negative numbers or non-integer values
 * @example
 * factorial(5); // returns 120
 * factorial(0); // returns 1
 */
function factorial(n) {
  // Input validation
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

  // Base cases
  if (n === 0 || n === 1) {
    return 1;
  }

  // Use iterative approach for better performance and to avoid stack overflow
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

/**
 * Memoized factorial function for improved performance with repeated calculations
 * @returns {Function} Memoized factorial function
 */
const factorialMemoized = (() => {
  const cache = new Map([
    [0, 1],
    [1, 1],
  ]);

  return function (n) {
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

    if (cache.has(n)) {
      return cache.get(n);
    }

    let result = 1;
    let start = 1;

    // Find the highest cached value less than n
    for (let i = n; i >= 0; i--) {
      if (cache.has(i)) {
        result = cache.get(i);
        start = i + 1;
        break;
      }
    }

    // Calculate from the cached point
    for (let i = start; i <= n; i++) {
      result *= i;
      cache.set(i, result);
    }

    return result;
  };
})();

/**
 * Alternative recursive implementation (kept for reference)
 * Note: Less efficient for large numbers due to call stack overhead
 * @param {number} n - The non-negative integer
 * @returns {number} The factorial of n
 */
function factorialRecursive(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Invalid input: must be a non-negative integer");
  }

  if (n === 0 || n === 1) {
    return 1;
  }

  return n * factorialRecursive(n - 1);
}
