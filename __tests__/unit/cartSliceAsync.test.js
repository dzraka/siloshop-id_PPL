/**
 * UT-19: test_cart_slice_async_and_clear
 * File target: lib/features/cart/cartSlice.js
 * Yang diuji:
 *   - clearCart (lines 81-82)
 *   - fetchCart extraReducers (lines 87-89)
 *   - fetchCart thunk logic (lines 33-42)
 *   - uploadCart thunk logic & debounce (lines 9-25)
 */

import reducer, { clearCart, uploadCart, fetchCart } from "../../lib/features/cart/cartSlice";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";

// Mock axios
jest.mock("axios");

describe("UT-19 | Cart Slice Async & Reducers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. clearCart Reducer ---
  test("clearCart harus mereset cartItems menjadi kosong dan total menjadi 0", () => {
    const store = configureStore({
      reducer: { cart: reducer },
      preloadedState: {
        cart: { total: 5, cartItems: { "prod-1": 2, "prod-2": 3 } },
      },
    });

    store.dispatch(clearCart());
    const state = store.getState().cart;

    expect(state.cartItems).toEqual({});
    expect(state.total).toBe(0);
  });

  // --- 2. fetchCart Async Thunk & Extra Reducers (Sukses) ---
  test("fetchCart thunk berhasil memanggil axios.get dan set cartItems otomatis", async () => {
    axios.get.mockResolvedValue({ data: { cart: { "item-1": 2, "item-2": 1 } } });

    const store = configureStore({ reducer: { cart: reducer } });
    const getToken = jest.fn().mockResolvedValue("mock-token-123");

    // Dispatch thunk seperti di aplikasi nyata
    await store.dispatch(fetchCart({ getToken }));

    expect(getToken).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledWith("/api/cart", {
      headers: { Authorization: "Bearer mock-token-123" },
    });

    // Verifikasi bahwa reducer 'fetchCart.fulfilled' otomatis menangani payload-nya
    const state = store.getState().cart;
    expect(state.cartItems).toEqual({ "item-1": 2, "item-2": 1 });
    expect(state.total).toBe(3);
  });

  // --- 3. fetchCart Async Thunk (Gagal) ---
  test("fetchCart thunk memanggil rejectWithValue ketika axios gagal", async () => {
    const mockError = { response: { data: { error: "Unauthenticated" } } };
    axios.get.mockRejectedValue(mockError);

    const store = configureStore({ reducer: { cart: reducer } });
    const getToken = jest.fn().mockResolvedValue("mock-token-123");

    const result = await store.dispatch(fetchCart({ getToken }));

    // Action harus me-return state ditolak (rejected)
    expect(result.type).toBe("cart/fetchCart/rejected");
    expect(result.payload).toEqual({ error: "Unauthenticated" });
  });

  // --- 4. uploadCart Async Thunk dengan setTimeout (Debounce) ---
  test("uploadCart thunk (debounce) memanggil axios.post", async () => {
    jest.useFakeTimers();
    axios.post.mockResolvedValue({ data: { success: true } });

    const store = configureStore({
      reducer: { cart: reducer },
      preloadedState: {
        cart: { total: 5, cartItems: { "item-2": 5 } },
      },
    });

    const getToken = jest.fn().mockResolvedValue("mock-token-abc");

    // Jalankan thunk (dia akan trigger setTimeout di dalam)
    store.dispatch(uploadCart({ getToken }));

    // Pastikan API belum dipanggil (karena ada debounce 1000ms)
    expect(axios.post).not.toHaveBeenCalled();

    // Fast-forward waktu sebanyak 1000ms
    await jest.advanceTimersByTimeAsync(1000);

    expect(getToken).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith("/api/cart", { cart: { "item-2": 5 } }, { headers: { Authorization: "Bearer mock-token-abc" } });

    jest.useRealTimers();
  });

  // --- 5. uploadCart Async Thunk (Gagal di catch block luar) ---
  test("uploadCart thunk memanggil rejectWithValue jika terjadi error di block terluar", async () => {
    jest.useFakeTimers();
    const mockError = { response: { data: { message: "Token Expired" } } };
    const getToken = jest.fn().mockRejectedValue(mockError);

    const store = configureStore({ reducer: { cart: reducer } });

    // Karena isi dari uploadCart berada di dalam setTimeout (yg lolos try-catch luar),
    // kita memicu error dari luar setTimeout yaitu lewat mock clearTimeout
    const originalClearTimeout = global.clearTimeout;
    global.clearTimeout = jest.fn(() => {
      throw mockError;
    });

    const result = await store.dispatch(uploadCart({ getToken }));

    expect(result.type).toBe("cart/uploadCart/rejected");
    expect(result.payload).toEqual({ message: "Token Expired" });

    global.clearTimeout = originalClearTimeout;
    jest.useRealTimers();
  });
});
