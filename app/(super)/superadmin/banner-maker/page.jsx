'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import Swal from 'sweetalert2';

// 📌 Max LocalStorage limit (approx 5MB in most browsers)
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

const BannerUploader = () => {
    const [bannerImages, setBannerImages] = useState([]);
    const [savedBanners, setSavedBanners] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ✅ Load banners from localStorage on component mount
    useEffect(() => {
        const storedBanners = JSON.parse(localStorage.getItem('savedBanners')) || [];
        setSavedBanners(storedBanners);
    }, []);

    // 📌 Handle file upload (direct or ZIP extraction)
    const handleFileUpload = async (e) => {
        const files = e.target.files;
        processFiles(files);
    };

    // 📌 Handle drag & drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        processFiles(e.dataTransfer.files);
    };

    // 📌 Process uploaded files
    const processFiles = async (files) => {
        const images = [];
        let totalSize = 0;

        for (const file of files) {
            totalSize += file.size; // ✅ Track total file size

            if (totalSize > MAX_STORAGE_SIZE) {
                Swal.fire('Error!', 'File size exceeds 5MB storage limit!', 'error');
                return;
            }

            if (file.type.startsWith('image/')) {
                images.push(await readFileAsDataURL(file));
            } else if (file.name.endsWith('.zip')) {
                const extractedImages = await extractZip(file);
                images.push(...extractedImages);
            }
        }

        setBannerImages((prev) => [...prev, ...images]);
    };

    // 📌 Read file as Data URL
    const readFileAsDataURL = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
        });
    };

    // 📌 Extract images from ZIP
    const extractZip = async (file) => {
        const zip = await JSZip.loadAsync(file);
        const images = [];

        for (const fileName in zip.files) {
            if (zip.files[fileName].dir) continue;
            if (fileName.match(/\.(png|jpe?g|gif|webp)$/i)) {
                const fileData = await zip.files[fileName].async('base64');
                images.push(`data:image/png;base64,${fileData}`);
            }
        }

        return images;
    };

    // 📌 Remove single image from preview
    const removeImage = (index) => {
        setBannerImages(bannerImages.filter((_, i) => i !== index));
    };

    // 📌 Upload images (Save to localStorage with Quota Check)
    const handleUpload = () => {
        if (bannerImages.length === 0) {
            Swal.fire('Warning!', 'Please upload at least one image.', 'warning');
            return;
        }

        setUploading(true);
        setTimeout(() => {
            setUploading(false);
            const updatedBanners = [...savedBanners, ...bannerImages];

            try {
                // ✅ Check if storage size exceeds 5MB before saving
                const storageSize = new Blob([JSON.stringify(updatedBanners)]).size;
                if (storageSize > MAX_STORAGE_SIZE) {
                    Swal.fire('Error!', 'Storage limit exceeded (5MB)!', 'error');
                    return;
                }

                localStorage.setItem('savedBanners', JSON.stringify(updatedBanners));
                setSavedBanners(updatedBanners);
                setBannerImages([]);

                Swal.fire('Success!', 'Banners uploaded successfully.', 'success');
            } catch (error) {
                Swal.fire('Error!', 'LocalStorage quota exceeded!', 'error');
            }
        }, 1500);
    };

    // 📌 Delete a banner from saved banners (removes from localStorage too)
    const deleteBanner = (index) => {
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
                const updatedBanners = savedBanners.filter((_, i) => i !== index);

                // ✅ Update localStorage
                localStorage.setItem('savedBanners', JSON.stringify(updatedBanners));
                setSavedBanners(updatedBanners);

                Swal.fire('Deleted!', 'The banner has been removed.', 'success');
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Super Admin Banner Manager</h2>

            {/* Upload Box */}
            <div
                className={`border-2 border-dashed p-8 rounded-lg text-center cursor-pointer transition-all duration-200 ${
                    dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*, .zip"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="fileUpload"
                />
                <label htmlFor="fileUpload" className="block">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg width="50" height="50" fill="currentColor" className="mb-3 text-blue-400" viewBox="0 0 24 24">
                            <path d="M12 16v-7l-3 3m3-3l3 3M5 20h14a2 2 0 002-2V10a2 2 0 00-2-2h-4l-2-2H7l-2 2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium">Drag & Drop images or ZIP file</p>
                        <p className="text-sm text-gray-400">or click to browse</p>
                    </div>
                </label>
            </div>

            {/* Preview Uploaded Images */}
            {bannerImages.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Preview</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {bannerImages.map((image, index) => (
                            <img key={index} src={image} alt={`Preview ${index}`} className="w-[120px] h-[120px] object-cover rounded-lg shadow-md" />
                        ))}
                    </div>
                    <button onClick={handleUpload} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        {uploading ? 'Uploading...' : 'Upload Banners'}
                    </button>
                </div>
            )}

            {/* Saved Banners */}
            {savedBanners.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Saved Banners</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {savedBanners.map((image, index) => (
                            <div key={index} className="relative">
                                <img src={image} alt={`Banner ${index}`} className="w-[120px] h-[120px] object-cover rounded-lg shadow-md" />
                                <button onClick={() => deleteBanner(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-75 hover:opacity-100">
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannerUploader;
