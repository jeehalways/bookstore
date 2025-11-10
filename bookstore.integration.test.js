import {
  searchBooks,
  addToCart,
  calculateTotal,
  processPayment,
  updateInventory,
  completePurchase,
  resetCart,
  resetInventory,
  bookDatabase,
} from "./bookstore.js";

describe("Bookstore Integration Tests", () => {
  // Reset state before each test
  beforeEach(() => {
    resetCart();
    resetInventory();
  });

  describe("Individual Function Tests", () => {
    test("searchBooks should find books by title", () => {
      const results = searchBooks("gatsby");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Gatsby");
    });

    test("searchBooks should find books by author", () => {
      const results = searchBooks("Orwell");
      expect(results.length).toBe(1);
      expect(results[0].author).toBe("George Orwell");
    });

    test("addToCart should add book successfully", () => {
      const cart = addToCart(1, 2);
      expect(cart[1]).toBeDefined();
      expect(cart[1].quantity).toBe(2);
    });

    test("calculateTotal should include 10% tax", () => {
      addToCart(1, 1); // 12.99
      const cart = addToCart(2, 1); // 14.99, total = 27.98
      const total = calculateTotal(cart);
      // 27.98 + 10% = 30.78
      expect(total).toBe(30.78);
    });
  });

  describe("Successful Purchase Flow", () => {
    test("should complete entire purchase process successfully", () => {
      // Mock Math.random to ensure payment success
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5); // Will succeed (> 0.2)

      const result = completePurchase("Gatsby", 1, 2, "credit");

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.items[1].quantity).toBe(2);

      // Verify inventory was updated
      const book = bookDatabase.find((b) => b.id === 1);
      expect(book.stock).toBe(3); // Started at 5, bought 2

      Math.random = originalRandom;
    });

    test("should handle multiple books in cart", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      resetCart();

      // Add multiple books manually
      addToCart(1, 1); // 12.99
      const cart = addToCart(4, 2); // 11.99 x 2 = 23.98

      const total = calculateTotal(cart);
      // 36.97 + 10% = 40.67
      expect(total).toBe(40.67);

      const paymentResult = processPayment(total, "debit");
      expect(paymentResult.success).toBe(true);

      const inventoryUpdate = updateInventory(cart);
      expect(inventoryUpdate[1]).toBe(4); // 5 - 1
      expect(inventoryUpdate[4]).toBe(5); // 7 - 2

      Math.random = originalRandom;
    });

    test("should calculate correct total for single expensive book", () => {
      const cart = addToCart(2, 1); // 14.99
      const total = calculateTotal(cart);
      // 14.99 + 10% = 16.49
      expect(total).toBe(16.49);
    });

    test("should generate unique transaction IDs", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const result1 = processPayment(10, "credit");
      const result2 = processPayment(10, "credit");

      expect(result1.transactionId).not.toBe(result2.transactionId);

      Math.random = originalRandom;
    });
  });

  describe("Error Handling", () => {
    test("should fail when book is out of stock", () => {
      // Book ID 3 (1984) has 0 stock
      expect(() => {
        addToCart(3, 1);
      }).toThrow("Only 0 copies available");
    });

    test("should fail when requesting more than available stock", () => {
      // Book ID 6 has only 2 in stock
      expect(() => {
        addToCart(6, 5);
      }).toThrow("Only 2 copies available");
    });

    test("should handle payment failure gracefully", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Will fail (< 0.2)

      const result = completePurchase("Gatsby", 1, 1, "credit");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment processing failed");

      Math.random = originalRandom;
    });

    test("should not update inventory if payment fails", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Payment will fail

      const initialStock = bookDatabase.find((b) => b.id === 1).stock;

      const result = completePurchase("Gatsby", 1, 2, "credit");

      expect(result.success).toBe(false);

      // Verify inventory was NOT updated
      const finalStock = bookDatabase.find((b) => b.id === 1).stock;
      expect(finalStock).toBe(initialStock);

      Math.random = originalRandom;
    });

    test("should handle invalid payment method", () => {
      expect(() => {
        processPayment(10, "bitcoin");
      }).toThrow("Invalid payment method");
    });

    test("should handle invalid book ID", () => {
      expect(() => {
        addToCart(999, 1);
      }).toThrow("Book with ID 999 not found");
    });

    test("should handle negative quantity", () => {
      expect(() => {
        addToCart(1, -1);
      }).toThrow("Quantity must be greater than 0");
    });

    test("should fail if book not found in search", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const result = completePurchase("NonexistentBook12345", 1, 1, "credit");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No books found");

      Math.random = originalRandom;
    });
  });

  describe("Data Flow and Integration Points", () => {
    test("should maintain data integrity through entire flow", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      // Search
      const searchResults = searchBooks("Pride");
      expect(searchResults.length).toBeGreaterThan(0);

      // Get the book ID from search
      const bookId = searchResults[0].id;
      const bookPrice = searchResults[0].price;
      const initialStock = searchResults[0].stock;

      // Add to cart
      resetCart();
      const cart = addToCart(bookId, 1);
      expect(cart[bookId].book.price).toBe(bookPrice);

      // Calculate total
      const total = calculateTotal(cart);
      const expectedTotal = parseFloat((bookPrice * 1.1).toFixed(2));
      expect(total).toBe(expectedTotal);

      // Process payment
      const payment = processPayment(total, "paypal");
      expect(payment.success).toBe(true);

      // Update inventory
      const inventoryUpdate = updateInventory(cart);
      expect(inventoryUpdate[bookId]).toBe(initialStock - 1);

      Math.random = originalRandom;
    });

    test("should handle edge case: buying all remaining stock", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      // Book 6 has 2 in stock
      const result = completePurchase("Brave", 6, 2, "credit");

      expect(result.success).toBe(true);

      const book = bookDatabase.find((b) => b.id === 6);
      expect(book.stock).toBe(0);

      Math.random = originalRandom;
    });

    test("should prevent double purchase if inventory check happens after stock depletes", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      // Buy 2 copies (leaving 0)
      completePurchase("Brave", 6, 2, "credit");

      // Try to buy more - should fail
      expect(() => {
        addToCart(6, 1);
      }).toThrow("Only 0 copies available");

      Math.random = originalRandom;
    });
  });

  describe("Business Logic Validation", () => {
    test("should apply tax correctly across different price points", () => {
      resetCart();
      addToCart(1, 1); // 12.99
      addToCart(2, 1); // 14.99
      const cart = addToCart(5, 1); // 12.49

      const total = calculateTotal(cart);
      // 40.47 + 10% = 44.52
      expect(total).toBe(44.52);
    });

    test("should handle quantity accumulation in cart", () => {
      addToCart(1, 2);
      const cart = addToCart(1, 1); // Adding more of same book

      expect(cart[1].quantity).toBe(3);
    });
  });
});
