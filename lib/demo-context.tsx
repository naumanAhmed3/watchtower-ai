'use client';

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import { useFaceDetection } from './use-face-detection';
import { analyzeFrameAPI } from './api';
import type { Alert, FaceEntry, DemoStats } from './types';

const DEMO_DURATION = 120; // seconds

interface DemoContextType {
  prompt: string;
  setPrompt: (p: string) => void;
  alerts: Alert[];
  faceGallery: FaceEntry[];
  stats: DemoStats;
  analyzing: boolean;
  currentFrame: string;
  analyzeFrame: (frame: string) => Promise<any>;
  timeRemaining: number;
  timerActive: boolean;
  startSession: () => void;
  endSession: () => void;
  resetSession: () => void;
  faceApiReady: boolean;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoContext must be used within DemoProvider');
  return ctx;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [faceGallery, setFaceGallery] = useState<FaceEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(DEMO_DURATION);
  const [timerActive, setTimerActive] = useState(false);

  const alertIdRef = useRef(0);
  const faceIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { detectFaces, faceApiReady, resetKnownFaces } = useFaceDetection();

  const analyzeFrame = useCallback(async (frame: string) => {
    if (!prompt.trim()) return null;
    setAnalyzing(true);
    setCurrentFrame(frame);
    try {
      const result = await analyzeFrameAPI(frame, prompt);
      const isDetected = result.detected ?? false;
      let thumbnail = frame;

      if (isDetected && faceApiReady) {
        let annotatedFrame = frame;
        let croppedFaces: string[] = [];
        let facePersonIds: number[] = [];

        const faceResult = await detectFaces(frame);
        annotatedFrame = faceResult.annotatedFrame;
        croppedFaces = faceResult.croppedFaces;
        facePersonIds = faceResult.personIds;

        if (croppedFaces.length === 0) {
          try {
            const img = document.createElement('img');
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = frame;
            });
            const cropCanvas = document.createElement('canvas');
            const cw = Math.round(img.naturalWidth * 0.5);
            const ch = Math.round(img.naturalHeight * 0.6);
            const cx = Math.round((img.naturalWidth - cw) / 2);
            const cy = Math.round((img.naturalHeight - ch) / 3);
            cropCanvas.width = cw;
            cropCanvas.height = ch;
            cropCanvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
            croppedFaces = [cropCanvas.toDataURL('image/jpeg', 0.8)];
            facePersonIds = [-(++faceIdRef.current)];

            if (annotatedFrame === frame) {
              const annoCanvas = document.createElement('canvas');
              annoCanvas.width = img.naturalWidth;
              annoCanvas.height = img.naturalHeight;
              const actx = annoCanvas.getContext('2d')!;
              actx.drawImage(img, 0, 0);
              actx.strokeStyle = '#ef4444';
              actx.lineWidth = 4;
              actx.setLineDash([10, 5]);
              actx.strokeRect(cx, cy, cw, ch);
              actx.setLineDash([]);
              actx.fillStyle = 'rgba(239, 68, 68, 0.8)';
              actx.fillRect(cx, cy - 26, 120, 26);
              actx.fillStyle = '#fff';
              actx.font = 'bold 14px sans-serif';
              actx.fillText('\u26a0 DETECTED', cx + 6, cy - 8);
              annotatedFrame = annoCanvas.toDataURL('image/jpeg', 0.7);
            }
          } catch {}
        }

        thumbnail = annotatedFrame;

        if (croppedFaces.length > 0) {
          const newFaces: FaceEntry[] = croppedFaces.map((faceImg, idx) => ({
            id: ++faceIdRef.current,
            personId: facePersonIds?.[idx] || undefined,
            faceImage: faceImg,
            fullFrame: annotatedFrame,
            timestamp: new Date().toISOString(),
            alertDescription: result.description || 'Detection',
            confidence: result.confidence ?? 0,
          }));
          setFaceGallery(prev => [...prev, ...newFaces]);
        }
      }

      const alert: Alert = {
        id: ++alertIdRef.current,
        timestamp: new Date().toISOString(),
        detected: isDetected,
        confidence: result.confidence ?? 0,
        description: result.description || result.error || 'Unknown',
        region: result.region,
        thumbnail,
      };
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      setAnalyzing(false);
      return result;
    } catch {
      setAnalyzing(false);
      return null;
    }
  }, [prompt, faceApiReady, detectFaces]);

  const startSession = useCallback(() => {
    setTimerActive(true);
    setTimeRemaining(DEMO_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const endSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
  }, []);

  const resetSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setTimeRemaining(DEMO_DURATION);
    setAlerts([]);
    setFaceGallery([]);
    setAnalyzing(false);
    setCurrentFrame('');
    alertIdRef.current = 0;
    faceIdRef.current = 0;
    resetKnownFaces();
  }, [resetKnownFaces]);

  const detectedCount = alerts.filter(a => a.detected).length;
  const stats: DemoStats = {
    framesProcessed: alerts.length,
    alertsTriggered: detectedCount,
    detectionRate: alerts.length ? Math.round((detectedCount / alerts.length) * 100) : 0,
    uniquePersons: new Set(faceGallery.filter(f => f.personId && f.personId > 0).map(f => f.personId)).size,
  };

  return (
    <DemoContext.Provider value={{
      prompt, setPrompt, alerts, faceGallery, stats, analyzing, currentFrame,
      analyzeFrame, timeRemaining, timerActive, startSession, endSession, resetSession, faceApiReady,
    }}>
      {children}
    </DemoContext.Provider>
  );
}
