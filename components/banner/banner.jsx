'use client';
import React, { useState, useRef } from 'react';
import { Button } from '@mantine/core';
import html2canvas from 'html2canvas';

const ProfessionalBannerMaker = () => {
  const dummyData = {
    name: 'Digital Gyani',
    title: 'AMFI-Registered Mutual Fund Distributor',
    company: 'ArthMitra Gurukulam',
    email: ['yogitraining.video@gmail.com'],
    phone: ['9818122533', '9818122534'],
    logo: '/assets/images/logo.svg', // Replace with your logo path
    website: 'www.example.com',
  };

  const templates = {
    '2025': '/assets/images/2025.png',
    'republic': '/assets/images/republic.png',
    'finone' : '/assets/images/finone.png',
    'fintwo' : '/assets/images/fintwo.png',
    'fplan'  : '/assets/images/fplan.png',
    'father' : '/assets/images/father.png',
    'jack'   : '/assets/images/jack.png',
    'edu'    : '/assets/images/edu.png'
  };

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const exportRef = useRef(null);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
  };

  const handleExport = async () => {
    const element = exportRef.current;

    try {
      const canvas = await html2canvas(element, {
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
          <p className="text-gray-600">Select a template for your banner</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(templates).map(([id, path]) => (
            <div
              key={id}
              onClick={() => handleTemplateSelect(id)}
              className="cursor-pointer transform transition-all hover:scale-105"
            >
              <div className="aspect-square relative overflow-hidden rounded-lg shadow-md hover:shadow-xl">
                <img
                  src={path}
                  alt={`Template ${id}`}
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
        {/* Template Background */}
        <img
          src={templates[selectedTemplate]}
          alt="Selected Template"
          className="absolute w-full h-full object-cover"
        />

        {/* Information Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 to-black/40 text-white p-6 flex items-center space-x-6">
          {/* Logo */}
          <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={dummyData.logo}
              alt="Company Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* User Information */}
          <div className="flex-grow">
            <h2 className="text-2xl font-bold">{dummyData.name}</h2>
            <p className="text-lg font-medium">{dummyData.title}</p>
            <p className="text-sm">{dummyData.company}</p>
          </div>

          {/* Contact Details */}
          <div className="text-right text-sm space-y-1">
            {dummyData.email.map((email, index) => (
              <p key={index}>{email}</p>
            ))}
            {dummyData.phone.map((phone, index) => (
              <p key={index}>{phone}</p>
            ))}
            <p>{dummyData.website}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalBannerMaker;
