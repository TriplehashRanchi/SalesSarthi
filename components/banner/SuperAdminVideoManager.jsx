'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Button, FileInput, TextInput, Select, Notification, Switch, Textarea,
  Badge, Card, Text, Group, ActionIcon, SimpleGrid, Progress, Modal
} from '@mantine/core';
import { IconVideo, IconCheck, IconX, IconTrash, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
// 1. Import the new dedicated video hook
import { useVideoCloudinaryUpload } from '@/utils/useVideoCloudinaryUpload';
import { useR2Upload } from '../../utils/useR2Upload';
import VideoThumbnail from './VideoThumbnail';

const SuperAdminVideoManager = () => {
  const [videos, setVideos] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryModalOpened, setCategoryModalOpened] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [subcategory, setSubcategory] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [newSubcategory, setNewSubcategory] = useState('');
  const [subcategoryModalOpened, setSubcategoryModalOpened] = useState(false);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState('');

  // 2. Use the video-specific hook with progress tracking
  const { uploadFile, uploading, progress } = useR2Upload();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banner-categories`, {
        params: { type: 'video' },
      });
      setCategories((response.data || []).map((item) => item.name));
    } catch (error) {
      console.error('Error fetching video categories:', error);
    }
  }, [API_URL]);

  const fetchSubcategories = useCallback(async (categoryName) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/banner-subcategories`, {
        params: { type: 'video', category: categoryName },
      });
      setSubcategories((response.data || []).map((item) => item.name));
    } catch (error) {
      console.error('Error fetching video subcategories:', error);
      setSubcategories([]);
    }
  }, [API_URL]);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners/video`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchVideos();
    fetchCategories();
  }, [fetchVideos, fetchCategories]);

  useEffect(() => {
    setSubcategory('');
    fetchSubcategories(category);
  }, [category, fetchSubcategories]);

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
        type: 'video',
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

  const handleCreateSubcategory = async () => {
    const trimmedName = newSubcategory.trim();

    if (!category) {
      setMessage('Please select a category first.');
      return;
    }

    if (!trimmedName) {
      setMessage('Please enter a subcategory name.');
      return;
    }

    setSubcategoryLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/banner-subcategories`, {
        name: trimmedName,
        type: 'video',
        category,
      });

      const createdName = response.data?.name || trimmedName;
      await fetchSubcategories(category);
      setSubcategory(createdName);
      setNewSubcategory('');
      setSubcategoryModalOpened(false);
      setMessage('Subcategory created successfully!');
    } catch (error) {
      console.error('Subcategory creation failed:', error);
      setMessage(error.response?.data?.message || 'Subcategory creation failed.');
    } finally {
      setSubcategoryLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !category) {
        setMessage('Please select a file and a category.');
        return;
    }
    setMessage('');

    try {
      // 3. Call uploadVideo (using the XHR-based progress hook)
      const url = await uploadFile(file);
      
      await axios.post(`${API_URL}/api/banners/video`, {
        url,
        title,
        description,
        category,
        subcategory: subcategory || null,
        is_active: isActive,
      });

      await fetchVideos();
      setMessage('Video banner uploaded successfully!');
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
    setNewSubcategory('');
    setCategoryModalOpened(false);
    setSubcategoryModalOpened(false);
    setIsActive(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await axios.delete(`${API_URL}/api/banners/video/${id}`);
      await fetchVideos();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Superadmin Video Manager</h1>

      <Modal
        opened={categoryModalOpened}
        onClose={() => {
          if (!categoryLoading) {
            setCategoryModalOpened(false);
            setNewCategory('');
          }
        }}
        title="Create Video Category"
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

      <Modal
        opened={subcategoryModalOpened}
        onClose={() => {
          if (!subcategoryLoading) {
            setSubcategoryModalOpened(false);
            setNewSubcategory('');
          }
        }}
        title="Create Video Subcategory"
        centered
      >
        <div className="space-y-4">
          <TextInput
            label="Category"
            value={category}
            disabled
          />
          <TextInput
            data-autofocus
            label="Subcategory Name"
            placeholder="e.g. Monsoon Campaign"
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSubcategory();
            }}
            disabled={subcategoryLoading}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="subtle"
              disabled={subcategoryLoading}
              onClick={() => {
                setSubcategoryModalOpened(false);
                setNewSubcategory('');
              }}
            >
              Cancel
            </Button>
            <Button loading={subcategoryLoading} onClick={handleCreateSubcategory}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Card shadow="sm" p="lg" radius="md" withBorder className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-blue-600">Upload New Video Banner</h2>
        <div className="space-y-4">
            <FileInput
                label="Select Video File"
                placeholder="Upload MP4/MOV (Max 50MB)"
                icon={<IconVideo size={16} />}
                accept="video/*"
                onChange={setFile}
                disabled={uploading}
                required
            />

            {/* 4. Show Progress Bar during upload */}
               {/* VISUAL PROGRESS BAR */}
    {uploading && (
        <div className="mt-2">
            <Group position="apart" mb={5}>
                <Text size="xs" weight={700}>{progress}% Uploaded</Text>
                <Text size="xs" color="dimmed">Please do not close this page</Text>
            </Group>
            <Progress 
                value={progress} 
                size="xl" 
                radius="xl" 
                striped 
                animated 
                color="blue"
            />
        </div>
    )}

            {file && !uploading && (
                <Text size="xs" color="dimmed">
                    Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </Text>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                    label="Video Title"
                    placeholder="e.g. Morning Greeting Video"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                />
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <Select
                        label="Category"
                        placeholder="Select category"
                        data={categories}
                        value={category}
                        onChange={setCategory}
                        required
                        disabled={uploading}
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
            </div>

            {category && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <Select
                    label="Subcategory"
                    placeholder={subcategories.length ? 'Select subcategory' : 'No subcategories yet'}
                    data={subcategories}
                    value={subcategory}
                    onChange={setSubcategory}
                    clearable
                    disabled={uploading}
                />
                <Button
                    variant="light"
                    leftIcon={<IconPlus size={16} />}
                    disabled={uploading}
                    onClick={() => setSubcategoryModalOpened(true)}
                >
                    New subcategory
                </Button>
                </div>
            )}

            <Textarea
                label="Description"
                placeholder="Brief description of the video"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
            />

            <Switch
                label="Is Active?"
                checked={isActive}
                onChange={(event) => setIsActive(event.currentTarget.checked)}
                disabled={uploading}
            />

            <Button 
        fullWidth 
        size="md"
        loading={uploading} 
        onClick={handleUpload}
        leftIcon={<IconVideo size={18}/>}
        color={uploading ? "blue" : "teal"}
    >
        {uploading ? `Uploading... ${progress}%` : 'Upload Video Banner'}
    </Button>

            {message && (
                <Notification
                    icon={message.includes('success') ? <IconCheck /> : <IconX />}
                    color={message.includes('success') ? 'teal' : 'red'}
                    onClose={() => setMessage('')}
                >
                    {message}
                </Notification>
            )}
        </div>
      </Card>

      {/* Video Gallery */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Existing Video Banners ({videos.length})</h2>
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 1 }, { maxWidth: 'md', cols: 2 }]}>
        {videos.map((video) => {
  // CLOUDINARY MAGIC: Replace .mp4/.mov with .jpg to get a static thumbnail
  const thumbnailUrl = video.url.replace(/\.[^/.]+$/, ".jpg");

  return (
    <Card key={video.id} shadow="sm" p="sm" radius="md" withBorder>
      <Card.Section className="relative">
        {/* 1. Use an <img> instead of <video> to save bandwidth */}
       <VideoThumbnail
  src={video.url}
  className="w-full h-48 object-cover bg-gray-200"
/>
        
        {/* 2. Overlay a Play Icon so admin knows it's a video */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group">
             <ActionIcon 
                variant="filled" 
                color="white" 
                radius="xl" 
                size="lg"
                component="a" 
                href={video.url} 
                target="_blank"
             >
                <IconPlayerPlay size={24} color="black" />
             </ActionIcon>
        </div>

        <div className="absolute top-2 right-2">
            <Badge color={video.is_active ? 'green' : 'gray'}>
                {video.is_active ? 'Active' : 'Inactive'}
            </Badge>
        </div>
      </Card.Section>

      <Group position="apart" mt="md" mb="xs">
        <Text weight={600} size="sm" className="truncate flex-1">
            {video.title || 'Untitled Video'}
        </Text>
        <ActionIcon color="red" variant="light" onClick={() => handleDelete(video.id)}>
            <IconTrash size={16} />
        </ActionIcon>
      </Group>

      <div className="flex justify-between items-center">
        <Text size="xs" color="dimmed">
            {video.category}
        </Text>
        {/* Link to actual video for checking */}
        <Button 
            variant="subtle" 
            size="xs" 
            compact 
            component="a" 
            href={video.url} 
            target="_blank"
        >
            View Video
        </Button>
      </div>
    </Card>
  );
})}
        </SimpleGrid>
      </div>
    </div>
  );
};

export default SuperAdminVideoManager;
