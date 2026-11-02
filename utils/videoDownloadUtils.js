import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/* ------------------ helpers ------------------ */

const fetchVideoBlob = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch video');
  return await res.blob();
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/* ------------------ download (original quality) ------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// The API streams the original file as an attachment, so the browser never needs cross-origin access to R2.
const downloadUrlFor = (video) => `${API_URL}/api/banners/video/${video.id}/download`;

export const downloadVideoWeb = (video) => {
  const a = document.createElement('a');
  a.href = downloadUrlFor(video);
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadVideoMobile = async (video) => {
  // Native download: streams straight to disk, no base64 round-trip through memory.
  await Filesystem.downloadFile({
    url: downloadUrlFor(video),
    path: `video-banner-${video.id}-${Date.now()}.mp4`,
    directory: Directory.Documents,
  });
  alert('Video saved to your device');
};

export const shareVideoMobile = async (video) => {
  const blob = await fetchVideoBlob(downloadUrlFor(video));
  const base64 = await blobToBase64(blob);

  const filename = `video-banner-${Date.now()}.mp4`;

  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: filename,
    directory: Directory.Cache,
  });

  await Share.share({
    text: 'Created using DG Sarthi',
    files: [uri],
    dialogTitle: 'Share Video Banner',
  });
};

/* ------------------ unified ------------------ */

export const handleVideoDownload = async (video) => {
  if (Capacitor.isNativePlatform()) {
    await downloadVideoMobile(video);
  } else {
    downloadVideoWeb(video);
  }
};

export const handleVideoShare = async (video) => {
  if (!Capacitor.isNativePlatform()) {
    alert('Sharing supported only on mobile');
    return;
  }
  await shareVideoMobile(video);
};
