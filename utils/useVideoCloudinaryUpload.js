import { useState, useCallback } from 'react';
import { showNotification as notifications } from '@mantine/notifications';

export function useVideoCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadVideo = useCallback(async (file) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    const videoCap = 50 * 1024 * 1024; // 50MB
    if (file.size > videoCap) {
      setUploading(false);
      throw new Error('Video is too large (Max 50MB).');
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      setUploading(false);
      throw new Error('Cloudinary config missing.');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      // ✅ PROGRESS TRACKING (THIS NOW WORKS)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);

        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            notifications({
              title: 'Success',
              message: 'Video uploaded successfully',
              color: 'green',
            });
            resolve(response.secure_url);
          } else {
            reject(new Error(response.error?.message || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid Cloudinary response'));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        reject(new Error('Network error during upload'));
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);

      xhr.send(formData);
    });
  }, []);

  return { uploadVideo, uploading, progress, error };
}
