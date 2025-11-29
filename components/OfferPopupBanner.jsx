"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfferPopupBanner() {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);

  const IMAGE_URL = "/popup.jpeg"; // 1080 x 1080 image
  useEffect(() => {
    // Always show popup on dashboard mount
    setShowPopup(true);
  }, []);

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleRedirect = () => {
    router.push("https://reborn.digitalgyani.org/");
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999]">
      <div className="relative w-[92%] max-w-[500px] rounded-2xl overflow-hidden shadow-2xl bg-white">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-black/80"
        >
          ✕
        </button>

        {/* clickable image */}
        <img
          src={IMAGE_URL}
          alt="Offer Banner"
          onClick={handleRedirect}
          className="w-full cursor-pointer object-cover"
          style={{
            maxHeight: "500px",      // looks perfect for 1080x1080 image
            width: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
}
