/**
 * IT-06: test_store_creation_and_seller_verification
 * Modul terlibat: store/create POST → store/is-seller GET → authSeller
 * Yang diuji:
 *   - User daftar store → store dibuat dengan status "pending"
 *   - Cek is-seller → authSeller return storeId (karena status bukan "APPROVED")
 *   - Data store tersimpan lengkap (name, username, email, logo URL)
 */

// ─── Mock Clerk ───────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
  getAuth: jest.fn().mockReturnValue({ userId: "user-abc" }),
  currentUser: jest.fn().mockResolvedValue({
    id: "user-abc",
    emailAddresses: [{ emailAddress: "karin@example.com" }],
  }),
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockStoreCreate = jest.fn();
const mockStoreFindUnique = jest.fn();
const mockStoreFindFirst = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    store: {
      create: mockStoreCreate,
      findUnique: mockStoreFindUnique,
      findFirst: mockStoreFindFirst,
    },
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
    },
  },
}));

// ─── Mock ImageKit (upload logo) ─────────────────────────────────────────────
jest.mock("@/configs/imageKit", () => ({
  __esModule: true,
  default: {
    upload: jest.fn().mockResolvedValue({
      url: "https://ik.imagekit.io/siloshop/logo-toko.jpg",
      fileId: "img-001",
      filePath: "/logos/logo-toko.jpg",
    }),
    url: jest.fn().mockReturnValue("https://ik.imagekit.io/siloshop/logo-toko.webp"),
  },
}));

