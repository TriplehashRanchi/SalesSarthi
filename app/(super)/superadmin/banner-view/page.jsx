'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// ✅ Predefined banners
const templates = {
    '2025': '/assets/images/2025.png',
    'republic': '/assets/images/republic.png',
    'finone': '/assets/images/finone.png',
    'fintwo': '/assets/images/fintwo.png',
    'fplan': '/assets/images/fplan.png',
    'father': '/assets/images/father.png',
    'jack': '/assets/images/jack.png',
    'edu': '/assets/images/edu.png'
};

const BannerViewer = () => {
    const [banners, setBanners] = useState([]);

    // ✅ Load banners from localStorage
    useEffect(() => {
        const storedBanners = JSON.parse(localStorage.getItem('savedBanners')) || [];
        setBanners([...Object.values(templates), ...storedBanners]); // Combine templates & saved banners
    }, []);

    // 📌 Delete banner (Only from localStorage)
    const deleteBanner = (index) => {
        if (index < Object.keys(templates).length) {
            Swal.fire({
                icon: 'warning',
                title: 'Oops!',
                text: 'You cannot delete predefined banners.',
            });
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this banner?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                const updatedBanners = banners.slice(Object.keys(templates).length).filter((_, i) => i !== (index - Object.keys(templates).length));

                // ✅ Update localStorage
                localStorage.setItem('savedBanners', JSON.stringify(updatedBanners));
                setBanners([...Object.values(templates), ...updatedBanners]);

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The banner has been removed.',
                });
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto p-8 bg-white shadow-xl rounded-lg">
            {/* HEADER */}
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
                🎨 Super Admin - <span className="text-blue-500">Banner Viewer</span>
            </h2>

            {banners.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {banners.map((image, index) => (
                        <div
                            key={index}
                            className="relative bg-gray-100 rounded-lg shadow-md overflow-hidden transform transition duration-300 hover:scale-105 hover:shadow-lg"
                        >
                            {/* IMAGE */}
                            <img
                                src={image}
                                alt={`Banner ${index}`}
                                className="w-full h-40 object-cover rounded-lg"
                            />

                            {/* DELETE BUTTON */}
                            <button
                                onClick={() => deleteBanner(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 shadow-md opacity-80 hover:opacity-100 transition duration-300"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-center text-lg mt-4">No banners uploaded yet.</p>
            )}
        </div>
    );
};

export default BannerViewer;
