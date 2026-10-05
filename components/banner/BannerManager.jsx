'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Button, FileInput, TextInput, Select, Notification, Switch, Textarea,
  Badge, Modal
} from '@mantine/core';
import { IconUpload, IconCheck, IconX, IconTrash, IconPlus } from '@tabler/icons-react';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload';

const SuperAdminBannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryModalOpened, setCategoryModalOpened] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [subcategory, setSubcategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState('');

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

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banner-categories`, {
        params: { type: 'image' },
      });
      setCategories((response.data || []).map((item) => item.name));
    } catch (error) {
      console.error('Error fetching image categories:', error);
    }
  }, [API_URL]);

  // Fetch existing banners
  const fetchBanners = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchBanners();
    fetchCategories();
  }, [fetchBanners, fetchCategories]);

  const handleCreateCategory = async () => {
    const trimmedName = newCategory.trim();

    if (!trimmedName) {
      setMessage('Please enter a category name.');
      return;
    }

    setCategoryLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/banner-categories`, {
        name: trimmedName,
        type: 'image',
      });

      const createdName = response.data?.name || trimmedName;
      await fetchCategories();
      setCategory(createdName);
      setNewCategory('');
      setCategoryModalOpened(false);
      setMessage('Category created successfully!');
    } catch (error) {
      console.error('Category creation failed:', error);
      setMessage(error.response?.data?.message || 'Category creation failed.');
    } finally {
      setCategoryLoading(false);
    }
  };

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
    setNewCategory('');
    setCategoryModalOpened(false);
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

      <Modal
        opened={categoryModalOpened}
        onClose={() => {
          if (!categoryLoading) {
            setCategoryModalOpened(false);
            setNewCategory('');
          }
        }}
        title="Create Image Category"
        centered
      >
        <div className="space-y-4">
          <TextInput
            data-autofocus
            label="Category Name"
            placeholder="e.g. Festival Campaign"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateCategory();
            }}
            disabled={categoryLoading}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="subtle"
              disabled={categoryLoading}
              onClick={() => {
                setCategoryModalOpened(false);
                setNewCategory('');
              }}
            >
              Cancel
            </Button>
            <Button loading={categoryLoading} onClick={handleCreateCategory}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <Select
            label="Category"
            placeholder="Select category"
            data={categories}
            value={category}
            onChange={setCategory}
            required
          />
          <Button
            variant="light"
            leftIcon={<IconPlus size={16} />}
            disabled={uploading}
            onClick={() => setCategoryModalOpened(true)}
          >
            New category
          </Button>
        </div>

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
