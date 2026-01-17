    'use client';

    import React, { useEffect, useState } from 'react';
    import axios from 'axios';
    import { Button, Card, Text, Badge } from '@mantine/core';
    import { Capacitor } from '@capacitor/core';
    import {
    handleVideoDownload,
    handleVideoShare,
    } from '@/utils/videoDownloadUtils';
import VideoThumbnail from './VideoThumbnail';

    /* ------------------ CATEGORIES ------------------ */

    const MAIN_CATEGORIES = [
    'Facebook Ads',
    'Daily Motivation',
    'Recruitment',
    'Life Insurance',
    'Health Insurance',
    'Motor Insurance',
    'Mutual Fund',
    'Greetings',
    ];

    const CATEGORY_ICONS = {
    'Facebook Ads': '📢',
    'Daily Motivation': '💡',
    'Recruitment': '📚',
    'Life Insurance': '🧬',
    'Health Insurance': '🏥',
    'Motor Insurance': '🚗',
    'Mutual Fund': '💰',
    'Greetings': '🎉',
    };

    const GREETINGS_SUBCATEGORIES = [
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

    const GREETINGS_ICONS = {
    'Good Morning': '🌅',
    'Good Night': '🌙',
    'Congratulations': '🎊',
    'Birthday': '🎂',
    'Anniversary': '💞',
    'Thank You': '🙏',
    'Reminder': '⏰',
    'Special Days': '📅',
    'Quote': '📝',
    'Sorry': '😔',
    'RIP': '🕊️',
    'General': '📨',
    };

    /* ------------------ COMPONENT ------------------ */

    const VideoBannerManager = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const [videos, setVideos] = useState([]);
    const [category, setCategory] = useState(null);
    const [subcategory, setSubcategory] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ------------------ FETCH ------------------ */

    const fetchVideos = async () => {
        try {
        const res = await axios.get(`${API_URL}/api/banners/video`);
        setVideos(res.data || []);
        } catch (err) {
        console.error('Failed to fetch videos', err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    /* ------------------ FILTER ------------------ */

    const getVideoThumbnail = (videoUrl) => {
  return videoUrl.replace(/\.[^/.]+$/, '.jpg');
};


    const filteredVideos = videos.filter((v) => {
        if (category === 'Greetings') {
        return (
            v.category === 'Greetings' &&
            (!subcategory || v.subcategory === subcategory)
        );
        }
        return v.category === category;
    });

    /* ------------------ STEP 1: MAIN CATEGORY ------------------ */

    if (!category) {
        return (
        <div className="container mx-auto p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-6 text-center">
            Choose a Video Category
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {MAIN_CATEGORIES.map((cat) => (
                <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="bg-white p-5 shadow rounded text-center hover:bg-gray-100 flex flex-col items-center justify-center"
                >
                <div className="text-3xl mb-1">{CATEGORY_ICONS[cat]}</div>
                <span className="text-sm font-medium">{cat}</span>
                </button>
            ))}
            </div>
        </div>
        );
    }

    /* ------------------ STEP 2: GREETINGS SUBCATEGORY ------------------ */

    if (category === 'Greetings' && !subcategory) {
        return (
        <div className="container mx-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
            <Button variant="light" onClick={() => setCategory(null)}>
                ← Back
            </Button>
            <h2 className="text-lg sm:text-xl font-bold">Select Subcategory</h2>
            <div />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {GREETINGS_SUBCATEGORIES.map((sub) => (
                <button
                key={sub}
                onClick={() => setSubcategory(sub)}
                className="bg-white p-5 shadow rounded text-center hover:bg-gray-100 flex flex-col items-center justify-center"
                >
                <div className="text-3xl mb-1">{GREETINGS_ICONS[sub]}</div>
                <span className="text-sm font-medium">{sub}</span>
                </button>
            ))}
            </div>
        </div>
        );
    }

    /* ------------------ STEP 3: VIDEO LIST ------------------ */

    return (
        <div className="container mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
            <Button
            variant="light"
            onClick={() => {
                if (subcategory) setSubcategory(null);
                else setCategory(null);
            }}
            >
            ← Back
            </Button>
            <h2 className="text-lg sm:text-xl font-bold">
            {subcategory || category}
            </h2>
            <div />
        </div>

        {loading && <p className="text-center text-gray-500">Loading…</p>}

        {!loading && filteredVideos.length === 0 && (
            <p className="text-center text-gray-500">No videos found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
            <Card key={video.id} withBorder shadow="sm">
                <div className="flex justify-between items-start mb-2">
                <Text size="sm" weight={600} lineClamp={2}>
                    {video.title || 'Untitled Video'}
                </Text>
                <Badge color={video.is_active ? 'green' : 'gray'}>
                    {video.is_active ? 'Active' : 'Inactive'}
                </Badge>
                </div>

                <Text size="xs" color="dimmed" mb="sm">
                {video.category}
                {video.subcategory ? ` • ${video.subcategory}` : ''}
                </Text>

                {/* NO VIDEO RENDERING */}
               <div className="relative w-full h-40 rounded overflow-hidden mb-3 bg-gray-200">
 <VideoThumbnail
    src={video.url}
    className="w-full h-40 object-cover bg-gray-200"
/>
  {/* Play icon overlay (visual cue only) */}
  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-lg">
      ▶️
    </div>
  </div>
</div>


                <div className="flex gap-2">
                <Button
                    fullWidth
                    size="xs"
                    variant="light"
                    onClick={() => handleVideoDownload(video.url)}
                >
                    Download
                </Button>

                {Capacitor.isNativePlatform() && (
                    <Button
                    fullWidth
                    size="xs"
                    color="green"
                    onClick={() => handleVideoShare(video.url)}
                    >
                    Share
                    </Button>
                )}
                </div>
            </Card>
            ))}
        </div>
        </div>
    );
    };

    export default VideoBannerManager;
