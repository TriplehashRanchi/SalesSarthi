"use client";
import { useRouter } from "next/navigation";

export default function OfferStickyWidget() {
  const router = useRouter();
  const IMAGE_URL = "/stickybanner.jpeg";   // your promo image  

  const handleRedirect = () => router.push("https://pages.razorpay.com/Reborn2026");

  return (
    <div className="w-full mb-6 px-2">
      <div
        onClick={handleRedirect}
        className="relative w-full rounded-2xl overflow-hidden shadow-xl cursor-pointer transition hover:scale-[1.01]"
      >
        <img
          src={IMAGE_URL}
          alt="Offer Banner"
          className="w-full"
          style={{
            height: "200px",       // 🔥 compressed height
            width: "100%",
            objectFit: "cover",    // 🔥 auto crop to fit
            objectPosition: "center", // focus center of image
          }}
        />
      </div>
    </div>
  );
}
