'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '@mantine/core';
import html2canvas from 'html2canvas';
import { getAuth } from 'firebase/auth';

const ProfessionalBannerMaker = () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const exportRef = useRef(null);

  // Company data
  const [company, setCompany] = useState({
    companyName: '',
    gst: '',
    regAddress: '',
    contactEmail: '',
    phone1: '',
    phone2: '',
    website: ''
  });
  const [logoPreview, setLogoPreview] = useState('');

  // Banner templates from Superadmin
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch company details and templates
  useEffect(() => {

    const loadData = async () => {
      try {
        const auth = getAuth();
        const token =  await auth.currentUser.getIdToken();
        // Load company
        const { data: comp } = await axios.get(
          `${API_URL}/api/companies/user`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCompany({
          companyName: comp.name || '',
          gst: comp.gst_number || '',
          regAddress: comp.address || '',
          contactEmail: comp.billing_email || '',
          phone1: comp.phone_1 || '',
          phone2: comp.phone_2 || '',
          website: comp.website || ''
        });
        if (comp.logo_url) setLogoPreview(comp.logo_url);

        // Load banners
        const { data: banners } = await axios.get(
          `${API_URL}/api/banners`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTemplates(banners);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  const handleTemplateSelect = (banner) => setSelectedTemplate(banner);

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        width: 1080,
        height: 1080,
      });
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'professional-banner.png';
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!selectedTemplate) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Choose a Template</h1>
          <p className="text-gray-600">Select a banner design</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleTemplateSelect(tpl)}
              className="cursor-pointer transform transition-all hover:scale-105"
            >
              <div className="aspect-square relative overflow-hidden rounded-lg shadow-md hover:shadow-xl">
                <img
                  src={tpl.url}
                  alt={`Template ${tpl.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button className="bg-white text-black hover:bg-gray-100">
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setSelectedTemplate(null)}
          className="mr-4 bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          ← Back to Templates
        </Button>
        <Button
          onClick={handleExport}
          className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white hover:from-blue-600 hover:via-indigo-700 hover:to-purple-800"
        >
          Export Banner
        </Button>
      </div>

      <div
        ref={exportRef}
        id="banner-export"
        className="relative w-[1080px] h-[1080px] bg-white rounded-lg overflow-hidden shadow-lg mx-auto"
      >
        {/* Background */}
        <img
          src={selectedTemplate.url}
          alt="Selected Template"
          className="absolute w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 to-black/40 text-white p-6 flex items-center space-x-6">
          {/* Logo */}
          <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden">
            {logoPreview && <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />}
          </div>

          {/* Company Info */}
          <div className="flex-grow">
            <h2 className="text-2xl font-bold">{company.companyName}</h2>
            <p className="text-sm">GST: {company.gst}</p>
            <p className="text-sm">{company.regAddress}</p>
          </div>

          {/* Contact Details */}
          <div className="text-right text-sm space-y-1">
            <p>{company.contactEmail}</p>
            <p>{company.phone1}</p>
            {company.phone2 && <p>{company.phone2}</p>}
            {company.website && <p>{company.website}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalBannerMaker;
