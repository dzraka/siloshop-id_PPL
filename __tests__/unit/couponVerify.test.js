/**
 * UT-13: test_coupon_verification_rejects_expired_coupon
 * UT-14: test_coupon_forNewUser_rejected_for_existing_buyer
 * File target: app/api/coupon/route.js
 * Yang diuji:
 *   - UT-13: Kupon expired (expiresAt < now) → return 404
 *   - UT-14: Kupon forNewUser=true ditolak jika user sudah pernah order
 */

// ─── Mock Clerk ───────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn().mockReturnValue({
    userId: "user-123",
    has: jest.fn().mockReturnValue(false),
  }),
}));

// ─── Mock Prisma (akan di-override per test) ──────────────────────────────────
const mockCouponFindUnique = jest.fn();
const mockOrderFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    coupon: {
      findUnique: mockCouponFindUnique,
    },
    order: {
      findMany: mockOrderFindMany,
    },
  },
}));

// ─── Helper: buat mock Request ────────────────────────────────────────────────
const makeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

// ─── Import handler setelah mock ──────────────────────────────────────────────
const { POST } = require("../../app/api/coupon/route");

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("UT-13 | Coupon - Menolak Kupon Expired", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "user-123",
      has: jest.fn().mockReturnValue(false),
    });
  });

  test("harus return 404 jika kupon sudah expired", async () => {
    // Prisma tidak menemukan kupon valid (karena expired sudah difilter di query)
    mockCouponFindUnique.mockResolvedValue(null);

    const req = makeRequest({ code: "DISKON50" });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  test("harus return data kupon jika kupon masih valid (belum expired)", async () => {
    const validCoupon = {
      id: "coupon-1",
      code: "HEMAT10",
      discount: 10,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari lagi
      forNewUser: false,
      forMember: false,
    };
    mockCouponFindUnique.mockResolvedValue(validCoupon);
    mockOrderFindMany.mockResolvedValue([]);

    const req = makeRequest({ code: "HEMAT10" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coupon).toBeDefined();
    expect(body.coupon.code).toBe("HEMAT10");
  });

  test("harus return 400 jika kupon forMember=true tapi user tidak punya plan plus", async () => {
    const prisma = require("@/lib/prisma").default;
    prisma.coupon.findUnique.mockResolvedValue({
      code: "MEMBER20",
      forNewUser: false,
      forMember: true,
      discount: 20,
    });

    // Simulasi `has` mengembalikan false
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "user-123",
      has: jest.fn().mockReturnValue(false),
    });

    const req = makeRequest({ code: "MEMBER20" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Kupon valid untuk members only");
  });

  test("harus return 400 jika terjadi error (catch block)", async () => {
    const prisma = require("@/lib/prisma").default;
    // Paksa error saat memanggil Prisma
    prisma.coupon.findUnique.mockRejectedValue(new Error("Database connection failed"));

    const req = makeRequest({ code: "DISC10" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  test("harus memanggil prisma.coupon.findUnique dengan filter code", async () => {
    mockCouponFindUnique.mockResolvedValue(null);

    const req = makeRequest({ code: "DISKON50" });
    await POST(req);

    expect(mockCouponFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          code: "DISKON50",
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("UT-14 | Coupon - Menolak forNewUser untuk Buyer Lama", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({
      userId: "user-123",
      has: jest.fn().mockReturnValue(false),
    });
  });

  test("harus return 400 jika kupon forNewUser=true tapi user sudah pernah order", async () => {
    // Kupon ditemukan tapi untuk new user
    mockCouponFindUnique.mockResolvedValue({
      id: "coupon-new",
      code: "WELCOME20",
      discount: 20,
      forNewUser: true,
      forMember: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // User sudah pernah order sebelumnya
    mockOrderFindMany.mockResolvedValue([{ id: "order-lama", userId: "user-123" }]);

    const req = makeRequest({ code: "WELCOME20" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  test("harus return 200 jika kupon forNewUser=true dan user BELUM pernah order", async () => {
    mockCouponFindUnique.mockResolvedValue({
      id: "coupon-new",
      code: "WELCOME20",
      discount: 20,
      forNewUser: true,
      forMember: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // User belum pernah order
    mockOrderFindMany.mockResolvedValue([]);

    const req = makeRequest({ code: "WELCOME20" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  test("harus return 200 jika kupon forNewUser=false meskipun user sudah pernah order", async () => {
    mockCouponFindUnique.mockResolvedValue({
      id: "coupon-all",
      code: "DISKON10",
      discount: 10,
      forNewUser: false,
      forMember: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // User sudah pernah order, tapi kupon bukan untuk new user saja
    mockOrderFindMany.mockResolvedValue([{ id: "order-lama", userId: "user-123" }]);

    const req = makeRequest({ code: "DISKON10" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
