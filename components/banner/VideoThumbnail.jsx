import { useEffect, useState } from "react";

export default function VideoThumbnail({ src, className }) {
  const [thumb, setThumb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.25);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      if (!cancelled) {
        setThumb(dataUrl);
        setLoading(false);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-white p-3 space-y-3 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-200" />
        </div>
      )}

      {/* Image */}
      <img
        src={thumb || "/placeholder.jpg"}
        alt="Video thumbnail"
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
