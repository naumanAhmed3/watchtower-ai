'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Camera, Upload, Eye, AlertTriangle, CheckCircle, Clock, Loader2, Play, Square, Image as ImageIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import * as faceapi from 'face-api.js';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import * as ort from 'onnxruntime-web';
import { InlineGallery, type FaceEntry } from '@/components/face-gallery';

interface Alert {
  id: number;
  timestamp: string;
  detected: boolean;
  region?: string;
  confidence: number;
  description: string;
  thumbnail: string;
}

function Dashboard() {
  const [prompt, setPrompt] = useState('');
  const [watching, setWatching] = useState(false);
  const [inputMode, setInputMode] = useState<'upload' | 'webcam' | 'ipcam' | 'screen' | 'demo'>('upload');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentFrame, setCurrentFrame] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [ipCamUrl, setIpCamUrl] = useState('');
  const [ipCamActive, setIpCamActive] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{ current: number; total: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const ipCamImgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamInterval = useRef<NodeJS.Timeout | null>(null);
  const screenInterval = useRef<NodeJS.Timeout | null>(null);
  const ipCamInterval = useRef<NodeJS.Timeout | null>(null);
  const alertIdRef = useRef(0);
  const faceIdRef = useRef(0);
  const [faceGallery, setFaceGallery] = useState<FaceEntry[]>([]);
  const [faceApiReady, setFaceApiReady] = useState(false);

  // Unique person tracking — multiple descriptors + averaging for better accuracy
  const knownFacesRef = useRef<{
    id: number;
    descriptors: Float32Array[];   // all seen descriptors (max 10)
    avgDescriptor: Float32Array;   // rolling average for matching
    sightings: number;
    bestFaceImage?: string;        // clearest face crop
    bestFaceSize: number;          // size of best face (width * height)
  }[]>([]);
  const MATCH_THRESHOLD = 0.55;  // cosine similarity: higher = more similar (0.55+ = same person)
  const mediapipeDetectorRef = useRef<FaceDetector | null>(null);
  const sfaceSessionRef = useRef<ort.InferenceSession | null>(null);

  // Load models: MediaPipe for detection + face-api.js for recognition
  useEffect(() => {
    async function loadModels() {
      // Load MediaPipe face detector
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.3,
        });
        mediapipeDetectorRef.current = detector;
        console.log('MediaPipe face detector loaded');
      } catch (err) {
        console.error('MediaPipe load error:', err);
      }

      // Load SFace ONNX model for face recognition (much better than face-api.js)
      try {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
        // Load SFace model — try local first, fallback to fetching from GitHub
        let modelSource: string | ArrayBuffer = '/models/face_recognition.onnx';
        try {
          const check = await fetch('/models/face_recognition.onnx', { method: 'HEAD' });
          if (!check.ok) throw new Error('Local model not found');
        } catch {
          console.log('Local SFace model not found, downloading from GitHub...');
          const resp = await fetch('https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx');
          modelSource = await resp.arrayBuffer();
          console.log(`Downloaded SFace model: ${(modelSource.byteLength / 1024 / 1024).toFixed(1)}MB`);
        }
        const session = await ort.InferenceSession.create(modelSource, {
          executionProviders: ['webgl', 'wasm'],
        });
        sfaceSessionRef.current = session;
        console.log('SFace ONNX model loaded for recognition');
      } catch (err) {
        console.error('SFace ONNX load error:', err);
        // Fallback: load face-api.js recognition
        try {
          const FACEAPI_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
          await faceapi.nets.ssdMobilenetv1.loadFromUri(FACEAPI_CDN);
          await faceapi.nets.faceRecognitionNet.loadFromUri(FACEAPI_CDN);
          await faceapi.nets.faceLandmark68Net.loadFromUri(FACEAPI_CDN);
          console.log('Fallback: face-api.js recognition loaded');
        } catch {}
      }

      setFaceApiReady(true);
      console.log('All face models ready (MediaPipe detect + face-api recognize)');
    }
    loadModels();
  }, []);

  // Extract face embedding using SFace ONNX model
  const getSfaceEmbedding = useCallback(async (canvas: HTMLCanvasElement): Promise<Float32Array | null> => {
    const session = sfaceSessionRef.current;
    if (!session) return null;

    try {
      // Resize to 112x112 (SFace input size)
      const resized = document.createElement('canvas');
      resized.width = 112;
      resized.height = 112;
      resized.getContext('2d')!.drawImage(canvas, 0, 0, 112, 112);

      // Get pixel data and convert to float tensor [1, 3, 112, 112]
      const ctx = resized.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, 112, 112);
      const { data } = imageData;
      const float32 = new Float32Array(3 * 112 * 112);

      for (let i = 0; i < 112 * 112; i++) {
        float32[i] = data[i * 4] / 255.0;               // R
        float32[112 * 112 + i] = data[i * 4 + 1] / 255.0; // G
        float32[2 * 112 * 112 + i] = data[i * 4 + 2] / 255.0; // B
      }

      const inputTensor = new ort.Tensor('float32', float32, [1, 3, 112, 112]);
      const results = await session.run({ data: inputTensor });

      // Get the output embedding (first output key)
      const outputKey = Object.keys(results)[0];
      const embedding = results[outputKey].data as Float32Array;

      // L2 normalize
      let norm = 0;
      for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
      norm = Math.sqrt(norm);
      const normalized = new Float32Array(embedding.length);
      for (let i = 0; i < embedding.length; i++) normalized[i] = embedding[i] / norm;

      return normalized;
    } catch (err) {
      console.error('SFace embedding error:', err);
      return null;
    }
  }, []);

  // Cosine similarity between two embeddings
  const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot; // Already L2-normalized, so dot product = cosine similarity
  };

  // Run face detection (MediaPipe) + recognition (SFace ONNX) on a frame
  const detectFaces = useCallback(async (frameDataUrl: string): Promise<{ annotatedFrame: string; croppedFaces: string[]; personIds: number[] }> => {
    if (!faceApiReady) {
      console.log('Models not ready yet');
      return { annotatedFrame: frameDataUrl, croppedFaces: [], personIds: [] };
    }

    try {
      // Load image
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = frameDataUrl;
      });

      console.log(`Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);

      // Step 1: MediaPipe face detection (much better at angles)
      let mediapipeBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }> = [];

      if (mediapipeDetectorRef.current) {
        const mpResult = mediapipeDetectorRef.current.detect(img);
        mediapipeBoxes = mpResult.detections
          .map(d => {
            const bb = d.boundingBox!;
            return { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height, confidence: d.categories[0]?.score || 0 };
          })
          .filter(b => b.width >= 40 && b.height >= 40); // ignore tiny faces
        console.log(`MediaPipe found ${mpResult.detections.length} faces (${mediapipeBoxes.length} large enough)`);
      }

      // Step 2: For each detected face, crop and get face-api.js descriptor for recognition
      const detections: Array<{ box: typeof mediapipeBoxes[0]; descriptor?: Float32Array }> = [];

      for (const box of mediapipeBoxes) {
        // Crop face from original image
        const cropCanvas = document.createElement('canvas');
        const pad = Math.round(Math.max(box.width, box.height) * 0.45);
        const cx = Math.max(0, Math.round(box.x - pad));
        const cy = Math.max(0, Math.round(box.y - pad));
        const cw = Math.min(img.naturalWidth - cx, Math.round(box.width + pad * 2));
        const ch = Math.min(img.naturalHeight - cy, Math.round(box.height + pad * 2));
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        cropCanvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);

        // Get face embedding via SFace ONNX (much more accurate than face-api.js)
        let descriptor: Float32Array | undefined;

        const embedding = await getSfaceEmbedding(cropCanvas);
        if (embedding) {
          descriptor = embedding;
          console.log(`  Face: got ${embedding.length}-dim SFace embedding`);
        } else {
          console.log(`  Face: SFace embedding failed, trying face-api.js fallback`);
          // Fallback to face-api.js
          try {
            const det = await faceapi.detectSingleFace(cropCanvas).withFaceLandmarks().withFaceDescriptor();
            if (det) descriptor = det.descriptor;
          } catch {}
        }

        detections.push({ box, descriptor });
      }

      console.log(`Got ${detections.filter(d => d.descriptor).length}/${detections.length} face descriptors for recognition`);

      // Draw annotations on canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const croppedFaces: string[] = [];
      const facePersonIds: number[] = [];

      detections.forEach((det, i) => {
        const box = det.box;
        const descriptor = det.descriptor;

        // Match against known faces (only if we got a descriptor)
        let personId = -1;
        const faceSize = box.width * box.height;

        if (descriptor) {
          let bestSim = -1;
          let bestMatchId = -1;
          for (const known of knownFacesRef.current) {
            // Use cosine similarity if same dimensionality, else euclidean
            let sim: number;
            if (descriptor.length === known.avgDescriptor.length) {
              sim = cosineSimilarity(descriptor, known.avgDescriptor);
            } else {
              // Fallback for mixed face-api (128) vs SFace (128) descriptors
              const dist = faceapi.euclideanDistance(descriptor, known.avgDescriptor);
              sim = 1 - dist; // convert distance to similarity-like score
            }
            console.log(`  Similarity to Person ${known.id}: ${sim.toFixed(3)} (threshold: ${MATCH_THRESHOLD})`);
            if (sim > bestSim) {
              bestSim = sim;
              if (sim >= MATCH_THRESHOLD) bestMatchId = known.id;
            }
          }

          if (bestMatchId === -1) {
            // New person
            personId = knownFacesRef.current.length + 1;
            knownFacesRef.current.push({
              id: personId,
              descriptors: [descriptor],
              avgDescriptor: new Float32Array(descriptor),
              sightings: 1,
              bestFaceSize: faceSize,
            });
            console.log(`NEW Person ${personId} (total known: ${knownFacesRef.current.length}, best similarity: ${bestSim.toFixed(3)})`);
          } else {
            // Known person — update descriptors + running average
            personId = bestMatchId;
            const known = knownFacesRef.current.find(k => k.id === personId)!;
            known.sightings++;

            // Add descriptor (keep max 10 for averaging)
            if (known.descriptors.length < 10) {
              known.descriptors.push(descriptor);
            } else {
              known.descriptors[known.sightings % 10] = descriptor; // rolling replace
            }

            // Recompute average descriptor
            const avg = new Float32Array(128);
            for (const d of known.descriptors) {
              for (let j = 0; j < 128; j++) avg[j] += d[j];
            }
            for (let j = 0; j < 128; j++) avg[j] /= known.descriptors.length;
            known.avgDescriptor = avg;

            console.log(`RECOGNIZED Person ${personId} (seen ${known.sightings}x, similarity=${bestSim.toFixed(3)}, descriptors=${known.descriptors.length})`);
          }
        } else {
          // No descriptor — assign unique unrecognized ID
          personId = -(i + 1 + faceIdRef.current);
          console.log(`Face ${i + 1}: no descriptor (MediaPipe detected but face-api couldn't extract)`);
        }

        facePersonIds.push(personId);

        // Draw colored bounding box
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        const color = personId > 0 ? colors[(personId - 1) % colors.length] : '#ef4444';

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 200));
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw label
        const label = `Person ${personId}`;
        const labelW = ctx.measureText(label).width + 12;
        const labelH = 24;
        ctx.fillStyle = color;
        ctx.fillRect(box.x, box.y - labelH, labelW, labelH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(label, box.x + 6, box.y - 7);

        // Crop face
        const pad = Math.round(box.width * 0.3);
        const fx = Math.max(0, Math.round(box.x - pad));
        const fy = Math.max(0, Math.round(box.y - pad));
        const fw = Math.min(canvas.width - fx, Math.round(box.width + pad * 2));
        const fh = Math.min(canvas.height - fy, Math.round(box.height + pad * 2));

        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = fw;
        faceCanvas.height = fh;
        faceCanvas.getContext('2d')!.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
        const faceDataUrl = faceCanvas.toDataURL('image/jpeg', 0.85);
        croppedFaces.push(faceDataUrl);

        // Update best face image for this person (keep largest/clearest)
        if (personId > 0) {
          const known = knownFacesRef.current.find(k => k.id === personId);
          if (known && faceSize > known.bestFaceSize) {
            known.bestFaceImage = faceDataUrl;
            known.bestFaceSize = faceSize;
          }
        }
      });

      // If no faces detected by face-api, still draw a general highlight
      if (detections.length === 0) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.fillRect(20, 20, 140, 28);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('⚠ DETECTED', 28, 40);
      }

      return { annotatedFrame: canvas.toDataURL('image/jpeg', 0.7), croppedFaces, personIds: facePersonIds };
    } catch (err) {
      console.error('Face detection error:', err);
      return { annotatedFrame: frameDataUrl, croppedFaces: [], personIds: [] };
    }
  }, [faceApiReady]);

  const analyzeFrame = useCallback(async (frame: string) => {
    if (!prompt.trim()) return null;
    setAnalyzing(true);
    setCurrentFrame(frame);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame, prompt }),
      });
      const result = await res.json();
      const isDetected = result.detected ?? false;
      let thumbnail = frame;

      // If detected, run face detection + annotation
      console.log('Analysis result:', { detected: isDetected, confidence: result.confidence, description: result.description?.substring(0, 50) });
      if (isDetected) {
        let annotatedFrame = frame;
        let croppedFaces: string[] = [];
        let facePersonIds: number[] = [];

        // Try face-api.js first
        if (faceApiReady) {
          console.log('Running face detection...');
          const faceResult = await detectFaces(frame);
          annotatedFrame = faceResult.annotatedFrame;
          croppedFaces = faceResult.croppedFaces;
          facePersonIds = faceResult.personIds;
          console.log(`Found ${croppedFaces.length} faces via face-api`);
        }

        // If face-api found nothing, create a center crop as "person of interest"
        if (croppedFaces.length === 0) {
          console.log('No faces found — creating center crop as fallback');
          try {
            const img = document.createElement('img');
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = frame;
            });
            // Crop center 50% of the frame as the "person" capture
            const cropCanvas = document.createElement('canvas');
            const cw = Math.round(img.naturalWidth * 0.5);
            const ch = Math.round(img.naturalHeight * 0.6);
            const cx = Math.round((img.naturalWidth - cw) / 2);
            const cy = Math.round((img.naturalHeight - ch) / 3); // bias toward top (where faces usually are)
            cropCanvas.width = cw;
            cropCanvas.height = ch;
            cropCanvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
            croppedFaces = [cropCanvas.toDataURL('image/jpeg', 0.8)];
            // Assign a unique person ID for each unrecognized detection (so they don't group together)
            facePersonIds = [-(++faceIdRef.current)]; // negative IDs = unrecognized

            // Also annotate the full frame with a detection box
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
              actx.fillText('⚠ DETECTED', cx + 6, cy - 8);
              annotatedFrame = annoCanvas.toDataURL('image/jpeg', 0.7);
            }
          } catch (e) {
            console.error('Fallback crop error:', e);
          }
        }

        thumbnail = annotatedFrame;

        // Add to face gallery
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
    } catch (err: any) {
      setAnalyzing(false);
      return null;
    }
  }, [prompt]);

  // Webcam: start
  const startWebcam = async () => {
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
  };

  // Webcam: stop
  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (webcamInterval.current) clearInterval(webcamInterval.current);
    setWebcamActive(false);
  };

  // Webcam: capture loop
  useEffect(() => {
    if (!webcamActive || !watching) {
      if (webcamInterval.current) clearInterval(webcamInterval.current);
      return;
    }
    const capture = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || analyzing) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      c.width = 640; c.height = 480;
      ctx.drawImage(v, 0, 0, 640, 480);
      analyzeFrame(c.toDataURL('image/jpeg', 0.5));
    };
    webcamInterval.current = setInterval(capture, 5000);
    capture();
    return () => { if (webcamInterval.current) clearInterval(webcamInterval.current); };
  }, [webcamActive, watching, analyzeFrame, analyzing]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!watching) { alert('Set a watch target first!'); return; }
    const reader = new FileReader();
    reader.onload = () => analyzeFrame(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Handle video upload — extract frames and analyze each
  const handleVideoUpload = async (file: File) => {
    if (!watching) { alert('Set a watch target first!'); return; }
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.src = url;
    vid.muted = true;
    vid.playsInline = true;

    vid.onloadedmetadata = async () => {
      const duration = Math.floor(vid.duration);
      const totalFrames = Math.min(duration, 30); // max 30 frames
      const interval = duration / totalFrames;
      setVideoProgress({ current: 0, total: totalFrames });

      const c = document.createElement('canvas');
      c.width = 640; c.height = 480;
      const ctx = c.getContext('2d')!;

      for (let i = 0; i < totalFrames; i++) {
        vid.currentTime = i * interval;
        await new Promise<void>(resolve => { vid.onseeked = () => resolve(); });
        ctx.drawImage(vid, 0, 0, 640, 480);
        const frame = c.toDataURL('image/jpeg', 0.5);
        setVideoProgress({ current: i + 1, total: totalFrames });
        await analyzeFrame(frame);
        await new Promise(r => setTimeout(r, 300)); // small delay between frames
      }
      setVideoProgress(null);
      URL.revokeObjectURL(url);
    };
    vid.load();
  };

  // Handle file drop/select
  const handleFile = (file: File) => {
    if (file.type.startsWith('video/')) handleVideoUpload(file);
    else if (file.type.startsWith('image/')) handleImageUpload(file);
  };

  // Screen capture: start
  const startScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (screenRef.current) {
        screenRef.current.srcObject = stream;
        await screenRef.current.play();
        setScreenActive(true);
        stream.getVideoTracks()[0].onended = () => setScreenActive(false);
      }
    } catch (err: any) {
      alert('Screen share cancelled or error: ' + err.message);
    }
  };

  // Screen capture: loop
  useEffect(() => {
    if (!screenActive || !watching) { if (screenInterval.current) clearInterval(screenInterval.current); return; }
    const capture = () => {
      const v = screenRef.current; const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || analyzing) return;
      const ctx = c.getContext('2d'); if (!ctx) return;
      c.width = 640; c.height = 480;
      ctx.drawImage(v, 0, 0, 640, 480);
      analyzeFrame(c.toDataURL('image/jpeg', 0.5));
    };
    screenInterval.current = setInterval(capture, 5000);
    capture();
    return () => { if (screenInterval.current) clearInterval(screenInterval.current); };
  }, [screenActive, watching, analyzeFrame, analyzing]);

  // IP Camera: start — kick off background stream capture on server
  const startIpCam = async () => {
    if (!ipCamUrl.trim()) return;
    await fetch('/api/proxy-frame?url=' + encodeURIComponent(ipCamUrl) + '&action=start');
    setIpCamActive(true);
  };

  // IP Camera: stop
  const stopIpCam = async () => {
    await fetch('/api/proxy-frame?url=' + encodeURIComponent(ipCamUrl) + '&action=stop').catch(() => {});
    setIpCamActive(false);
    setCurrentFrame('');
  };

  // IP Camera: capture loop — fetch snapshot via our proxy API to avoid CORS/taint
  useEffect(() => {
    if (!ipCamActive || !watching) { if (ipCamInterval.current) clearInterval(ipCamInterval.current); return; }
    let frameNum = 0;
    const capture = async () => {
      try {
        // Fetch latest cached frame — instant, no new camera connection
        const res = await fetch('/api/proxy-frame?url=' + encodeURIComponent(ipCamUrl));
        const data = await res.json();
        if (data.frame && data.size > 500) {
          setCurrentFrame(data.frame);
          frameNum++;
          // Analyze every 5th frame (~5 seconds)
          if (frameNum % 5 === 1 && !analyzing) {
            analyzeFrame(data.frame);
          }
        }
      } catch {}
    };
    // Poll cached frames every 1 second — very fast since it's just reading from memory
    ipCamInterval.current = setInterval(capture, 1000);
    setTimeout(capture, 1500); // wait for first frame to be captured
    return () => { if (ipCamInterval.current) clearInterval(ipCamInterval.current); };
  }, [ipCamActive, watching, analyzeFrame, analyzing, ipCamUrl]);

  // Demo: sample images
  const DEMO_IMAGES = [
    { label: 'Office Scene', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&h=480&fit=crop' },
    { label: 'Parking Lot', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=640&h=480&fit=crop' },
    { label: 'Store Interior', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=640&h=480&fit=crop' },
    { label: 'Street View', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=640&h=480&fit=crop' },
  ];

  const analyzeDemoImage = async (url: string) => {
    if (!watching) { alert('Set a watch target first!'); return; }
    setCurrentFrame(url);
    // Fetch the image and convert to base64
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => analyzeFrame(reader.result as string);
      reader.readAsDataURL(blob);
    } catch {
      // If fetch fails (CORS), use the URL directly as frame display and send URL to API
      analyzeFrame(url);
    }
  };

  const detectedCount = alerts.filter(a => a.detected).length;
  const EXAMPLES = ['Person falling down', 'Fire or smoke', 'Someone running', 'Unattended bag', 'Person with weapon', 'Vehicle in restricted area'];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">WatchTower AI</span>
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">by NovaBuild Studios</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Prompt bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <label className="text-sm font-semibold text-gray-300 mb-2 block">What should AI watch for?</label>
          <div className="flex gap-3">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the activity to detect..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setWatching(!watching)}
              disabled={!prompt.trim()}
              className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                watching
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
              } disabled:opacity-40`}
            >
              {watching ? <><Square className="w-4 h-4" />Stop</> : <><Eye className="w-4 h-4" />Watch</>}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)} className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">{ex}</button>
            ))}
          </div>
        </div>

        {/* Input mode + Feed + Timeline grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Input + Feed */}
          <div className="lg:col-span-3 space-y-4">
            {/* Input mode tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'upload', icon: Upload, label: 'Upload' },
                { id: 'webcam', icon: Camera, label: 'Webcam' },
                { id: 'ipcam', icon: Eye, label: 'IP Camera' },
                { id: 'screen', icon: ImageIcon, label: 'Screen' },
                { id: 'demo', icon: Play, label: 'Demo' },
              ].map((tab: any) => (
                <button key={tab.id} onClick={() => setInputMode(tab.id)}
                  className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${inputMode === tab.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              ))}
            </div>

            {/* Feed area */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  {{ upload: 'Upload Analysis', webcam: 'Live Camera', ipcam: 'IP Camera Feed', screen: 'Screen Capture', demo: 'Demo Footage' }[inputMode]}
                </span>
                {analyzing && <span className="text-xs text-cyan-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</span>}
                {webcamActive && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] text-red-400">LIVE</span></span>}
              </div>

              <div className="aspect-video bg-black relative flex items-center justify-center">
                {/* Webcam mode */}
                {inputMode === 'webcam' && (
                  <>
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-contain" style={{ display: webcamActive ? 'block' : 'none' }} />
                    {!webcamActive && (
                      <button onClick={startWebcam} className="flex flex-col items-center gap-3 text-gray-500 hover:text-blue-400 transition-colors">
                        <Camera className="w-16 h-16" />
                        <span className="text-sm font-medium">Click to start webcam</span>
                      </button>
                    )}
                    {webcamActive && (
                      <button onClick={stopWebcam} className="absolute bottom-3 right-3 px-3 py-1.5 bg-red-600/80 rounded-lg text-xs font-medium hover:bg-red-600">
                        Stop
                      </button>
                    )}
                  </>
                )}

                {/* Upload mode */}
                {inputMode === 'upload' && (
                  <>
                    {currentFrame && !videoProgress ? (
                      <img src={currentFrame} alt="Analyzed frame" className="w-full h-full object-contain" />
                    ) : videoProgress ? (
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Analyzing frame {videoProgress.current} of {videoProgress.total}</p>
                        <div className="w-48 h-1.5 bg-white/10 rounded-full mt-2 mx-auto overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(videoProgress.current / videoProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-3 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer w-full h-full justify-center"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
                        <Upload className="w-16 h-16" />
                        <span className="text-sm font-medium">Drop image or video here, or click to browse</span>
                        <span className="text-xs text-gray-600">Supports: JPG, PNG, MP4, MOV</span>
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      </label>
                    )}
                  </>
                )}

                {/* IP Camera mode */}
                {inputMode === 'ipcam' && (
                  <>
                    {ipCamActive ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        {currentFrame ? (
                          <img src={currentFrame} alt="IP Camera frame" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Connecting to camera...</p>
                          </div>
                        )}
                        {analyzing && (
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                            <span className="text-[10px] text-cyan-400">Analyzing...</span>
                          </div>
                        )}
                        {currentFrame && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/80 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-bold">LIVE</span>
                          </div>
                        )}
                        <button onClick={stopIpCam} className="absolute bottom-3 right-3 px-3 py-1.5 bg-red-600/80 rounded-lg text-xs font-medium">Stop</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-6 w-full">
                        <Eye className="w-12 h-12 text-gray-600" />
                        <p className="text-sm text-gray-400 text-center">Connect your phone camera using <strong>IP Webcam</strong> (Android) or <strong>DroidCam</strong></p>
                        <input value={ipCamUrl} onChange={e => setIpCamUrl(e.target.value)}
                          placeholder="http://192.168.18.41:4747/mjpegfeed"
                          className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 text-center" />
                        <button onClick={startIpCam} disabled={!ipCamUrl.trim()}
                          className="px-6 py-2.5 bg-blue-600 rounded-xl text-sm font-medium disabled:opacity-40">
                          Connect Camera
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2">First verify the URL works by opening it in a new browser tab</p>
                        <div className="text-[10px] text-gray-600 text-center max-w-xs mt-2 space-y-0.5">
                          <p><strong className="text-gray-400">DroidCam:</strong> http://IP:4747/mjpegfeed</p>
                          <p><strong className="text-gray-400">IP Webcam:</strong> http://IP:8080/video</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Screen capture mode */}
                {inputMode === 'screen' && (
                  <>
                    <video ref={screenRef} playsInline autoPlay muted className="w-full h-full object-contain" style={{ display: screenActive ? 'block' : 'none' }} />
                    {!screenActive ? (
                      <button onClick={startScreen} className="flex flex-col items-center gap-3 text-gray-500 hover:text-blue-400 transition-colors">
                        <ImageIcon className="w-16 h-16" />
                        <span className="text-sm font-medium">Click to share your screen</span>
                        <span className="text-xs text-gray-600">Share a window playing security footage, a Zoom call, or any video</span>
                      </button>
                    ) : (
                      <button onClick={() => { const s = screenRef.current?.srcObject; if (s) { const ms = s as MediaStream; ms.getTracks().forEach(t => t.stop()); } setScreenActive(false); }}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-red-600/80 rounded-lg text-xs font-medium">Stop</button>
                    )}
                  </>
                )}

                {/* Demo mode */}
                {inputMode === 'demo' && (
                  <div className="flex flex-col items-center gap-4 p-6 w-full">
                    {currentFrame && !analyzing ? (
                      <img src={currentFrame} alt="Demo" className="w-full max-h-48 object-contain rounded-lg" />
                    ) : analyzing ? (
                      <div className="text-center"><Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-2" /><p className="text-sm text-gray-400">Analyzing...</p></div>
                    ) : (
                      <Play className="w-12 h-12 text-gray-600" />
                    )}
                    <p className="text-sm text-gray-400">Try with sample surveillance footage — no camera needed</p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                      {DEMO_IMAGES.map(img => (
                        <button key={img.label} onClick={() => analyzeDemoImage(img.url)} disabled={analyzing}
                          className="py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-40 transition-all">
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Video progress bar */}
              {videoProgress && (
                <div className="px-4 py-2 border-t border-white/10">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Processing video...</span>
                    <span>{videoProgress.current}/{videoProgress.total} frames</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Alert timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl h-full max-h-[600px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <span className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />Alert Timeline
                </span>
                <span className="text-xs text-gray-500">{detectedCount} alert{detectedCount !== 1 ? 's' : ''} / {alerts.length} frames</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 p-8">
                    <Eye className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">{watching ? 'Waiting for frames...' : 'Set a watch target to begin'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {alerts.map(a => (
                      <div key={a.id} className={`p-3 ${a.detected ? 'bg-red-500/5' : ''}`}>
                        <div className="flex gap-3">
                          <img src={a.thumbnail} alt="" className="w-14 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {a.detected
                                ? <AlertTriangle className="w-3 h-3 text-red-400" />
                                : <CheckCircle className="w-3 h-3 text-green-500" />}
                              <span className={`text-[10px] font-bold uppercase ${a.detected ? 'text-red-400' : 'text-green-500'}`}>
                                {a.detected ? `Alert ${a.confidence}%` : 'Normal'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{a.description}</p>
                            <span className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />{new Date(a.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Frames', value: alerts.length, color: 'text-white' },
            { label: 'Alerts', value: detectedCount, color: 'text-red-400' },
            { label: 'Detection Rate', value: alerts.length ? `${Math.round((detectedCount / alerts.length) * 100)}%` : '—', color: 'text-amber-400' },
            { label: 'Status', value: watching ? (webcamActive || screenActive || ipCamActive || inputMode === 'upload' || inputMode === 'demo' ? 'Active' : 'Waiting') : 'Idle', color: watching ? 'text-green-400' : 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Inline Detection Gallery — visible when faces are captured */}
        {faceGallery.length > 0 && (
          <InlineGallery faces={faceGallery} />
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">Built by <span className="text-blue-400">NovaBuild Studios</span></p>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

const Page = dynamic(() => Promise.resolve(Dashboard), { ssr: false });
export default Page;
