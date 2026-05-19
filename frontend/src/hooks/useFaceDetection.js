import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

export function useFaceDetection(videoRef, sessionId, isActive = false) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faces, setFaces] = useState([]);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastAnalyzeTime = useRef(0);

  // Load models from CDN
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
      }
    };
    loadModels();
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.readyState !== 4) return null; // HAVE_ENOUGH_DATA

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [videoRef]);

  const sendFrameToBackend = useCallback(async (base64Image) => {
    if (!sessionId) return;
    try {
      const formData = new FormData();
      formData.append('frame', base64Image);

      const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}/analyze`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to send frame to backend:", errText);
      }
    } catch (err) {
      console.error("API error", err);
    }
  }, [sessionId]);

  const detectFaces = useCallback(async () => {
    if (!isActive || !isModelLoaded || !videoRef.current || videoRef.current.readyState !== 4) {
      if (isActive) {
        requestRef.current = setTimeout(detectFaces, 200); // Check again in 200ms
      }
      return;
    }

    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();
      
      setFaces(detections);

      // Send a frame to backend roughly every 1000ms
      const now = Date.now();
      if (now - lastAnalyzeTime.current > 1000) {
        lastAnalyzeTime.current = now;
        const b64 = captureFrame();
        if (b64) {
          sendFrameToBackend(b64);
        }
      }
    } catch (err) {
      console.warn("Detection warning (safe to ignore if video is unloading):", err);
    }
    
    // Process next frame sequentially with a 100ms throttle (~10 FPS)
    if (isActive) {
      requestRef.current = setTimeout(detectFaces, 100);
    }
  }, [isActive, isModelLoaded, videoRef, sendFrameToBackend, captureFrame]);

  useEffect(() => {
    if (isActive) {
      detectFaces();
    }
    return () => {
      clearTimeout(requestRef.current);
    };
  }, [isActive, detectFaces]);

  return { isModelLoaded, faces, canvasRef };
}
