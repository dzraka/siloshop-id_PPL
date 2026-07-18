/**
 * UT-11: test_cartSlice_removeFromCart_and_deleteItem
 * File target: lib/features/cart/cartSlice.js
 * Yang diuji:
 *   - removeFromCart: kurangi quantity item (hapus jika quantity jadi 0)
 *   - deleteItemFromCart: hapus item sepenuhnya dari cart
 */

// Import reducer dan actions dari cartSlice
const cartReducer = require("../../lib/features/cart/cartSlice").default;
const { removeFromCart, deleteItemFromCart } = require("../../lib/features/cart/cartSlice");

// ─── State awal untuk semua test ─────────────────────────────────────────────
const initialStateWithItems = {
  cartItems: {
    "prod-1": 3,
    "prod-2": 1,
  },
  total: 4, // total quantity semua item (3 + 1)
};

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("UT-11 | cartSlice - removeFromCart & deleteItemFromCart", () => {
  // ── removeFromCart ──────────────────────────────────────────────────────────

  test("removeFromCart: harus mengurangi quantity item sebesar 1", () => {
    const state = cartReducer(initialStateWithItems, removeFromCart({ productId: "prod-1" }));

    expect(state.cartItems["prod-1"]).toBe(2);
  });

  test("removeFromCart: harus menghapus item jika quantity menjadi 0", () => {
    const state = cartReducer(initialStateWithItems, removeFromCart({ productId: "prod-2" }));

    expect(state.cartItems["prod-2"]).toBeUndefined();
  });

  test("removeFromCart: total harus berkurang jika item dihapus karena quantity 0", () => {
    const state = cartReducer(initialStateWithItems, removeFromCart({ productId: "prod-2" }));

    expect(state.total).toBe(3);
  });

  test("removeFromCart: total TIDAK berubah jika hanya mengurangi quantity (item masih ada)", () => {
    const state = cartReducer(initialStateWithItems, removeFromCart({ productId: "prod-1" }));

    expect(state.total).toBe(3);
  });

  // ── deleteItemFromCart ──────────────────────────────────────────────────────

  test("deleteItemFromCart: harus menghapus item sepenuhnya meskipun quantity masih banyak", () => {
    const state = cartReducer(initialStateWithItems, deleteItemFromCart({ productId: "prod-1" }));

    expect(state.cartItems["prod-1"]).toBeUndefined();
  });

  test("deleteItemFromCart: total harus berkurang setelah item dihapus", () => {
    const state = cartReducer(initialStateWithItems, deleteItemFromCart({ productId: "prod-1" }));

    expect(state.total).toBe(1);
  });

  test("deleteItemFromCart: item lain tidak ikut terhapus", () => {
    const state = cartReducer(initialStateWithItems, deleteItemFromCart({ productId: "prod-1" }));

    expect(state.cartItems["prod-2"]).toBe(1);
  });
});
