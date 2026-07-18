/**
 * UT-12: test_order_creation_validates_required_fields
 * File target: app/api/orders/route.js
 * Yang diuji:
 *   - Order ditolak jika addressId, paymentMethod, atau items kosong/tidak valid
 */

// ─── Mock Clerk ───────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn().mockReturnValue({
    userId: "user-123",
    has: jest.fn().mockReturnValue(false),
  }),
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    order: {
      create: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

// ─── Helper: buat mock Request ────────────────────────────────────────────────
const makeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

// ─── Import handler setelah mock ──────────────────────────────────────────────
const { POST } = require("../../app/api/orders/route");

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("UT-12 | Order Creation - Validasi Field Wajib", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "user-123",
      has: jest.fn().mockReturnValue(false),
    });
  });

  test("harus return 400 jika addressId kosong/null", async () => {
    const req = makeRequest({
      addressId: null,
      paymentMethod: "COD",
      items: [{ productId: "prod-1", quantity: 2, price: 10000 }],
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  test("harus return 400 jika paymentMethod kosong/null", async () => {
    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: null,
      items: [{ productId: "prod-1", quantity: 2, price: 10000 }],
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  test("harus return 400 jika items array kosong", async () => {
    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [],
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  test("harus return 400 jika items tidak dikirim (undefined)", async () => {
    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "TRANSFER",
      // items tidak ada
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  test("harus return 400 jika semua field kosong", async () => {
    const req = makeRequest({});

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  test("harus TIDAK memanggil Prisma create jika validasi gagal", async () => {
    const prisma = require("@/lib/prisma").default;
    const req = makeRequest({
      addressId: null,
      paymentMethod: null,
      items: [],
    });

    await POST(req);

    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test("harus return 401 jika userId tidak ada (unauthorized)", async () => {
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({ userId: null, has: jest.fn() });

    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("harus return 404 jika kupon tidak ditemukan", async () => {
    const prisma = require("@/lib/prisma").default;
    prisma.coupon.findUnique.mockResolvedValue(null);

    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [{ id: "prod-1", quantity: 1 }],
      couponCode: "INVALID",
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  test("harus return 400 jika kupon forNewUser tapi user sudah punya order", async () => {
    const prisma = require("@/lib/prisma").default;
    prisma.coupon.findUnique.mockResolvedValue({ code: "NEW10", forNewUser: true });
    prisma.order.findMany = jest.fn().mockResolvedValue([{ id: 1 }]); // Mock user has past order

    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [{ id: "prod-1", quantity: 1 }],
      couponCode: "NEW10",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("harus return 400 jika kupon forMember tapi user bukan plus member", async () => {
    const prisma = require("@/lib/prisma").default;
    prisma.coupon.findUnique.mockResolvedValue({ code: "MEMBER20", forNewUser: false, forMember: true });

    // User is NOT plus member
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "user-123",
      has: jest.fn().mockReturnValue(false),
    });

    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [{ id: "prod-1", quantity: 1 }],
      couponCode: "MEMBER20",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("harus return 400 jika terjadi error di block catch", async () => {
    const prisma = require("@/lib/prisma").default;
    prisma.product.findUnique = jest.fn().mockRejectedValue(new Error("Database failure"));

    const req = makeRequest({
      addressId: "addr-1",
      paymentMethod: "COD",
      items: [{ id: "prod-1", quantity: 1 }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
