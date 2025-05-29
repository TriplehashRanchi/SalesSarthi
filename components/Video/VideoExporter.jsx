// 'use client';
// import React, { useState, useRef, useCallback, useEffect } from 'react';
// import { Button } from '@mantine/core';
// import RecordRTC from 'recordrtc';

// const ReelOverlayMaker = () => {
//   const dummyData = {
//     name: 'Digital Gyani',
//     title: 'AMFI-Registered Mutual Fund Distributor',
//     company: 'ArthMitra Gurukulam',
//     email: 'yogitraining.video@gmail.com',
//     phone: '9818122533',
//     logo: '/assets/images/logox.png',
//     website: 'www.example.com',
//   };

//   const stockVideos = {
//     'finance-reel': '/assets/videos/test.mp4',
//     'business-reel': '/assets/videos/business-reel.mp4',
//     'data-reel': 'https://vimeo.com/1067665470',
//     'motivation-reel': 'https://finask.triplehash.in/test.mp4',
//     'startup-reel': '/assets/videos/startup-reel.mp4',
//     'growth-reel': '/assets/videos/growth-reel.mp4',
//   };

//   const [selectedVideo, setSelectedVideo] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [videoError, setVideoError] = useState(null);
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const recorderRef = useRef(null);
//   const logoImgRef = useRef(new Image());

//   // Preload logo to prevent flickering
//   useEffect(() => {
//     logoImgRef.current.src = dummyData.logo;
//   }, [dummyData.logo]);

//   // Enhanced video loading with multiple strategies
//   const loadVideo = (url) => {
//     return new Promise((resolve, reject) => {
//       const video = document.createElement('video');
      
//       // Multiple loading strategies
//       video.src = url;
//       video.crossOrigin = 'anonymous';
//       video.preload = 'metadata';
//       video.muted = true;

//       // Timeout to handle slow or blocked resources
//       const loadTimeout = setTimeout(() => {
//         reject(new Error('Video loading timed out'));
//       }, 10000);

//       video.onloadedmetadata = () => {
//         clearTimeout(loadTimeout);
//         resolve(video);
//       };

//       video.onerror = (error) => {
//         clearTimeout(loadTimeout);
//         console.error('Video loading error:', error);
//         reject(new Error(`Failed to load video from ${url}`));
//       };
//     });
//   };

//   const drawReelOverlay = useCallback((context, canvas, video) => {
//     // Draw video frame
//     context.drawImage(video, 0, 0, canvas.width, canvas.height);

//     // Bottom strip overlay
//     context.fillStyle = 'rgba(0,0,0,0.7)';
//     context.fillRect(0, canvas.height - 250, canvas.width, 250);

//     // Logo (bottom right corner)
//     const logoSize = 80;
//     context.drawImage(
//       logoImgRef.current, 
//       canvas.width - logoSize - 20, 
//       canvas.height - logoSize - 160, 
//       logoSize, 
//       logoSize
//     );

//     // Text Information
//     context.textAlign = 'left';
//     context.fillStyle = 'white';

//     // Positioning text to the left
//     const textX = 20;

//     context.font = 'bold 24px Arial';
//     context.fillText(dummyData.name, textX, canvas.height - 180);

//     context.font = '18px Arial';
//     context.fillText(dummyData.title, textX, canvas.height - 150);

//     context.font = '16px Arial';
//     context.fillText(dummyData.email, textX, canvas.height - 100);
//     context.fillText(dummyData.phone, textX, canvas.height - 70);
//     context.fillText(dummyData.website, textX, canvas.height - 40);
//   }, [dummyData]);

//   const processVideoWithOverlay = async () => {
//     try {
//       const videoUrl = stockVideos[selectedVideo];
      
//       // Validate URL
//       if (!videoUrl || videoUrl.trim() === '') {
//         throw new Error('Invalid video URL');
//       }

//       // Try different URL protocols if needed
//       const alternateUrls = [
//         videoUrl,
//         videoUrl.replace('https://', 'http://'),
//         videoUrl.replace('http://', 'https://')
//       ];

//       let loadedVideo = null;
//       for (const url of alternateUrls) {
//         try {
//           loadedVideo = await loadVideo(url);
//           break;
//         } catch (error) {
//           console.warn(`Failed to load video from ${url}:`, error);
//         }
//       }

//       if (!loadedVideo) {
//         throw new Error('Could not load video from any of the provided URLs');
//       }
      
