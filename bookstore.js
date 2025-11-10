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

  if (quantity > book.stock) {
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

  return { ...shoppingCart };
};

/**
 * Calculates total price with 10% tax
 * @param {Object} cart - Shopping cart object
 * @returns {number} Total price with tax
 */
const calculateTotal = (cart) => {
  let subtotal = 0;

  for (const bookId in cart) {
    const item = cart[bookId];
    subtotal += item.book.price * item.quantity;
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
  // First, validate all items have sufficient stock
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
  try {
    // 1. Search for books
    const searchResults = searchBooks(searchQuery);
    if (searchResults.length === 0) {
      throw new Error("No books found matching your search");
    }

    // 2. Add to cart
    shoppingCart = {}; // Reset cart for new purchase
    const cart = addToCart(bookId, quantity);

    // 3. Calculate total
    const total = calculateTotal(cart);

    // 4. Process payment
    const paymentResult = processPayment(total, paymentMethod);

    if (!paymentResult.success) {
      throw new Error("Payment processing failed. Please try again.");
    }

    // 5. Update inventory (only if payment succeeds)
    const inventoryUpdate = updateInventory(cart);

    // 6. Return order confirmation
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

export {
  searchBooks,
  addToCart,
  calculateTotal,
  processPayment,
  updateInventory,
  completePurchase,
  resetCart,
  resetInventory,
  bookDatabase,
};