// ─── Mock authSeller ──────────────────────────────────────────────────────────
jest.mock("@/middlewares/authSeller", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// ─── Helper ───────────────────────────────────────────────────────────────────
// Source code uses request.formData(), not request.json()
const makeFormDataRequest = (data) => {
  const formData = new Map(Object.entries(data));
  return {
    formData: jest.fn().mockResolvedValue({
      get: (key) => formData.get(key),
    }),
  };
};

const makeJsonRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

// ─── Import handlers ──────────────────────────────────────────────────────────
const { POST: createStore, GET: getStoreStatus } = require("../../app/api/store/create/route");
const { GET: isSeller } = require("../../app/api/store/is-seller/route");
const authSeller = require("@/middlewares/authSeller").default;

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("IT-06 | Store Creation & Seller Verification (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockReturnValue({ userId: "user-abc" });
  });

  test("Store berhasil dibuat dengan status 'pending'", async () => {
    mockStoreFindFirst.mockResolvedValue(null);

    mockStoreCreate.mockResolvedValue({
      id: "store-new",
      name: "Toko Karin",
      username: "toko-karin",
      email: "karin@example.com",
      logo: "https://ik.imagekit.io/siloshop/logo-toko.webp",
      status: "pending",
      isActive: false,
      userId: "user-abc",
    });

    mockUserUpdate.mockResolvedValue({});

    const mockImage = {
      name: "logo.jpg",
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const req = makeFormDataRequest({
      name: "Toko Karin",
      username: "toko-karin",
      description: "Toko terbaik",
      email: "karin@example.com",
      contact: "08123456789",
      address: "Jl. Merdeka No.1",
      image: mockImage,
    });

    const res = await createStore(req);
    expect(res.status).toBe(200);

    // Verifikasi Prisma dipanggil dengan data lengkap
    expect(mockStoreCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Toko Karin",
          username: "toko-karin",
          email: "karin@example.com",
          userId: "user-abc",
        }),
      }),
    );
  });

  test("Data store tersimpan dengan semua field wajib (name, username, email, logo URL)", async () => {
    mockStoreFindFirst.mockResolvedValue(null);

    const storedData = {
      id: "store-new",
      name: "Toko Karin",
      username: "toko-karin",
      email: "karin@example.com",
      logo: "https://ik.imagekit.io/siloshop/logo-toko.webp",
      status: "pending",
      userId: "user-abc",
    };
    mockStoreCreate.mockResolvedValue(storedData);
    mockUserUpdate.mockResolvedValue({});

    const mockImage = {
      name: "logo.jpg",
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const req = makeFormDataRequest({
      name: "Toko Karin",
      username: "toko-karin",
      description: "Toko terbaik",
      email: "karin@example.com",
      contact: "08123456789",
      address: "Jl. Merdeka No.1",
      image: mockImage,
    });

    await createStore(req);

    const callArgs = mockStoreCreate.mock.calls[0][0].data;
    expect(callArgs.name).toBe("Toko Karin");
    expect(callArgs.username).toBe("toko-karin");
    expect(callArgs.email).toBe("karin@example.com");
    // Logo URL harus berupa URL ImageKit (bukan base64 lagi)
    expect(callArgs.logo).toMatch(/^https?:\/\//);
  });

  test("authSeller (is-seller) return storeId meskipun status masih 'pending'", async () => {
    authSeller.mockResolvedValue("store-new");

    mockStoreFindUnique.mockResolvedValue({
      id: "store-new",
      userId: "user-abc",
      status: "pending",
    });

    const res = await isSeller();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storeInfo || body.isSeller).toBeTruthy();
  });

  test("authSeller return false jika user belum mendaftar store", async () => {
    authSeller.mockResolvedValue(false);

    const res = await isSeller();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  test("Store tidak bisa dibuat tanpa field wajib (name kosong)", async () => {
    const req = makeFormDataRequest({
      name: "",
      username: "toko-karin",
      description: "Toko terbaik",
      email: "karin@example.com",
      contact: "08123456789",
      address: "Jl. Merdeka No.1",
      image: null,
    });

    const res = await createStore(req);

    expect(res.status).toBe(400);
    expect(mockStoreCreate).not.toHaveBeenCalled();
  });

  test("Store tidak bisa dibuat jika username mengandung spasi", async () => {
    const req = makeFormDataRequest({
      name: "Toko",
      username: "toko saya",
      description: "d",
      email: "a@a.com",
      contact: "1",
      address: "1",
      image: { name: "a.jpg" },
    });
    const res = await createStore(req);
    expect(res.status).toBe(400);
  });

  test("Return status toko jika user sudah memiliki toko (POST)", async () => {
    mockStoreFindFirst.mockResolvedValueOnce({ status: "pending" });
    const req = makeFormDataRequest({
      name: "Toko",
      username: "toko",
      description: "d",
      email: "a@a.com",
      contact: "1",
      address: "1",
      image: { name: "a.jpg" },
    });
    const res = await createStore(req);
    const body = await res.json();
    expect(body.status).toBe("pending");
  });

  test("Store tidak bisa dibuat jika username sudah dipakai", async () => {
    mockStoreFindFirst.mockResolvedValueOnce(null);
    mockStoreFindFirst.mockResolvedValueOnce({ id: 1 });
    const req = makeFormDataRequest({
      name: "Toko",
      username: "toko",
      description: "d",
      email: "a@a.com",
      contact: "1",
      address: "1",
      image: { name: "a.jpg" },
    });
    const res = await createStore(req);
    expect(res.status).toBe(400);
  });

  test("Error di POST tertangkap oleh catch block", async () => {
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockImplementation(() => {
      throw new Error("Clerk Error");
    });
    const req = makeFormDataRequest({});
    const res = await createStore(req);
    expect(res.status).toBe(400);
  });

  test("GET return status toko jika user sudah memiliki toko", async () => {
    mockStoreFindFirst.mockResolvedValueOnce({ status: "APPROVED" });
    const res = await getStoreStatus({});
    const body = await res.json();
    expect(body.status).toBe("APPROVED");
  });

  test("GET return not registered jika user belum punya toko", async () => {
    mockStoreFindFirst.mockResolvedValueOnce(null);
    const res = await getStoreStatus({});
    const body = await res.json();
    expect(body.status).toBe("not registered");
  });

  test("Error di GET tertangkap oleh catch block", async () => {
    const { getAuth } = require("@clerk/nextjs/server");
    getAuth.mockImplementation(() => {
      throw new Error("Clerk Error");
    });
    const res = await getStoreStatus({});
    expect(res.status).toBe(400);
  });
});
