'use client';

import { useState, useRef, useCallback } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = useCallback(async (mode?: 'user' | 'environment') => {
    try {
      const facing = mode || facingMode;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setWebcamActive(true);
      }
    } catch (err: any) {
      // Fallback: try without facingMode constraint (desktop may not support it)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setWebcamActive(true);
        }
      } catch (fallbackErr: any) {
        alert('Camera error: ' + fallbackErr.message);
      }
    }
  }, [facingMode]);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (webcamActive) {
      // Stop current stream and restart with new facing mode
      streamRef.current?.getTracks().forEach(t => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        // If switching fails (single camera device), restart with any camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }
    }
  }, [facingMode, webcamActive]);

  const captureFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    c.width = 640;
    c.height = 480;
    ctx.drawImage(v, 0, 0, 640, 480);
    return c.toDataURL('image/jpeg', 0.5);
  }, []);

  return { videoRef, canvasRef, webcamActive, startWebcam, stopWebcam, captureFrame, switchCamera, facingMode };
}
