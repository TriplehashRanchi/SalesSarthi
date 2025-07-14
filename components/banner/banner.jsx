'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '@mantine/core';
import html2canvas from 'html2canvas';
import { getAuth } from 'firebase/auth';

const MAIN_CATEGORIES = ['Facebook Ads', 'Daily Motivation', 'Concepts', 'Life Insurance', 'Health Insurance', 'Motor Insurance', 'Mutual Fund', 'Greetings'];

const GREETINGS_SUBCATEGORIES = ['Good Morning', 'Good Night', 'Congratulations', 'Birthday', 'Anniversary', 'Thank You', 'Reminder', 'Special Days', 'Quote', 'Sorry', 'RIP', 'General'];

const ProfessionalBannerMaker = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const exportRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    const [company, setCompany] = useState({
        companyName: '',
        gst: '',
        regAddress: '',
        contactEmail: '',
        phone1: '',
        phone2: '',
        website: '',
    });
    const [logoPreview, setLogoPreview] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [category, setCategory] = useState(null);
    const [subcategory, setSubcategory] = useState(null);
    const [exportBlobUrl, setExportBlobUrl] = useState(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const auth = getAuth();
                const token = await auth.currentUser.getIdToken();

                const { data: comp } = await axios.get(`${API_URL}/api/companies/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setCompany({
                    companyName: comp.name || '',
                    gst: comp.gst_number || '',
                    regAddress: comp.address || '',
                    contactEmail: comp.billing_email || '',
                    phone1: comp.phone_1 || '',
                    phone2: comp.phone_2 || '',
                    website: comp.website || '',
                });
                if (comp.logo_url) setLogoPreview(comp.logo_url);

                const { data: banners } = await axios.get(`${API_URL}/api/banners`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTemplates(banners);
            } catch (err) {
                console.error('Error loading data:', err);
            }
        };
        loadData();
    }, []);

    const handleExport = async () => {
        if (!exportRef.current) return;
        try {
            // Temporarily make the export div visible for capturing
            const exportDiv = exportRef.current;
            const originalStyle = {
                opacity: exportDiv.style.opacity,
                transform: exportDiv.style.transform,
                position: exportDiv.style.position,
                top: exportDiv.style.top,
                left: exportDiv.style.left,
                zIndex: exportDiv.style.zIndex,
            };

            // Make it visible and properly positioned
            exportDiv.style.opacity = '1';
            exportDiv.style.transform = 'scale(1)';
            exportDiv.style.position = 'fixed';
            exportDiv.style.top = '-2000px'; // Move it off-screen but visible
            exportDiv.style.left = '0';
            exportDiv.style.zIndex = '9999';

            // Wait a bit for styles to apply
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(exportDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 1080,
                height: 1080,
                scrollX: 0,
                scrollY: 0,
            });

            // Restore original styles
            exportDiv.style.opacity = originalStyle.opacity;
            exportDiv.style.transform = originalStyle.transform;
            exportDiv.style.position = originalStyle.position;
            exportDiv.style.top = originalStyle.top;
            exportDiv.style.left = originalStyle.left;
            exportDiv.style.zIndex = originalStyle.zIndex;

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                setExportBlobUrl(url);

                const link = document.createElement('a');
                link.href = url;
                link.download = 'professional-banner.png';
                link.click();
            }, 'image/png');
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleMobileShare = async () => {
        if (!exportRef.current || !navigator.share) {
            alert('Sharing not supported on this browser.');
            return;
        }

        try {
            // Temporarily make the export div visible for capturing
            const exportDiv = exportRef.current;
            const originalStyle = {
                opacity: exportDiv.style.opacity,
                transform: exportDiv.style.transform,
                position: exportDiv.style.position,
                top: exportDiv.style.top,
                left: exportDiv.style.left,
                zIndex: exportDiv.style.zIndex,
            };

            // Make it visible and properly positioned
            exportDiv.style.opacity = '1';
            exportDiv.style.transform = 'scale(1)';
            exportDiv.style.position = 'fixed';
            exportDiv.style.top = '-2000px'; // Move it off-screen but visible
            exportDiv.style.left = '0';
            exportDiv.style.zIndex = '9999';

            // Wait a bit for styles to apply
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(exportDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 1080,
                height: 1080,
                scrollX: 0,
                scrollY: 0,
            });

            // Restore original styles
            exportDiv.style.opacity = originalStyle.opacity;
            exportDiv.style.transform = originalStyle.transform;
            exportDiv.style.position = originalStyle.position;
            exportDiv.style.top = originalStyle.top;
            exportDiv.style.left = originalStyle.left;
            exportDiv.style.zIndex = originalStyle.zIndex;

            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'banner.png', { type: 'image/png' });

                try {
                    await navigator.share({
                        title: 'Check out this banner',
                        text: 'Created using DG Sarthi Banner Maker',
                        files: [file],
                    });
                } catch (err) {
                    console.error('Share failed:', err);
                }
            }, 'image/png');
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const filteredTemplates = templates.filter((t) => {
        if (category === 'Greetings') {
            return t.category === 'Greetings' && (!subcategory || t.subcategory === subcategory);
        }
        return t.category === category;
    });

    // 1️⃣ Show Main Category Selection
    if (!category && !selectedTemplate) {
        return (
            <div className="container mx-auto p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center">Choose a Category</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {MAIN_CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className="bg-white p-4 sm:p-6 shadow rounded text-center hover:bg-gray-100 text-xs sm:text-sm font-medium min-h-[80px] sm:min-h-[100px] flex items-center justify-center"
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 2️⃣ Show Greetings Subcategories
    if (category === 'Greetings' && !subcategory && !selectedTemplate) {
        return (
            <div className="container mx-auto p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                    <Button onClick={() => setCategory(null)} variant="light" size={isMobile ? 'sm' : 'md'}>
                        ← Back
                    </Button>
                    <h2 className="text-lg sm:text-xl font-bold">Select a Subcategory</h2>
                    <div />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {GREETINGS_SUBCATEGORIES.map((subcat) => (
                        <button
                            key={subcat}
                            onClick={() => setSubcategory(subcat)}
                            className="bg-white p-4 sm:p-6 shadow rounded text-center hover:bg-gray-100 text-xs sm:text-sm font-medium min-h-[80px] sm:min-h-[100px] flex items-center justify-center"
                        >
                            {subcat}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 3️⃣ Show Banner Selection
    if (!selectedTemplate) {
        return (
            <div className="container mx-auto p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <Button
                        onClick={() => {
                            if (subcategory) setSubcategory(null);
                            else setCategory(null);
                        }}
                        variant="light"
                        size={isMobile ? 'sm' : 'md'}
                    >
                        ← Back
                    </Button>
                    <h2 className="text-lg sm:text-xl font-bold">{subcategory || category}</h2>
                    <div />
                </div>
                {filteredTemplates.length === 0 ? (
                    <p className="text-center text-gray-500">No banners found.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                        {filteredTemplates.map((tpl) => (
                            <div key={tpl.id} className="cursor-pointer group transform transition-all hover:scale-105">
                                <div className="aspect-square relative overflow-hidden rounded-lg shadow-md hover:shadow-xl" onClick={() => setSelectedTemplate(tpl)}>
                                    <img src={tpl.url} alt={`Template ${tpl.id}`} className="w-full h-full object-cover" />

                                    {(tpl.title || tpl.description) && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                                            <div className="truncate">{tpl.title || tpl.description}</div>
                                        </div>
                                    )}

                                    {/* Hover Overlay - Hidden on mobile, visible on desktop */}
                                    <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hidden sm:flex">
                                        <Button className="bg-white text-black hover:bg-gray-100" size="sm">
                                            Use Template
                                        </Button>
                                    </div>

                                    {/* Mobile tap indicator */}
                                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 sm:hidden">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 4️⃣ Banner Preview + Export
    return (
        <div className="container mx-auto p-4 sm:p-6">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end mb-4 gap-2 sm:gap-0">
                <Button onClick={() => setSelectedTemplate(null)} className="mr-0 sm:mr-4 bg-gray-100 text-gray-700 hover:bg-gray-200" size={isMobile ? 'sm' : 'md'}>
                    ← Back to Templates
                </Button>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExport}
                        className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white hover:from-blue-600 hover:via-indigo-700 hover:to-purple-800 flex-1 sm:flex-none"
                        size={isMobile ? 'sm' : 'md'}
                    >
                        Export Banner
                    </Button>
                    <Button onClick={handleMobileShare} className="bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-none" size={isMobile ? 'sm' : 'md'}>
                        Share via WhatsApp
                    </Button>
                </div>
            </div>

            {/* Banner Preview Container */}
            <div className="flex justify-center">
                <div className="relative w-full max-w-[500px] sm:max-w-[600px] lg:max-w-[800px] xl:max-w-[1080px]">
                    {/* Hidden export div with fixed dimensions */}
                    <div
                        ref={exportRef}
                        className="absolute -top-[2000px] left-0 w-[1080px] h-[1080px] bg-white rounded-lg overflow-hidden shadow-lg pointer-events-none opacity-0"
                        style={{ transform: 'scale(0.1)', transformOrigin: 'top left' }}
                    >
                        <img src={selectedTemplate.url} alt="Selected Template" className="absolute w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 to-black/40 text-white p-6 flex items-center space-x-6">
                            <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                                {logoPreview && <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />}
                            </div>
                            <div className="flex-grow">
                                <h2 className="text-2xl font-bold">{company.companyName}</h2>
                                <p className="text-sm">GST: {company.gst}</p>
                                <p className="text-sm">{company.regAddress}</p>
                            </div>
                            <div className="text-right text-sm space-y-1">
                                <p>{company.contactEmail}</p>
                                <p>{company.phone1}</p>
                                {company.phone2 && <p>{company.phone2}</p>}
                                {company.website && <p>{company.website}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Visible responsive preview */}
                    <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
                        <img src={selectedTemplate.url} alt="Selected Template" className="absolute w-full h-full object-cover" />

                        {/* Responsive overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 to-black/40 text-white p-3 sm:p-4 lg:p-6">
                            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                                {/* Logo */}
                                <div className="w-8 h-8 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {logoPreview && <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />}
                                </div>

                                {/* Company Info */}
                                <div className="flex flex-col justify-center flex-grow min-w-[0]">
                                    <h2 className="text-[10px] sm:text-base lg:text-lg font-semibold leading-tight whitespace-normal">{company.companyName}</h2>
                                    <p className="text-[8px] sm:text-xs lg:text-sm leading-tight">GST: {company.gst}</p>
                                    <p className="text-[8px] sm:text-xs lg:text-sm leading-tight">{company.regAddress}</p>
                                </div>

                                {/* Contact Info */}
                                <div className="flex flex-col items-end text-[8px] sm:text-xs lg:text-sm leading-tight flex-shrink-0">
                                    {company.contactEmail && <p className="truncate max-w-[150px] sm:max-w-none">{company.contactEmail}</p>}
                                    {company.phone1 && <p>{company.phone1}</p>}
                                    {company.phone2 && <p>{company.phone2}</p>}
                                    {company.website && <p className="truncate max-w-[150px] sm:max-w-none">{company.website}</p>}
                                </div>
                            </div>

                            {/* Mobile contact info below */}
                            {/* <div className="mt-2 text-xs space-y-1 sm:hidden">
                <p className="truncate">{company.contactEmail}</p>
                <div className="flex justify-between">
                  <span>{company.phone1}</span>
                  {company.phone2 && <span>{company.phone2}</span>}
                </div>
                {company.website && <p className="truncate">{company.website}</p>}
              </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalBannerMaker;
