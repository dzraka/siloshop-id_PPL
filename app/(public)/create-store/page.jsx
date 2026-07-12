"use client";
import { assets } from "@/assets/assets";
import { useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function CreateStore() {
  const { user } = useUser();
  const router = useRouter();
  const { getToken } = useAuth();

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [storeInfo, setStoreInfo] = useState({
    name: "",
    username: "",
    description: "",
    email: "",
    contact: "",
    address: "",
    image: "",
  });

  const onChangeHandler = (e) => {
    let value = e.target.value;
    if (e.target.name === "username") {
      value = value.replace(/\s/g, "");
    }
    setStoreInfo({ ...storeInfo, [e.target.name]: value });
  };

  const fetchSellerStatus = async () => {
    const token = await getToken();
    try {
      const { data } = await axios.get("/api/store/create", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (["approved", "pending", "rejected"].includes(data.status)) {
        setStatus(data.status);
        setAlreadySubmitted(true);
        switch (data.status) {
          case "approved":
            setMessage(
              "Toko Anda telah disetujui! Anda sekarang dapat menambahkan produk ke toko Anda dari dashboard."
            );
            setTimeout(() => router.push("/store"), 5000);
            break;
          case "rejected":
            setMessage(
              "Toko Anda telah ditolak! Hubungi admin untuk detail lebih lanjut."
            );
            break;
          case "pending":
            setMessage(
              "Permintaan toko Anda tertunda, harap tunggu admin untuk menyetujui toko Anda."
            );
            break;
          default:
            break;
        }
      } else {
        setAlreadySubmitted(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!user) {
      return toast("Silakan Login untuk melanjutkan");
    }
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("name", storeInfo.name);
      formData.append("username", storeInfo.username);
      formData.append("description", storeInfo.description);
      formData.append("email", storeInfo.email);
      formData.append("contact", storeInfo.contact);
      formData.append("address", storeInfo.address);
      formData.append("image", storeInfo.image);

      const { data } = await axios.post("/api/store/create", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success(data.message);
      await fetchSellerStatus();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSellerStatus();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <h1 className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">
          Silakan <span className="text-slate-600"> login </span>
          untuk mengakses halaman ini
        </h1>
      </div>
    );
  }

  return !loading ? (
    <>
      {!alreadySubmitted ? (
        <div className="mx-6 min-h-[70vh] my-16">
          <form
            onSubmit={(e) =>
              toast.promise(onSubmitHandler(e), {
                loading: "Submitting data...",
              })
            }
            className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
          >
            {/* Title */}
            <div>
              <h1 className="text-3xl ">
                Add Your{" "}
                <span className="text-slate-800 font-medium">Store</span>
              </h1>
              <p className="max-w-lg">
                Untuk menjadi seller di SILOSHOP.ID, kirimkan detail toko Anda
                untuk ditinjau. Toko Anda akan diaktifkan setelah verifikasi
                admin.
              </p>
            </div>

            <label className="mt-10 cursor-pointer">
              Logo Toko
              <Image
                src={
                  storeInfo.image
                    ? URL.createObjectURL(storeInfo.image)
                    : assets.upload_area
                }
                className="rounded-lg mt-2 h-16 w-auto"
                alt=""
                width={150}
                height={100}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setStoreInfo({ ...storeInfo, image: e.target.files[0] })
                }
                hidden
              />
            </label>

            <p>Username</p>
            <input
              name="username"
              onChange={onChangeHandler}
              value={storeInfo.username}
              type="text"
              placeholder="Masukkan username toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
            />

            <p>Nama</p>
            <input
              name="name"
              onChange={onChangeHandler}
              value={storeInfo.name}
              type="text"
              placeholder="Masukkan nama toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
            />

            <p>Deskripsi</p>
            <textarea
              name="description"
              onChange={onChangeHandler}
              value={storeInfo.description}
              rows={5}
              placeholder="Masukkan deskripsi toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
            />

            <p>Email</p>
            <input
              name="email"
              onChange={onChangeHandler}
              value={storeInfo.email}
              type="email"
              placeholder="Masukkan email toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
            />

            <p>Nomor Kontak</p>
            <input
              name="contact"
              onChange={onChangeHandler}
              value={storeInfo.contact}
              type="text"
              placeholder="Masukkan nomor kontak toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
            />

            <p>Alamat</p>
            <textarea
              name="address"
              onChange={onChangeHandler}
              value={storeInfo.address}
              rows={5}
              placeholder="Masukkan alamat toko Anda"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
            />

            <button className="bg-red-500 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-red-700 transition ">
              Submit
            </button>
          </form>
        </div>
      ) : (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">
            {message}
          </p>
          {status === "approved" && (
            <p className="mt-5 text-slate-400">
              redirecting to dashboard in{" "}
              <span className="font-semibold">5 seconds</span>
            </p>
          )}
        </div>
      )}
    </>
  ) : (
    <Loading />
  );
}
