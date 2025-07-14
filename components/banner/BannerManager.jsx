'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button, FileInput, TextInput, Select, Notification, Switch, Textarea,
  Badge
} from '@mantine/core';
import { IconUpload, IconCheck, IconX, IconTrash } from '@tabler/icons-react';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload';

const SuperAdminBannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState('');

  const categories = [
    'Facebook Ads',
    'Daily Motivation',
    'Concepts',
    'Life Insurance',
    'Health Insurance',
    'Motor Insurance',
    'Mutual Fund',
    'Greetings',
  ];

  const greetingsSubcategories = [
    'Good Morning',
    'Good Night',
    'Congratulations',
    'Birthday',
    'Anniversary',
    'Thank You',
    'Reminder',
    'Special Days',
    'Quote',
    'Sorry',
    'RIP',
    'General',
  ];

  const { upload, uploading } = useCloudinaryUpload();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch existing banners
  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Upload banner to Cloudinary and save metadata
  const handleUpload = async () => {
    if (!file || !category) return;
    setMessage('');

    try {
      const url = await upload(file);
      await axios.post(`${API_URL}/api/banners`, {
        url,
        title,
        description,
        category,
        subcategory: category === 'Greetings' ? subcategory : null,
        is_active: isActive,
      });

      await fetchBanners();
      setMessage('Banner uploaded successfully!');
      resetForm();
    } catch (err) {
      console.error('Upload failed:', err);
      setMessage('Upload failed.');
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setSubcategory('');
    setIsActive(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/banners/${id}`);
      await fetchBanners();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Superadmin Banner Manager</h1>

      {/* Upload Section */}
      <div className="bg-white p-4 rounded shadow mb-8 space-y-4">
        <h2 className="text-lg font-semibold">Upload New Banner</h2>

        <FileInput
          placeholder="Upload image file"
          icon={<IconUpload size={16} />}
          onChange={setFile}
          required
        />

        <TextInput
          label="Banner Title (optional)"
          placeholder="Enter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          label="Description (optional)"
          placeholder="Add a short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Select
          label="Category"
          placeholder="Select category"
          data={categories}
          value={category}
          onChange={setCategory}
          required
        />

        {category === 'Greetings' && (
          <Select
            label="Subcategory"
            placeholder="Select subcategory"
            data={greetingsSubcategories}
            value={subcategory}
            onChange={setSubcategory}
            required
          />
        )}

        <Switch
          label="Banner Active?"
          checked={isActive}
          onChange={(event) => setIsActive(event.currentTarget.checked)}
        />

        <Button loading={uploading} onClick={handleUpload}>
          Upload Banner
        </Button>

        {message && (
          <Notification
            icon={message.includes('success') ? <IconCheck /> : <IconX />}
            color={message.includes('success') ? 'teal' : 'red'}
            title={message.includes('success') ? 'Success' : 'Error'}
          >
            {message}
          </Notification>
        )}
      </div>

      {/* Banner Gallery */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Banners</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="relative aspect-square overflow-hidden rounded shadow group">
              <img src={banner.url} alt={`Banner`} className="w-full h-full object-cover" />

              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {banner.category} {banner.subcategory ? `> ${banner.subcategory}` : ''}
              </div>

              {banner.title && (
                <div className="absolute top-1 left-1 bg-white text-black text-[10px] px-2 py-1 rounded shadow">
                  {banner.title}
                </div>
              )}

              <div className="absolute bottom-1 right-1">
                <Badge size="xs" color={banner.is_active ? 'green' : 'gray'}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <Button
                onClick={() => handleDelete(banner.id)}
                size="xs"
                color="red"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                compact
              >
                <IconTrash size={16} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminBannerManager;