//       const canvas = canvasRef.current;
//       const context = canvas.getContext('2d');

//       canvas.width = 1080;
//       canvas.height = 1920;

//       const canvasStream = canvas.captureStream(60);

//       recorderRef.current = new RecordRTC(canvasStream, {
//         type: 'video',
//         mimeType: 'video/mp4',
//         bitsPerSecond: 5 * 1024 * 1024,
//       });

//       setIsProcessing(true);
//       recorderRef.current.startRecording();
//       loadedVideo.play();

//       const processFrame = () => {
//         if (!loadedVideo.paused && !loadedVideo.ended) {
//           drawReelOverlay(context, canvas, loadedVideo);
//           requestAnimationFrame(processFrame);
//         } else {
//           recorderRef.current.stopRecording(() => {
//             const mp4Blob = recorderRef.current.getBlob();
//             const mp4Url = URL.createObjectURL(mp4Blob);
//             downloadFile(mp4Url, 'professional-reel-overlay.mp4');
//             setIsProcessing(false);
//           });
//         }
//       };

//       loadedVideo.addEventListener('play', processFrame);
//     } catch (error) {
//       console.error('Video processing error:', error);
//       setVideoError(error.message || 'Failed to load video. Please check the URL and try again.');
//       setIsProcessing(false);
//     }
//   };

//   const downloadFile = (blobUrl, filename) => {
//     const a = document.createElement('a');
//     a.style.display = 'none';
//     a.href = blobUrl;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();

//     setTimeout(() => {
//       document.body.removeChild(a);
//       URL.revokeObjectURL(blobUrl);
//     }, 100);
//   };

//   const handleVideoSelect = (videoId) => {
//     setSelectedVideo(videoId);
//     setVideoError(null);
//   };

//   if (!selectedVideo) {
//     return (
//       <div className="container mx-auto p-6">
//         <div className="text-center mb-8">
//           <h1 className="text-2xl font-bold mb-2">Choose a Reel Video</h1>
//           <p className="text-gray-600">Select a vertical video for your professional overlay</p>
//         </div>
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
//           {Object.entries(stockVideos).map(([id, path]) => (
//             <div 
//               key={id} 
//               onClick={() => handleVideoSelect(id)} 
//               className="cursor-pointer transform transition-all hover:scale-105"
//             >
//               <div className="aspect-[9/16] relative overflow-hidden rounded-lg shadow-md hover:shadow-xl">
//                 <video 
//                   src={path} 
//                   className="w-full h-full object-cover" 
//                   muted 
//                   preload="metadata" 
//                 />
//                 <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
//                   <Button className="bg-white text-black hover:bg-gray-100">Use Video</Button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <div className="flex justify-end mb-4">
//         <Button 
//           onClick={() => setSelectedVideo(null)} 
//           className="mr-4 bg-gray-100 text-gray-700 hover:bg-gray-200"
//         >
//           ← Back to Videos
//         </Button>
//         <Button 
//           onClick={processVideoWithOverlay} 
//           disabled={isProcessing} 
//           className="bg-gradient-to-r from-green-500 via-teal-600 to-blue-700 text-white hover:from-green-600 hover:via-teal-700 hover:to-blue-800"
//         >
//           {isProcessing ? 'Processing...' : 'Export Reel with Overlay'}
//         </Button>
//       </div>

//       {videoError && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
//           {videoError}
//         </div>
//       )}

//       <div className="flex space-x-4">
//         <div className="w-2/3">
//           <video 
//             ref={videoRef} 
//             src={stockVideos[selectedVideo]} 
//             controls 
//             className="w-full rounded-lg aspect-[9/16]" 
//             crossOrigin="anonymous"
//             preload="metadata" 
//           />
//         </div>
//         <div className="w-1/3">
//           <canvas 
//             ref={canvasRef} 
//             className="w-full rounded-lg bg-black aspect-[9/16]" 
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ReelOverlayMaker;


'use client'
import React, { useState } from 'react';

const VideoOverlayTester = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file to upload.");
      return;
    }

    setProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      // Adjust the URL if needed (e.g., include host/port in production)
      const response = await fetch('http://localhost:5000/video-overlay/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      // Retrieve the processed video as a blob
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download  
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'processed-video.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Video Overlay Tester</h1>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={processing} style={{ marginTop: '1rem' }}>
        {processing ? 'Processing...' : 'Upload and Process'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};

export default VideoOverlayTester;
