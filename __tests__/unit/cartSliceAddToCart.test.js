import cartReducer, { addToCart } from "../../lib/features/cart/cartSlice";

describe("Cart Slice - Add To Cart (Real Reducer)", () => {
  let initialState;

  beforeEach(() => {
    initialState = { cartItems: {}, total: 0 };
  });

  it("should add product that is not in cart yet (else branch)", () => {
    const action = addToCart({ productId: "prod-1" });
    const state = cartReducer(initialState, action);

    expect(state.cartItems["prod-1"]).toBe(1);
    expect(state.total).toBe(1);
  });

  it("should increment quantity if product is already in cart (if branch)", () => {
    const preExistingState = {
      cartItems: { "prod-1": 1 },
      total: 1,
    };

    const action = addToCart({ productId: "prod-1" });
    const state = cartReducer(preExistingState, action);

    expect(state.cartItems["prod-1"]).toBe(2);
    expect(state.total).toBe(2); // total quantity increments
  });
});
