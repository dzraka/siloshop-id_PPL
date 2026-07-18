/**
 * UT-17: test_order_get_route
 * File target: app/api/orders/route.js (GET Method)
 * Yang diuji:
 *   - Mengambil data order milik user berdasarkan filter (COD atau STRIPE lunas)
 *   - Error handling di block catch
 */

jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn(),
}));

jest.mock("@prisma/client", () => ({
  PaymentMethod: {
    COD: "COD",
    STRIPE: "STRIPE",
  },
}));

const mockOrderFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    order: {
      findMany: mockOrderFindMany,
    },
  },
}));

const { GET } = require("../../app/api/orders/route");
const { getAuth } = require("@clerk/nextjs/server");
const { PaymentMethod } = require("@prisma/client");

describe("UT-17 | Order GET Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeGetRequest = () => ({}); // Objek request dummy

  test("harus return 200 dan mengembalikan pesanan yang valid (COD atau STRIPE isPaid:true)", async () => {
    getAuth.mockReturnValue({ userId: "user-123" });

    mockOrderFindMany.mockResolvedValue([
      { id: "order-1", paymentMethod: "COD" },
      { id: "order-2", paymentMethod: "STRIPE", isPaid: true },
    ]);

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Tapi next response json normal status adalah 200. Karena ini return object langsung, di object response status=200 kalau diakses res.status.
    expect(body.orders).toHaveLength(2);

    // Pastikan filter OR Prisma berjalan sesuai source code
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          OR: [{ paymentMethod: PaymentMethod.COD }, { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] }],
        }),
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  test("harus return 400 jika terjadi error di Prisma", async () => {
    getAuth.mockReturnValue({ userId: "user-123" });
    mockOrderFindMany.mockRejectedValue(new Error("Database connection failed"));

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Database connection failed");
  });
});
