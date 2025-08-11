import { useState, useCallback } from 'react';
import {showNotification as notifications } from '@mantine/notifications';

/**
 * Uploads a file to Cloudinary using an unsigned preset that applies
 * an Incoming transformation (e.g., f_webp,q_auto:eco,w_1280,c_limit).
 * Since Cloudinary stores the transformed asset, `secure_url` is the final WebP.
 */
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file) => {
    setUploading(true);
    setError(null);
    try {
      // Optional: basic sanity cap to avoid huge uploads
      const hardCap = 1 * 1024 * 1024; // 10 MB
      if (file.size > hardCap) {
        const message = 'File is too large to upload (max 1 MB).';
        notifications({ title: 'Upload Error', message, color: 'red' });
        throw new Error(message);
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !preset) {
        throw new Error('Cloudinary config missing');
      }

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);

      const res = await fetch(url, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

      const data = await res.json();

      // Because the preset uses *Incoming transformation*, this is already the stored WebP.
      const finalUrl = data.secure_url;

      // (Optional) sanity check + info toast
      if (data.format && data.format.toLowerCase() !== 'webp') {
        notifications({
          title: 'Uploaded (Note)',
          message: `Stored format is ${data.format}. Verify your preset has f_webp in Incoming transformation.`,
        });
      } else {
        notifications({
          title: 'Upload Successful',
          message: 'Image optimized (Incoming transform) and uploaded.',
          color: 'green',
        });
      }

      return finalUrl;
    } catch (e) {
      setError(e);
      notifications({
        title: 'Upload Error',
        message: e.message || 'Something went wrong while uploading.',
        color: 'red',
      });
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error };
}
