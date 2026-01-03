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

/* ------------------ web ------------------ */

export const downloadVideoWeb = async (url, filename) => {
  const blob = await fetchVideoBlob(url);
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};

/* ------------------ mobile ------------------ */

export const downloadVideoMobile = async (url) => {
  const blob = await fetchVideoBlob(url);
  const base64 = await blobToBase64(blob);

  const filename = `video-banner-${Date.now()}.mp4`;

  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
  });

  alert('Video saved to your device');
};

export const shareVideoMobile = async (url) => {
  const blob = await fetchVideoBlob(url);
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

export const handleVideoDownload = async (url) => {
  if (Capacitor.isNativePlatform()) {
    await downloadVideoMobile(url);
  } else {
    await downloadVideoWeb(url, 'video-banner.mp4');
  }
};

export const handleVideoShare = async (url) => {
  if (!Capacitor.isNativePlatform()) {
    alert('Sharing supported only on mobile');
    return;
  }
  await shareVideoMobile(url);
};
