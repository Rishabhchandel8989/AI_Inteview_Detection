import { useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';

export default function GazeOverlay({ faces, canvasRef, videoRef }) {
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || faces.length === 0) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Match canvas dimensions to video display size
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const resizedDetections = faceapi.resizeResults(faces, displaySize);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face and landmarks
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // Draw custom overlay features (optional, depending on requirements)
    resizedDetections.forEach(det => {
      const box = det.detection.box;
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)'; // brand-500
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });

  }, [faces, canvasRef, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
    />
  );
}
