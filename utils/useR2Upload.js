import { useState } from "react";

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file) => {
    setUploading(true);
    setProgress(0);

    // Step 1: Get presigned URL
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/uploads/r2/presigned-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      }
    );

    const { uploadUrl, publicUrl } = await res.json();

    // Step 2: Upload directly to R2 with progress
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve();
        else reject("Upload failed");
      };

      xhr.onerror = reject;
      xhr.send(file);
    });

    setUploading(false);
    return publicUrl;
  };

  return { uploadFile, uploading, progress };
}
