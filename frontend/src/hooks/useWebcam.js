import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebcam() {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // Use ref to avoid dependency loop
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  const startWebcam = useCallback(async () => {
    // Don't restart if already running
    if (streamRef.current) return;
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      setError("Unable to access the camera. Please allow permissions.");
    }
  }, []); // No dependencies — stable reference

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []); // No dependencies — stable reference

  // Bind stream to video element whenever videoRef or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on component unmount only
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // Empty deps = only runs on unmount

  return { videoRef, stream, error, startWebcam, stopWebcam };
}
