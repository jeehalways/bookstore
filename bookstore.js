// Sample book database
const bookDatabase = [
  {
    id: 1,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    price: 12.99,
    stock: 5,
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    price: 14.99,
    stock: 3,
  },
  { id: 3, title: "1984", author: "George Orwell", price: 13.99, stock: 0 },
  {
    id: 4,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    price: 11.99,
    stock: 7,
  },
  {
    id: 5,
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    price: 12.49,
    stock: 4,
  },
  {
    id: 6,
    title: "Brave New World",
    author: "Aldous Huxley",
    price: 13.49,
    stock: 2,
  },
];

// Shopping cart storage
let shoppingCart = {};

/**
 * Searches for books matching the query
 * @param {string} query - Search term
 * @returns {Array} Array of matching book objects
 */
const searchBooks = (query) => {
  if (!query || typeof query !== "string") {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return bookDatabase.filter(
    (book) =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Adds a book to the shopping cart
 * @param {number} bookId - ID of the book to add
 * @param {number} quantity - Quantity to add
 * @returns {Object} Updated cart object
 */
const addToCart = (bookId, quantity) => {
  const book = bookDatabase.find((b) => b.id === bookId);

  if (!book) {
    throw new Error(`Book with ID ${bookId} not found`);
  }

  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  // Calculate total quantity that would be in cart
  const currentQuantity = shoppingCart[bookId]
    ? shoppingCart[bookId].quantity
    : 0;
  const totalQuantity = currentQuantity + quantity;

  if (totalQuantity > book.stock) {
    throw new Error(`Only ${book.stock} copies available`);
  }

  if (shoppingCart[bookId]) {
    shoppingCart[bookId].quantity += quantity;
  } else {
    shoppingCart[bookId] = {
      book: { ...book },
      quantity: quantity,
    };
  }

  // Return a deep copy to prevent external mutations
  return JSON.parse(JSON.stringify(shoppingCart));
};

/**
 * Calculates total price with 10% tax
 * @param {Object} cart - Shopping cart object
 * @returns {number} Total price with tax
 */
const calculateTotal = (cart) => {
  if (!cart || typeof cart !== "object") {
    return 0;
  }

  let subtotal = 0;

  for (const bookId in cart) {
    const item = cart[bookId];
    if (item && item.book && item.quantity) {
      subtotal += item.book.price * item.quantity;
    }
  }

  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return parseFloat(total.toFixed(2));
};

/**
 * Processes payment (simulated with random success/failure)
 * @param {number} cartTotal - Total amount to charge
 * @param {string} paymentMethod - Payment method (credit, debit, paypal)
 * @returns {Object} Payment result with success status and transaction ID
 */
const processPayment = (cartTotal, paymentMethod) => {
  if (cartTotal <= 0) {
    throw new Error("Invalid cart total");
  }

  const validMethods = ["credit", "debit", "paypal"];
  if (!validMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  // Simulate random payment success (80% success rate)
  // In tests, Math.random can be mocked for predictable results
  const success = Math.random() > 0.2;

  if (success) {
    return {
      success: true,
      transactionId: `TXN-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      transactionId: null,
    };
  }
};

/**
 * Updates inventory by reducing stock for items in cart
 * @param {Object} cart - Shopping cart object
 * @returns {Object} Updated inventory status
 */
const updateInventory = (cart) => {
  if (!cart || typeof cart !== "object") {
    throw new Error("Invalid cart object");
  }

  // First, validate all items have sufficient stock
  // Check stock again because time may have passed
  // since items were added to cart
  for (const bookId in cart) {
    const item = cart[bookId];
    const book = bookDatabase.find((b) => b.id === parseInt(bookId));

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found in inventory`);
    }

    if (book.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${book.title}". Available: ${book.stock}, Requested: ${item.quantity}`
      );
    }
  }

  // If validation passes, update the inventory
  const updates = {};
  for (const bookId in cart) {
    const item = cart[bookId];
    const book = bookDatabase.find((b) => b.id === parseInt(bookId));
    book.stock -= item.quantity;
    updates[bookId] = book.stock;
  }

  return updates;
};

/**
 * MAIN INTEGRATION FUNCTION
 * Completes entire purchase process
 * @param {string} searchQuery - Query to search for books
 * @param {number} bookId - ID of book to purchase
 * @param {number} quantity - Quantity to purchase
 * @param {string} paymentMethod - Payment method
 * @returns {Object} Order confirmation
 */
const completePurchase = (searchQuery, bookId, quantity, paymentMethod) => {
  // Store original cart state in case we need to rollback
  const originalCart = JSON.parse(JSON.stringify(shoppingCart));

  try {
    // Search for books
    const searchResults = searchBooks(searchQuery);
    if (searchResults.length === 0) {
      throw new Error("No books found matching your search");
    }

    // Add to cart
    shoppingCart = {}; // Reset cart for new purchase
    const cart = addToCart(bookId, quantity);

    // Calculate total
    const total = calculateTotal(cart);

    if (total <= 0) {
      throw new Error("Invalid cart total");
    }

    // Process payment
    const paymentResult = processPayment(total, paymentMethod);

    if (!paymentResult.success) {
      // Restore original cart state if payment fails
      shoppingCart = originalCart;
      throw new Error("Payment processing failed. Please try again.");
    }

    // 5. Update inventory (only if payment succeeds)
    // Re-validate stock before updating (double-check for race conditions)
    const inventoryUpdate = updateInventory(cart);

    // 6. Clear the cart after successful purchase
    shoppingCart = {};

    // 7. Return order confirmation
    return {
      success: true,
      orderId: `ORD-${Date.now()}`,
      transactionId: paymentResult.transactionId,
      items: cart,
      total: total,
      inventoryUpdated: inventoryUpdate,
      message: "Purchase completed successfully!",
    };
  } catch (error) {
    // Restore cart state on any error
    shoppingCart = originalCart;

    return {
      success: false,
      error: error.message,
      message: "Purchase failed",
    };
  }
};

// Helper function to reset cart (for testing)
const resetCart = () => {
  shoppingCart = {};
};

// Helper function to reset inventory (for testing)
const resetInventory = () => {
  bookDatabase[0].stock = 5;
  bookDatabase[1].stock = 3;
  bookDatabase[2].stock = 0;
  bookDatabase[3].stock = 7;
  bookDatabase[4].stock = 4;
  bookDatabase[5].stock = 2;
};

// Helper function to get current cart (useful for testing)
const getCart = () => {
  return JSON.parse(JSON.stringify(shoppingCart));
};


// Phase 4
// Coupon database
const couponDatabase = {
  SAVE10: { type: "percentage", value: 10, minPurchase: 0 },
  SAVE20: { type: "percentage", value: 20, minPurchase: 50 },
  FLAT5: { type: "fixed", value: 5, minPurchase: 20 },
  FREESHIP: { type: "free_shipping", value: 0, minPurchase: 0 },
};

// Shipping options
const shippingOptions = {
  standard: { name: "Standard Shipping", cost: 5.99, days: "5-7" },
  express: { name: "Express Shipping", cost: 12.99, days: "2-3" },
  overnight: { name: "Overnight Shipping", cost: 24.99, days: "1" },
  free: { name: "Free Shipping", cost: 0, days: "7-10" },
};

// Email notification log (simulated)
let emailLog = [];

/**
 * Validates and applies coupon code
 * @param {string} couponCode - Coupon code to apply
 * @param {number} subtotal - Subtotal before discount
 * @returns {Object} Discount information
 */
const applyCoupon = (couponCode, subtotal) => {
  if (!couponCode) {
    return { valid: false, discount: 0, message: "No coupon provided" };
  }

  const coupon = couponDatabase[couponCode.toUpperCase()];

  if (!coupon) {
    return { valid: false, discount: 0, message: "Invalid coupon code" };
  }

  if (subtotal < coupon.minPurchase) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum purchase of ${coupon.minPurchase} required`,
    };
  }

  let discount = 0;

  if (coupon.type === "percentage") {
    discount = parseFloat((subtotal * (coupon.value / 100)).toFixed(2));
  } else if (coupon.type === "fixed") {
    discount = coupon.value;
  }

  return {
    valid: true,
    discount: discount,
    type: coupon.type,
    freeShipping: coupon.type === "free_shipping",
    message: `Coupon applied successfully`,
  };
};

/**
 * Calculates total with discount, tax, and shipping
 * @param {Object} cart - Shopping cart
 * @param {string} couponCode - Optional coupon code
 * @param {string} shippingMethod - Shipping method
 * @returns {Object} Detailed price breakdown
 */
const calculateTotalWithExtras = (
  cart,
  couponCode = null,
  shippingMethod = "standard"
) => {
  if (!cart || typeof cart !== "object") {
    return { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 };
  }

  // Calculate subtotal
  let subtotal = 0;
  for (const bookId in cart) {
    const item = cart[bookId];
    if (item && item.book && item.quantity) {
      subtotal += item.book.price * item.quantity;
    }
  }
  subtotal = parseFloat(subtotal.toFixed(2));

  // Apply coupon
  const couponResult = applyCoupon(couponCode, subtotal);
  const discount = couponResult.valid ? couponResult.discount : 0;

  // Calculate after discount
  const afterDiscount = subtotal - discount;

  // Calculate tax (10% on discounted price)
  const tax = parseFloat((afterDiscount * 0.1).toFixed(2));

  // Get shipping cost
  const shipping = shippingOptions[shippingMethod] || shippingOptions.standard;
  const shippingCost = couponResult.freeShipping ? 0 : shipping.cost;

  // Calculate final total
  const total = parseFloat((afterDiscount + tax + shippingCost).toFixed(2));

  return {
    subtotal,
    discount,
    tax,
    shipping: shippingCost,
    shippingMethod: shipping.name,
    total,
    couponApplied: couponResult.valid,
    couponMessage: couponResult.message,
  };
};

/**
 * Sends email notification (simulated)
 * @param {string} recipient - Email recipient
 * @param {string} subject - Email subject
 * @param {Object} orderDetails - Order information
 * @returns {Object} Email status
 */
const sendEmailNotification = (recipient, subject, orderDetails) => {
  if (!recipient || !recipient.includes("@")) {
    return { sent: false, error: "Invalid email address" };
  }

  const email = {
    id: `EMAIL-${Date.now()}`,
    to: recipient,
    subject: subject,
    orderDetails: orderDetails,
    timestamp: new Date().toISOString(),
    status: "sent",
  };

  emailLog.push(email);

  return {
    sent: true,
    emailId: email.id,
    message: `Email sent to ${recipient}`,
  };
};

/**
 * ENHANCED PURCHASE FUNCTION with advanced features
 * @param {string} searchQuery - Search query
 * @param {number} bookId - Book ID to purchase
 * @param {number} quantity - Quantity
 * @param {string} paymentMethod - Payment method
 * @param {Object} options - Additional options (coupon, shipping, email)
 * @returns {Object} Order confirmation with all details
 */
const completePurchaseWithExtras = (
  searchQuery,
  bookId,
  quantity,
  paymentMethod,
  options = {}
) => {
  const {
    couponCode = null,
    shippingMethod = "standard",
    customerEmail = null,
  } = options;
  const originalCart = JSON.parse(JSON.stringify(shoppingCart));

  try {
    // 1. Search for books
    const searchResults = searchBooks(searchQuery);
    if (searchResults.length === 0) {
      throw new Error("No books found matching your search");
    }

    // 2. Add to cart
    shoppingCart = {};
    const cart = addToCart(bookId, quantity);

    // 3. Calculate total with extras
    const pricing = calculateTotalWithExtras(cart, couponCode, shippingMethod);

    if (pricing.total <= 0) {
      throw new Error("Invalid cart total");
    }

    // 4. Process payment
    const paymentResult = processPayment(pricing.total, paymentMethod);

    if (!paymentResult.success) {
      shoppingCart = originalCart;
      throw new Error("Payment processing failed. Please try again.");
    }

    // 5. Update inventory
    const inventoryUpdate = updateInventory(cart);

    // 6. Send email notification if provided
    let emailResult = null;
    if (customerEmail) {
      emailResult = sendEmailNotification(customerEmail, "Order Confirmation", {
        orderId: `ORD-${Date.now()}`,
        items: cart,
        pricing: pricing,
        transactionId: paymentResult.transactionId,
      });
    }

    // 7. Clear cart
    shoppingCart = {};

    // 8. Return comprehensive order confirmation
    return {
      success: true,
      orderId: `ORD-${Date.now()}`,
      transactionId: paymentResult.transactionId,
      items: cart,
      pricing: pricing,
      inventoryUpdated: inventoryUpdate,
      emailSent: emailResult ? emailResult.sent : false,
      emailId: emailResult ? emailResult.emailId : null,
      message: "Purchase completed successfully!",
    };
  } catch (error) {
    shoppingCart = originalCart;
    return {
      success: false,
      error: error.message,
      message: "Purchase failed",
    };
  }
};

// Helper to clear email log (for testing)
const clearEmailLog = () => {
  emailLog = [];
};

// Helper to get email log (for testing)
const getEmailLog = () => {
  return [...emailLog];
};

export {
  searchBooks,
  addToCart,
  calculateTotal,
  processPayment,
  updateInventory,
  completePurchase,
  resetCart,
  resetInventory,
  getCart,
  bookDatabase,
  // Phase 4 exports
  applyCoupon,
  calculateTotalWithExtras,
  sendEmailNotification,
  completePurchaseWithExtras,
  clearEmailLog,
  getEmailLog,
  couponDatabase,
  shippingOptions,
};
