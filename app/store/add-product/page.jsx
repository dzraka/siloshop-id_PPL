"use client";
import { assets } from "@/assets/assets";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function StoreAddProduct() {
  const categories = [
    "Makanan Berat",
    "Cemilan",
    "Minuman",
    "Manisan",
    "Makanan Sehat",
    "Lainnya",
  ];

  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
    mrp: 0,
    price: 0,
    category: "",
  });
  const [loading, setLoading] = useState(false);

  const { getToken } = useAuth();

  const onChangeHandler = (e) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      // if no images are uploaded then return
      if (!images[1] && !images[2] && !images[3] && !images[4]) {
        return toast.error("Mohon upload setidaknya satu gambar");
      }
      setLoading(true);

      const formData = new FormData();
      formData.append("name", productInfo.name);
      formData.append("description", productInfo.description);
      formData.append("mrp", productInfo.mrp);
      formData.append("price", productInfo.price);
      formData.append("category", productInfo.category);

      // adding images to formdata
      Object.keys(images).forEach((key) => {
        images[key] && formData.append("images", images[key]);
      });

      const token = await getToken();
      const { data } = await axios.post("/api/store/product", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success(data.message);

      // reset the form
      setProductInfo({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
      });
      // reset images
      setImages({ 1: null, 2: null, 3: null, 4: null });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) =>
        toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })
      }
      className="text-slate-500 mb-28"
    >
      <h1 className="text-2xl">
        Add New <span className="text-slate-800 font-medium">Products</span>
      </h1>
      <p className="mt-7">Gambar Produk</p>

      <div htmlFor="" className="flex gap-3 mt-4">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
              src={
                images[key]
                  ? URL.createObjectURL(images[key])
                  : assets.upload_area
              }
              alt=""
            />
            <input
              type="file"
              accept="image/*"
              id={`images${key}`}
              onChange={(e) =>
                setImages({ ...images, [key]: e.target.files[0] })
              }
              hidden
            />
          </label>
        ))}
      </div>

      <label htmlFor="" className="flex flex-col gap-2 my-6 ">
        Nama
        <input
          type="text"
          name="name"
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder="Masukkan nama produk"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
          required
        />
      </label>

      <label htmlFor="" className="flex flex-col gap-2 my-6 ">
        Deskripsi
        <textarea
          name="description"
          onChange={onChangeHandler}
          value={productInfo.description}
          placeholder="Masukkan deskripsi produk"
          rows={5}
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
          required
        />
      </label>

      <div className="flex gap-5">
        <label htmlFor="" className="flex flex-col gap-2 ">
          Harga Sebenarnya (Rp)
          <input
            type="number"
            name="mrp"
            min="0"
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
          />
        </label>
        <label htmlFor="" className="flex flex-col gap-2 ">
          Harga Penawaran (Rp)
          <input
            type="number"
            name="price"
            min="0"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
          />
        </label>
      </div>

      <select
        onChange={(e) =>
          setProductInfo({ ...productInfo, category: e.target.value })
        }
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded"
        required
      >
        <option value="">Pilih kategori</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <br />

      <button
        disabled={loading}
        className="bg-red-500 text-white px-6 mt-7 py-2 hover:bg-red-700 rounded transition"
      >
        Tambah Produk
      </button>
    </form>
  );
}
