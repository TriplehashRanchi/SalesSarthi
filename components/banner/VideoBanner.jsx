    'use client';

    import React, { useEffect, useState } from 'react';
    import axios from 'axios';
    import { Button, Card, Text, Badge, ActionIcon } from '@mantine/core';
    import { IconArrowLeft } from '@tabler/icons-react';
    import { useRouter } from 'next/navigation';
    import { Capacitor } from '@capacitor/core';
    import {
    handleVideoDownload,
    handleVideoShare,
    } from '@/utils/videoDownloadUtils';

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

    // Soft tints for the category and subcategory tiles.
    const TILE_STYLES = [
    'bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-300',
    'bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-300',
    'bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-300',
    'bg-pink-50 border-pink-100 hover:bg-pink-100 hover:border-pink-300',
    'bg-teal-50 border-teal-100 hover:bg-teal-100 hover:border-teal-300',
    'bg-orange-50 border-orange-100 hover:bg-orange-100 hover:border-orange-300',
    'bg-green-50 border-green-100 hover:bg-green-100 hover:border-green-300',
    'bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-300',
    ];

    const TILE_BASE = 'flex min-h-[116px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:translate-y-0 active:scale-95 sm:min-h-[140px] sm:p-6';

    const Tile = ({ icon, label, index, onClick }) => (
    <button onClick={onClick} className={`${TILE_BASE} ${TILE_STYLES[index % TILE_STYLES.length]}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl sm:h-14 sm:w-14 sm:text-3xl">{icon}</div>
        <span>{label}</span>
    </button>
    );

    const PageHeader = ({ title, subtitle, onBack, backOnDesktop = true }) => (
    <div className="mb-5 flex items-center gap-2 sm:mb-8">
        <ActionIcon className={backOnDesktop ? '' : 'md:hidden'} variant="subtle" color="dark" onClick={onBack} aria-label="Back">
        <IconArrowLeft size={22} />
        </ActionIcon>
        <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
    </div>
    );

    const VideoBannerManager = () => {
    const router = useRouter();
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
            <PageHeader title="Choose a Video Category" subtitle="Pick a type to find your videos" onBack={() => router.back()} backOnDesktop={false} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4">
            {MAIN_CATEGORIES.map((cat, i) => (
                <Tile key={cat} icon={CATEGORY_ICONS[cat]} label={cat} index={i} onClick={() => setCategory(cat)} />
            ))}
            </div>
        </div>
        );
    }

    /* ------------------ STEP 2: GREETINGS SUBCATEGORY ------------------ */

    if (category === 'Greetings' && !subcategory) {
        return (
        <div className="container mx-auto p-4 sm:p-6">
            <PageHeader title="Greetings" subtitle="Select a subcategory" onBack={() => setCategory(null)} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4">
            {GREETINGS_SUBCATEGORIES.map((sub, i) => (
                <Tile key={sub} icon={GREETINGS_ICONS[sub]} label={sub} index={i} onClick={() => setSubcategory(sub)} />
            ))}
            </div>
        </div>
        );
    }

    /* ------------------ STEP 3: VIDEO LIST ------------------ */

    return (
        <div className="container mx-auto p-4 sm:p-6">
        <PageHeader
            title={subcategory || category}
            subtitle={`${filteredVideos.length} ${filteredVideos.length === 1 ? 'video' : 'videos'}`}
            onBack={() => {
            if (subcategory) setSubcategory(null);
            else setCategory(null);
            }}
        />

        {loading && <p className="text-center text-gray-500">Loading…</p>}

        {!loading && filteredVideos.length === 0 && (
            <p className="text-center text-gray-500">No videos found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
            <Card key={video.id} withBorder shadow="sm" radius="lg">
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

                {/* Light preview: the compressed copy when available, otherwise just the first frame of the original. */}
                <div className="relative w-full h-40 rounded overflow-hidden mb-3 bg-black">
                    <video
                        className="w-full h-full object-contain"
                        src={video.preview_url ? video.preview_url : `${video.url}#t=0.5`}
                        preload="metadata"
                        controls
                        playsInline
                    />
                </div>
                <Text size="xs" color="dimmed" mb="xs">
                    {video.preview_url ? 'Light preview. Download keeps the original quality and size of the video, in a smaller file.' : 'Download keeps the original quality of the video.'}
                </Text>

                <div className="flex gap-2">
                <Button
                    fullWidth
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={() => handleVideoDownload(video)}
                >
                    Download
                </Button>

                {Capacitor.isNativePlatform() && (
                    <Button
                    fullWidth
                    size="xs"
                    color="green"
                    onClick={() => handleVideoShare(video)}
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
