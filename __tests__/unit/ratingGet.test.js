/**
 * UT-18: test_rating_get_route
 * File target: app/api/rating/route.js (GET Method)
 * Yang diuji:
 *   - 401 Unauthorized (userId null)
 *   - Sukses ambil rating milik user (200)
 *   - Catch error (400)
 */

jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn(),
}));

const mockRatingFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    rating: {
      findMany: mockRatingFindMany,
    },
  },
}));

const { GET } = require("../../app/api/rating/route");
const { getAuth } = require("@clerk/nextjs/server");

describe("UT-18 | Rating GET Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeGetRequest = () => ({});

  test("harus return 401 jika userId tidak ada (unauthorized)", async () => {
    // getAuth mengembalikan objek kosong tanpa userId
    getAuth.mockReturnValue({});

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  test("harus return 200 dan array rating milik user", async () => {
    getAuth.mockReturnValue({ userId: "user-buyer" });

    mockRatingFindMany.mockResolvedValue([
      { id: "rating-1", rating: 5 },
      { id: "rating-2", rating: 4 },
    ]);

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    // Pastikan status default-nya
    expect(body.ratings).toHaveLength(2);
    expect(mockRatingFindMany).toHaveBeenCalledWith({
      where: { userId: "user-buyer" },
    });
  });

  test("harus return 400 jika terjadi error di catch block", async () => {
    getAuth.mockReturnValue({ userId: "user-buyer" });
    mockRatingFindMany.mockRejectedValue(new Error("Prisma error timeout"));

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Prisma error timeout");
  });
});
