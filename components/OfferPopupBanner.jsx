"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { IconX, IconGift, IconArrowRight, IconSparkles } from "@tabler/icons-react";

export default function OfferPopupBanner() {
  const router = useRouter();
  
  // State
  const [banners, setBanners] = useState([]);
  const [totalTodayCount, setTotalTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [showTeaser, setShowTeaser] = useState(false); // The small notification
  const [showModal, setShowModal] = useState(false);   // The full popup

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchTodayBanners = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/banners`);
        const today = new Date().toISOString().split("T")[0];

        // Filter for ONLY today's uploads
        const todays = data.filter((b) => {
          const created = new Date(b.created_at).toISOString().split("T")[0];
          return created === today;
        });

        if (todays.length > 0) {
          // Sort by newest
          const sorted = todays.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );

          setTotalTodayCount(todays.length);
          setBanners(sorted.slice(0, 4)); // Only show top 4 in grid

          // DELAY: Wait 1.5s after load, then show the "Teaser" notification
          setTimeout(() => {
            setShowTeaser(true);
          }, 1500);
        }
        setLoading(false);
      } catch (err) {
        console.error("Banner fetch error:", err);
        setLoading(false);
      }
    };

    fetchTodayBanners();
  }, []);

  const handleOpenModal = () => {
    setShowTeaser(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleRedirect = (url) => {
    if (url) router.push(url);
  };

  // If no data, render nothing
  if (banners.length === 0 && !loading) return null;

  return (
    <>
      {/* ==========================================================
          1. THE TEASER (Notification Bubble)
      ========================================================== */}
      <div
        className={`
            fixed z-[9990] transition-all duration-500 transform
            
            /* MOBILE: Moved up to clear bottom menu */
            bottom-24 right-4 

            /* DESKTOP: Bottom right corner */
            md:bottom-6 md:right-6 

            ${showTeaser 
              ? "translate-y-0 opacity-100" 
              : "translate-y-20 opacity-0 pointer-events-none"
            }
        `}
      >
        <div className="relative group max-w-[90vw]">
          
          {/* --- NEW CLOSE BUTTON FOR TEASER --- */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevents opening the modal
              setShowTeaser(false);
            }}
            className="absolute -top-2 -right-2 z-50 bg-white dark:bg-gray-700 text-gray-500 hover:text-red-500 shadow-md border border-gray-100 dark:border-gray-600 rounded-full p-1 w-6 h-6 flex items-center justify-center transition-transform hover:scale-110"
            aria-label="Close notification"
          >
             <IconX size={14} />
          </button>

          {/* MAIN CARD CONTENT */}
          <div 
            onClick={handleOpenModal}
            className="cursor-pointer bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
          >
            {/* Background Gradient Animation */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-violet-600"></div>
            
            <div className="bg-gradient-to-br from-pink-100 to-violet-100 dark:from-pink-900/30 dark:to-violet-900/30 p-3 rounded-full text-pink-600 dark:text-pink-400 shrink-0">
              <IconGift size={24} className="animate-bounce-slow" />
            </div>

            <div>
              <h4 className="font-bold text-gray-800 dark:text-white text-sm">
                {totalTodayCount} New Banner{totalTodayCount > 1 ? "s" : ""} Today!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 group-hover:text-pink-500 transition-colors">
                Tap to view details <IconArrowRight size={12} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          2. THE MODAL (Main Popup)
      ========================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          
          {/* Backdrop with Blur */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCloseModal}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-[550px] rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="relative bg-gradient-to-r from-violet-600 to-pink-500 p-6 text-white overflow-hidden">
               <div className="absolute -right-6 -top-6 text-white/10 rotate-12">
                 <IconSparkles size={120} />
               </div>
               
               <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition-colors backdrop-blur-md"
              >
                <IconX size={18} />
              </button>

              <div className="relative z-10">
                <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide border border-white/20">
                  Daily Update
                </span>
                <h2 className="text-2xl font-bold mt-2">Today's Highlights</h2>
                <p className="text-white/90 text-sm mt-1">
                  Don't miss out on these limited-time updates.
                </p>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div
                className={`
                  grid gap-4
                  ${banners.length === 1 ? "grid-cols-1" : "grid-cols-2"}
                `}
              >
                {loading
                  ? [...Array(2)].map((_, i) => (
                      <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    ))
                  : banners.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleRedirect(b.redirect_url)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 aspect-[4/3] shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700"
                      >
                        <img
                          src={b.url}
                          alt="Offer"
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
              </div>
            </div>

            {/* Footer / Call to Action */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing <strong className="text-gray-800 dark:text-gray-200">{banners.length}</strong> of <strong className="text-gray-800 dark:text-gray-200">{totalTodayCount}</strong> uploads today
              </div>

              {/* Link to specific page */}
              <button 
                onClick={() => router.push('/ad-banner')}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2"
              >
                See All Offers <IconArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}
      
      {/* Quick custom styles for the specific animation needed */}
      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
      `}</style>
    </>
  );
}