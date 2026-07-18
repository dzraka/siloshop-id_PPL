/**
 * IT-05: test_buyer_add_rating_after_order
 * Modul terlibat: orders POST → rating POST → Prisma
 * Yang diuji:
 *   - Alur: buyer buat order → order berhasil → buyer beri rating pada produk
 *   - Rating terhubung dengan userId, productId, orderId
 */

// ─── Mock Clerk ───────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn().mockReturnValue({
    userId: "buyer-123",
    has: jest.fn().mockReturnValue(false),
  }),
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockProductFindMany = jest.fn();
const mockProductFindUnique = jest.fn();
const mockCouponFindUnique = jest.fn();
const mockOrderCreate = jest.fn();
const mockOrderFindMany = jest.fn();
const mockOrderFindUnique = jest.fn();
const mockCartDeleteMany = jest.fn();
const mockUserUpdate = jest.fn();
const mockRatingFindFirst = jest.fn();
const mockRatingCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    product: {
      findMany: mockProductFindMany,
      findUnique: mockProductFindUnique,
    },
    coupon: {
      findUnique: mockCouponFindUnique,
    },
    order: {
      create: mockOrderCreate,
      findMany: mockOrderFindMany,
      findUnique: mockOrderFindUnique,
    },
    cart: { deleteMany: mockCartDeleteMany },
    user: { update: mockUserUpdate },
    rating: {
      findFirst: mockRatingFindFirst,
      create: mockRatingCreate,
    },
  },
}));

// ─── Helper ───────────────────────────────────────────────────────────────────
const makeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

// ─── Import handlers ──────────────────────────────────────────────────────────
const { POST: createOrder } = require("../../app/api/orders/route");
const { POST: createRating } = require("../../app/api/rating/route");

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("IT-05 | Buyer Add Rating After Order (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "buyer-123",
      has: jest.fn().mockReturnValue(false),
    });
  });

  test("Alur lengkap: order berhasil dibuat → rating berhasil disimpan", async () => {
    // ── Step 1: Setup mock untuk order ─────────────────────────────────────
    mockProductFindUnique.mockResolvedValue({
      id: "prod-1",
      price: 25000,
      storeId: "store-1",
    });

    mockOrderCreate.mockResolvedValue({
      id: "order-baru",
      userId: "buyer-123",
      total: 25000,
    });

    mockUserUpdate.mockResolvedValue({});

    // ── Step 2: Buyer membuat order ─────────────────────────────────────────
    const orderReq = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [{ id: "prod-1", quantity: 1, price: 25000 }],
    });

    const orderRes = await createOrder(orderReq);
    expect(orderRes.status).toBe(200);

    // ── Step 3: Setup mock untuk rating ────────────────────────────────────
    mockOrderFindUnique.mockResolvedValue({
      id: "order-baru",
      userId: "buyer-123",
    });

    mockRatingFindFirst.mockResolvedValue(null); // belum pernah rating

    mockRatingCreate.mockResolvedValue({
      id: "rating-1",
      userId: "buyer-123",
      productId: "prod-1",
      orderId: "order-baru",
      rating: 5,
      review: "Produk sangat memuaskan!",
    });

    // ── Step 4: Buyer memberi rating ────────────────────────────────────────
    const ratingReq = makeRequest({
      productId: "prod-1",
      orderId: "order-baru",
      rating: 5,
      review: "Produk sangat memuaskan!",
    });

    const ratingRes = await createRating(ratingReq);
    expect(ratingRes.status).toBe(200);

    // ── Step 5: Verifikasi rating tersimpan dengan relasi yang benar ────────
    expect(mockRatingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "buyer-123",
          productId: "prod-1",
          orderId: "order-baru",
        }),
      }),
    );
  });

  test("Rating tidak tersimpan jika order belum ada / orderId tidak valid", async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    const ratingReq = makeRequest({
      productId: "prod-1",
      orderId: "order-tidak-ada",
      rating: 4,
    });

    const ratingRes = await createRating(ratingReq);
    expect(ratingRes.status).toBe(404);
  });

  test("Rating kedua untuk order & produk yang sama harus ditolak (cegah duplikat)", async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: "order-baru",
      userId: "buyer-123",
    });

    // Simulasi: rating pertama sudah ada
    mockRatingFindFirst.mockResolvedValue({
      id: "rating-lama",
      userId: "buyer-123",
      productId: "prod-1",
      orderId: "order-baru",
    });

    const ratingReq = makeRequest({
      productId: "prod-1",
      orderId: "order-baru",
      rating: 3,
      review: "Mau ubah review",
    });

    const ratingRes = await createRating(ratingReq);
    expect(ratingRes.status).toBe(400);
    expect(mockRatingCreate).not.toHaveBeenCalled();
  });
});
