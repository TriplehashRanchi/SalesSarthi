"use client";
import { useRouter } from "next/navigation";

export default function OfferStickyWidget() {
  const router = useRouter();
  const IMAGE_URL = "/banner.jpeg";

  const handleRedirect = () => router.push("https://reborn.digitalgyani.org/");

  return (
    <div className="w-full mb-6 px-2">
      <div
        onClick={handleRedirect}
        className="relative w-full rounded-2xl overflow-hidden shadow-xl cursor-pointer transition hover:scale-[1.01]"
      >
        {/* Background so NO white gaps */}
        <div className="bg-white rounded-2xl p-0">
          <img
            src={IMAGE_URL}
            alt="Offer Banner"
            className="
              w-full 
              h-auto 
              rounded-2xl 
              object-contain
            "
          />
        </div>
      </div>
    </div>
  );
}
