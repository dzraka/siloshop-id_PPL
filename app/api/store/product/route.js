import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import imagekit from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Add a new product
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // get the data from the form
    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const mrp = Number(formData.get("mrp"));
    const price = Number(formData.get("price"));
    const category = formData.get("category");
    const images = formData.getAll("images");

    if (
      !name ||
      !description ||
      !mrp ||
      !price ||
      !category ||
      images.length < 1
    ) {
      return NextResponse.json(
        { error: "missing product details" },
        { status: 400 }
      );
    }

    // Validate prices are positive and price does not exceed mrp
    if (mrp <= 0 || price <= 0) {
      return NextResponse.json(
        { error: "harga harus lebih dari 0" },
        { status: 400 }
      );
    }

    if (price > mrp) {
      return NextResponse.json(
        { error: "harga jual tidak boleh melebihi harga asli (MRP)" },
        { status: 400 }
      );
    }

    // uploading images to imagekit
    let imageUrl = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imagekit.upload({
          file: buffer,
          fileName: image.name,
          folder: "products",
        });
        const url = imagekit.url({
          path: response.filePath,
          transformation: [
            { quality: "auto" },
            { format: "webp" },
            { width: "1024" },
          ],
        });
        return url;
      })
    );

    await prisma.product.create({
      data: {
        name,
        description,
        mrp,
        price,
        category,
        images: imageUrl,
        storeId,
      },
    });

    return NextResponse.json({ message: "product added successfully" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}

// Get all products of a seller
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }
    const products = await prisma.product.findMany({
      where: { storeId },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}
