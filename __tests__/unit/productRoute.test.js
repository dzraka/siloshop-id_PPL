/**
 * UT-16: test_store_product_route_logic
 * File target: app/api/store/product/route.js
 * Yang diuji:
 *   - POST: Validasi harga (mrp & price <= 0)
 *   - POST: Validasi harga (price > mrp)
 *   - POST: Alur sukses upload image ke ImageKit dan create product di Prisma
 *   - GET: Gagal authSeller -> 401
 *   - GET: Sukses retrieve products -> 200
 */

// ─── Mock Clerk ───────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn(),
}));

// ─── Mock Middleware authSeller ───────────────────────────────────────────────
jest.mock("@/middlewares/authSeller", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// ─── Mock ImageKit ────────────────────────────────────────────────────────────
const mockImageKitUpload = jest.fn();
const mockImageKitUrl = jest.fn();

jest.mock("@/configs/imageKit", () => ({
  __esModule: true,
  default: {
    upload: mockImageKitUpload,
    url: mockImageKitUrl,
  },
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockProductCreate = jest.fn();
const mockProductFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    product: {
      create: mockProductCreate,
      findMany: mockProductFindMany,
    },
  },
}));

// ─── Helper: Request Mock ─────────────────────────────────────────────────────
const makeFormDataRequest = (data, images = []) => {
  const formData = new Map();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }

  return {
    formData: jest.fn().mockResolvedValue({
      get: (key) => formData.get(key),
      getAll: (key) => {
        if (key === "images") return images;
        return [];
      },
    }),
  };
};

const makeGetRequest = () => ({
  // tidak butuh json atau form data untuk GET sederhana
});

// ─── Import handlers ──────────────────────────────────────────────────────────
const { POST, GET } = require("../../app/api/store/product/route");
const { getAuth } = require("@clerk/nextjs/server");
const authSeller = require("@/middlewares/authSeller").default;

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("UT-16 | Store Product Route Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuth.mockReturnValue({ userId: "seller-123" });
    authSeller.mockResolvedValue("store-123");
  });

  describe("POST /api/store/product", () => {
    test("harus return 400 jika mrp atau price <= 0", async () => {
      // Mock 1 gambar
      const mockImage = { name: "img.jpg", arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)) };

      const req = makeFormDataRequest(
        {
          name: "Produk Test",
          description: "Deskripsi",
          mrp: "-5000", // Invalid mrp
          price: "10000",
          category: "Elektronik",
        },
        [mockImage],
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("harga harus lebih dari 0");
    });

    test("harus return 400 jika price melebihi mrp", async () => {
      const mockImage = { name: "img.jpg", arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)) };

      const req = makeFormDataRequest(
        {
          name: "Produk Test",
          description: "Deskripsi",
          mrp: "10000",
          price: "15000", // Invalid: price > mrp
          category: "Elektronik",
        },
        [mockImage],
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("harga jual tidak boleh melebihi harga asli (MRP)");
    });

    test("harus return 200 dan memproses image upload serta prisma create (skenario sukses)", async () => {
      const mockImage1 = { name: "img1.jpg", arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)) };
      const mockImage2 = { name: "img2.jpg", arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)) };

      const req = makeFormDataRequest(
        {
          name: "Laptop Keren",
          description: "Laptop super cepat",
          mrp: "15000000",
          price: "14000000",
          category: "Komputer",
        },
        [mockImage1, mockImage2],
      );

      // Mock ImageKit upload
      mockImageKitUpload.mockResolvedValueOnce({ filePath: "/products/img1.jpg" }).mockResolvedValueOnce({ filePath: "/products/img2.jpg" });

      // Mock ImageKit URL
      mockImageKitUrl.mockReturnValueOnce("https://ik.imagekit.io/siloshop/products/img1.webp").mockReturnValueOnce("https://ik.imagekit.io/siloshop/products/img2.webp");

      mockProductCreate.mockResolvedValue({ id: "prod-new" });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("product added successfully");

      // Verify ImageKit dipanggil sejumlah file
      expect(mockImageKitUpload).toHaveBeenCalledTimes(2);

      // Verify Prisma Create dipanggil dengan array images hasil mapping url
      expect(mockProductCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Laptop Keren",
            mrp: 15000000,
            price: 14000000,
            images: ["https://ik.imagekit.io/siloshop/products/img1.webp", "https://ik.imagekit.io/siloshop/products/img2.webp"],
            storeId: "store-123",
          }),
        }),
      );
    });
  });

  describe("GET /api/store/product", () => {
    test("harus return 401 jika user bukan seller (authSeller return false/null)", async () => {
      authSeller.mockResolvedValue(null);

      const req = makeGetRequest();
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    test("harus return 200 dan daftar produk jika request valid", async () => {
      mockProductFindMany.mockResolvedValue([
        { id: "p1", name: "Mouse" },
        { id: "p2", name: "Keyboard" },
      ]);

      const req = makeGetRequest();
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.products).toHaveLength(2);
      expect(body.products[0].name).toBe("Mouse");

      expect(mockProductFindMany).toHaveBeenCalledWith({
        where: { storeId: "store-123" },
      });
    });

    test("harus return 400 jika terjadi error di blok catch GET", async () => {
      // Buat Prisma error dengan sengaja
      mockProductFindMany.mockRejectedValue(new Error("Database down"));

      const req = makeGetRequest();
      const res = await GET(req);

      expect(res.status).toBe(400);
    });
  });
});
