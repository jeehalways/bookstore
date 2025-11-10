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
  // Phase 4
  applyCoupon,
  calculateTotalWithExtras,
  sendEmailNotification,
  completePurchaseWithExtras,
  clearEmailLog,
  getEmailLog,
  couponDatabase,
  shippingOptions,
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
      // Mock to return different values each call
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        return 0.5 + callCount * 0.01; // Returns 0.51, 0.52, 0.53, etc.
      });

      const result1 = processPayment(10, "credit");

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() === start) {
        // Wait for timestamp to change
      }

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

  // Phase 4

  describe("Discount System - Coupon Codes", () => {
    beforeEach(() => {
      clearEmailLog();
    });

    test("should apply percentage discount correctly", () => {
      const subtotal = 100;
      const result = applyCoupon("SAVE10", subtotal);

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(10); // 10% of 100
    });

    test("should apply fixed discount correctly", () => {
      const subtotal = 30;
      const result = applyCoupon("FLAT5", subtotal);

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(5);
    });

    test("should reject coupon if minimum purchase not met", () => {
      const subtotal = 30; // SAVE20 requires 50 minimum
      const result = applyCoupon("SAVE20", subtotal);

      expect(result.valid).toBe(false);
      expect(result.discount).toBe(0);
      expect(result.message).toContain("Minimum purchase");
    });

    test("should reject invalid coupon code", () => {
      const result = applyCoupon("INVALID123", 100);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid coupon");
    });

    test("should handle free shipping coupon", () => {
      const result = applyCoupon("FREESHIP", 50);

      expect(result.valid).toBe(true);
      expect(result.freeShipping).toBe(true);
    });

    test("should integrate coupon with total calculation", () => {
      resetCart();
      const cart = addToCart(1, 1); // 12.99

      const pricing = calculateTotalWithExtras(cart, "SAVE10", "standard");

      // Subtotal: 12.99
      // Discount: 1.30 (10%)
      // After discount: 11.69
      // Tax: $1.17 (10%)
      // Shipping: 5.99
      // Total: 18.85
      expect(pricing.subtotal).toBe(12.99);
      expect(pricing.discount).toBe(1.3);
      expect(pricing.total).toBe(18.85);
    });
  });

  describe("Shipping Options Integration", () => {
    test("should calculate shipping cost for standard shipping", () => {
      resetCart();
      const cart = addToCart(1, 1); // $12.99

      const pricing = calculateTotalWithExtras(cart, null, "standard");

      expect(pricing.shipping).toBe(5.99);
      expect(pricing.shippingMethod).toBe("Standard Shipping");
    });

    test("should calculate shipping cost for express shipping", () => {
      resetCart();
      const cart = addToCart(1, 1);

      const pricing = calculateTotalWithExtras(cart, null, "express");

      expect(pricing.shipping).toBe(12.99);
      expect(pricing.shippingMethod).toBe("Express Shipping");
    });

    test("should apply free shipping with coupon", () => {
      resetCart();
      const cart = addToCart(1, 1);

      const pricing = calculateTotalWithExtras(cart, "FREESHIP", "express");

      expect(pricing.shipping).toBe(0);
      expect(pricing.couponApplied).toBe(true);
    });

    test("should default to standard shipping if invalid method", () => {
      resetCart();
      const cart = addToCart(1, 1);

      const pricing = calculateTotalWithExtras(cart, null, "invalid_method");

      expect(pricing.shipping).toBe(5.99);
    });
  });

  describe("Email Notification System", () => {
    beforeEach(() => {
      clearEmailLog();
    });

    test("should send email notification successfully", () => {
      const result = sendEmailNotification(
        "customer@example.com",
        "Order Confirmation",
        { orderId: "TEST123", total: 50 }
      );

      expect(result.sent).toBe(true);
      expect(result.emailId).toBeDefined();
      expect(result.message).toContain("customer@example.com");
    });

    test("should reject invalid email address", () => {
      const result = sendEmailNotification("invalid-email", "Test", {});

      expect(result.sent).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    test("should log emails in email log", () => {
      sendEmailNotification("test1@example.com", "Subject 1", {});
      sendEmailNotification("test2@example.com", "Subject 2", {});

      const log = getEmailLog();
      expect(log.length).toBe(2);
      expect(log[0].to).toBe("test1@example.com");
      expect(log[1].to).toBe("test2@example.com");
    });

    test("should include order details in email", () => {
      const orderDetails = {
        orderId: "ORD123",
        total: 99.99,
        items: { 1: { quantity: 2 } },
      };

      sendEmailNotification("customer@example.com", "Order", orderDetails);

      const log = getEmailLog();
      expect(log[0].orderDetails.orderId).toBe("ORD123");
      expect(log[0].orderDetails.total).toBe(99.99);
    });
  });

  describe("Complete Purchase with Advanced Features", () => {
    beforeEach(() => {
      clearEmailLog();
    });

    test("should complete purchase with coupon and email", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const result = completePurchaseWithExtras("Gatsby", 1, 1, "credit", {
        couponCode: "SAVE10",
        shippingMethod: "standard",
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.pricing.discount).toBeGreaterThan(0);
      expect(result.pricing.shipping).toBe(5.99);
      expect(result.emailSent).toBe(true);
      expect(result.emailId).toBeDefined();

      const log = getEmailLog();
      expect(log.length).toBe(1);

      Math.random = originalRandom;
    });

    test("should complete purchase without optional features", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const result = completePurchaseWithExtras("Gatsby", 1, 1, "credit");

      expect(result.success).toBe(true);
      expect(result.pricing.discount).toBe(0);
      expect(result.emailSent).toBe(false);

      Math.random = originalRandom;
    });

    test("should handle payment failure with advanced features", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Payment fails

      const result = completePurchaseWithExtras("Gatsby", 1, 1, "credit", {
        couponCode: "SAVE10",
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment processing failed");

      // Email should NOT be sent on payment failure
      const log = getEmailLog();
      expect(log.length).toBe(0);

      Math.random = originalRandom;
    });

    test("should calculate correct total with multiple discounts and shipping", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      resetCart();
      addToCart(1, 2); // 12.99 x 2 = 25.98
      const cart = addToCart(2, 1); // 14.99
      // Subtotal: 40.97

      const pricing = calculateTotalWithExtras(cart, "SAVE10", "express");

      // Discount: 4.10 (10%)
      // After discount: 36.87
      // Tax: $3.69 (10%)
      // Shipping: 12.99
      // Total: 53.55
      expect(pricing.discount).toBe(4.1);
      expect(pricing.total).toBe(53.55);

      Math.random = originalRandom;
    });

    test("should apply high-value coupon on large purchase", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      resetCart();
      addToCart(1, 3); // 12.99 x 3 = 38.97
      const cart = addToCart(2, 1); // 14.99
      // Subtotal: 53.96 (meets SAVE20 minimum of 50)

      const pricing = calculateTotalWithExtras(cart, "SAVE20", "standard");

      // Discount: 10.79 (20%)
      expect(pricing.discount).toBe(10.79);
      expect(pricing.couponApplied).toBe(true);

      Math.random = originalRandom;
    });

    test("should not send email if invalid email provided", () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const result = completePurchaseWithExtras("Gatsby", 1, 1, "credit", {
        customerEmail: "invalid-email",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);

      Math.random = originalRandom;
    });
  });
});
