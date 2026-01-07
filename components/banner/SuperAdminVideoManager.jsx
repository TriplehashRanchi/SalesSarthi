'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button, FileInput, TextInput, Select, Notification, Switch, Textarea,
  Badge, Card, Text, Group, ActionIcon, SimpleGrid, Progress
} from '@mantine/core';
import { IconVideo, IconCheck, IconX, IconTrash, IconPlayerPlay } from '@tabler/icons-react';
// 1. Import the new dedicated video hook
import { useVideoCloudinaryUpload } from '@/utils/useVideoCloudinaryUpload';

const SuperAdminVideoManager = () => {
  const [videos, setVideos] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState('');

  const categories = [
    'Facebook Ads', 'Daily Motivation', 'Recruitment', 'Life Insurance',
    'Health Insurance', 'Motor Insurance', 'Mutual Fund', 'Greetings',
  ];

  const greetingsSubcategories = [
    'Good Morning', 'Good Night', 'Congratulations', 'Birthday', 
    'Anniversary', 'Thank You', 'Reminder', 'Special Days', 
    'Quote', 'Sorry', 'RIP', 'General',
  ];

  // 2. Use the video-specific hook with progress tracking
  const { uploadVideo, uploading, progress } = useVideoCloudinaryUpload();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners/video`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleUpload = async () => {
    if (!file || !category) {
        setMessage('Please select a file and a category.');
        return;
    }
    setMessage('');

    try {
      // 3. Call uploadVideo (using the XHR-based progress hook)
      const url = await uploadVideo(file);
      
      await axios.post(`${API_URL}/api/banners/video`, {
        url,
        title,
        description,
        category,
        subcategory: category === 'Greetings' ? subcategory : null,
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
                <Select
                    label="Category"
                    placeholder="Select category"
                    data={categories}
                    value={category}
                    onChange={setCategory}
                    required
                    disabled={uploading}
                />
            </div>

            {category === 'Greetings' && (
                <Select
                    label="Subcategory"
                    placeholder="Select subcategory"
                    data={greetingsSubcategories}
                    value={subcategory}
                    onChange={setSubcategory}
                    required
                    disabled={uploading}
                />
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
        <img 
            src={thumbnailUrl} 
            alt={video.title}
            className="w-full h-48 object-cover bg-gray-200"
            loading="lazy" 
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