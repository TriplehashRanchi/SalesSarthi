import { useState, useCallback } from 'react';

/**
 * Hook to upload a file to Cloudinary using unsigned presets.
 * Requires these environment variables:
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * - NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file) => {
    setUploading(true);
    setError(null);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !preset) {
        throw new Error('Cloudinary config missing');
      }

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

      const data = await res.json();
      return data.secure_url;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error };
}
