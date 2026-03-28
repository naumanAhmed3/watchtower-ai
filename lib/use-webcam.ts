'use client';

import { useState, useRef, useCallback } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setWebcamActive(true);
      }
    } catch (err: any) {
      alert('Camera error: ' + err.message);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

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

  return { videoRef, canvasRef, webcamActive, startWebcam, stopWebcam, captureFrame };
}
