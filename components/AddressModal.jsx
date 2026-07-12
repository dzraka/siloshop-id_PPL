"use client";
import { addAddress } from "@/lib/features/address/addressSlice";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";

const AddressModal = ({ setShowAddressModal }) => {
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [address, setAddress] = useState({
    name: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
  });

  const handleAddressChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "zip") {
      value = value.replace(/\D/g, "");
    }
    setAddress({
      ...address,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/address",
        { address },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      dispatch(addAddress(data.newAddress));
      toast.success(data.message);
      setShowAddressModal(false);
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  return (
    <form
      onSubmit={(e) =>
        toast.promise(handleSubmit(e), { loading: "Adding Address..." })
      }
      className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center"
    >
      <div className="flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6">
        <h2 className="text-3xl ">
          Add New <span className="text-red-500 font-semibold">Address</span>
        </h2>
        <input
          name="name"
          onChange={handleAddressChange}
          value={address.name}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="text"
          placeholder="Masukkan nama anda"
          required
        />
        <input
          name="email"
          onChange={handleAddressChange}
          value={address.email}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="email"
          placeholder="Alamat email"
          required
        />
        <input
          name="street"
          onChange={handleAddressChange}
          value={address.street}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="text"
          placeholder="Jalan"
          required
        />
        <div className="flex gap-4">
          <input
            name="city"
            onChange={handleAddressChange}
            value={address.city}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            placeholder="Kota"
            required
          />
          <input
            name="state"
            onChange={handleAddressChange}
            value={address.state}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            placeholder="Provinsi"
            required
          />
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            id="zip"
            name="zip"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength="5"
            onChange={handleAddressChange}
            value={address.zip}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            placeholder="Kode pos (5 digit)"
            required
          />
          <input
            name="country"
            onChange={handleAddressChange}
            value={address.country}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            placeholder="Negara"
            required
          />
        </div>
        <input
          name="phone"
          onChange={handleAddressChange}
          value={address.phone}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="text"
          placeholder="Phone"
          required
        />
        <button className="bg-red-500 text-white text-sm font-medium py-2.5 rounded-md hover:bg-red-700 active:scale-95 transition-all">
          SAVE ADDRESS
        </button>
      </div>
      <XIcon
        size={30}
        className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer"
        onClick={() => setShowAddressModal(false)}
      />
    </form>
  );
};

export default AddressModal;
