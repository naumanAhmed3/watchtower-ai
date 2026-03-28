'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import * as ort from 'onnxruntime-web';

const MATCH_THRESHOLD = 0.55;

interface KnownFace {
  id: number;
  descriptors: Float32Array[];
  avgDescriptor: Float32Array;
  sightings: number;
  bestFaceImage?: string;
  bestFaceSize: number;
}

export interface FaceDetectionResult {
  annotatedFrame: string;
  croppedFaces: string[];
  personIds: number[];
}

export function useFaceDetection() {
  const [faceApiReady, setFaceApiReady] = useState(false);
  const knownFacesRef = useRef<KnownFace[]>([]);
  const mediapipeDetectorRef = useRef<FaceDetector | null>(null);
  const sfaceSessionRef = useRef<ort.InferenceSession | null>(null);
  const faceIdCounterRef = useRef(0);

  useEffect(() => {
    async function loadModels() {
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

      try {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
        const session = await ort.InferenceSession.create('/models/face_recognition.onnx', {
          executionProviders: ['webgl', 'wasm'],
        });
        sfaceSessionRef.current = session;
        console.log('SFace ONNX model loaded');
      } catch (err) {
        console.error('SFace ONNX load error:', err);
      }

      try {
        const FACEAPI_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(FACEAPI_CDN);
        await faceapi.nets.faceRecognitionNet.loadFromUri(FACEAPI_CDN);
        await faceapi.nets.faceLandmark68Net.loadFromUri(FACEAPI_CDN);
        console.log('face-api.js fallback loaded');
      } catch (err) {
        console.error('face-api.js load error:', err);
      }

      setFaceApiReady(true);
      console.log('All face models ready');
    }
    loadModels();
  }, []);

  const getSfaceEmbedding = useCallback(async (canvas: HTMLCanvasElement): Promise<Float32Array | null> => {
    const session = sfaceSessionRef.current;
    if (!session) return null;
    try {
      const resized = document.createElement('canvas');
      resized.width = 112;
      resized.height = 112;
      resized.getContext('2d')!.drawImage(canvas, 0, 0, 112, 112);
      const ctx = resized.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, 112, 112);
      const { data } = imageData;
      const float32 = new Float32Array(3 * 112 * 112);
      for (let i = 0; i < 112 * 112; i++) {
        float32[i] = data[i * 4] / 255.0;
        float32[112 * 112 + i] = data[i * 4 + 1] / 255.0;
        float32[2 * 112 * 112 + i] = data[i * 4 + 2] / 255.0;
      }
      const inputTensor = new ort.Tensor('float32', float32, [1, 3, 112, 112]);
      const results = await session.run({ data: inputTensor });
      const outputKey = Object.keys(results)[0];
      const embedding = results[outputKey].data as Float32Array;
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

  const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  };

  const detectFaces = useCallback(async (frameDataUrl: string): Promise<FaceDetectionResult> => {
    if (!faceApiReady) {
      return { annotatedFrame: frameDataUrl, croppedFaces: [], personIds: [] };
    }
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = frameDataUrl;
      });

      let mediapipeBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }> = [];
      if (mediapipeDetectorRef.current) {
        const mpResult = mediapipeDetectorRef.current.detect(img);
        mediapipeBoxes = mpResult.detections
          .map(d => {
            const bb = d.boundingBox!;
            return { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height, confidence: d.categories[0]?.score || 0 };
          })
          .filter(b => b.width >= 40 && b.height >= 40);
      }

      const detections: Array<{ box: typeof mediapipeBoxes[0]; descriptor?: Float32Array }> = [];
      for (const box of mediapipeBoxes) {
        const cropCanvas = document.createElement('canvas');
        const pad = Math.round(Math.max(box.width, box.height) * 0.45);
        const cx = Math.max(0, Math.round(box.x - pad));
        const cy = Math.max(0, Math.round(box.y - pad));
        const cw = Math.min(img.naturalWidth - cx, Math.round(box.width + pad * 2));
        const ch = Math.min(img.naturalHeight - cy, Math.round(box.height + pad * 2));
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        cropCanvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);

        let descriptor: Float32Array | undefined;
        const embedding = await getSfaceEmbedding(cropCanvas);
        if (embedding) {
          descriptor = embedding;
        } else {
          try {
            const det = await faceapi.detectSingleFace(cropCanvas).withFaceLandmarks().withFaceDescriptor();
            if (det) descriptor = det.descriptor;
          } catch {}
        }
        detections.push({ box, descriptor });
      }

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
        let personId = -1;
        const faceSize = box.width * box.height;

        if (descriptor) {
          let bestSim = -1;
          let bestMatchId = -1;
          for (const known of knownFacesRef.current) {
            let sim: number;
            if (descriptor.length === known.avgDescriptor.length) {
              sim = cosineSimilarity(descriptor, known.avgDescriptor);
            } else {
              const dist = faceapi.euclideanDistance(descriptor, known.avgDescriptor);
              sim = 1 - dist;
            }
            if (sim > bestSim) {
              bestSim = sim;
              if (sim >= MATCH_THRESHOLD) bestMatchId = known.id;
            }
          }

          if (bestMatchId === -1) {
            personId = knownFacesRef.current.length + 1;
            knownFacesRef.current.push({
              id: personId,
              descriptors: [descriptor],
              avgDescriptor: new Float32Array(descriptor),
              sightings: 1,
              bestFaceSize: faceSize,
            });
          } else {
            personId = bestMatchId;
            const known = knownFacesRef.current.find(k => k.id === personId)!;
            known.sightings++;
            if (known.descriptors.length < 10) {
              known.descriptors.push(descriptor);
            } else {
              known.descriptors[known.sightings % 10] = descriptor;
            }
            const avg = new Float32Array(128);
            for (const d of known.descriptors) {
              for (let j = 0; j < 128; j++) avg[j] += d[j];
            }
            for (let j = 0; j < 128; j++) avg[j] /= known.descriptors.length;
            known.avgDescriptor = avg;
          }
        } else {
          personId = -(i + 1 + faceIdCounterRef.current);
        }

        facePersonIds.push(personId);

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        const color = personId > 0 ? colors[(personId - 1) % colors.length] : '#ef4444';
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 200));
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const label = `Person ${personId}`;
        const labelW = ctx.measureText(label).width + 12;
        const labelH = 24;
        ctx.fillStyle = color;
        ctx.fillRect(box.x, box.y - labelH, labelW, labelH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(label, box.x + 6, box.y - 7);

        const pad = Math.round(box.width * 0.3);
        const fx = Math.max(0, Math.round(box.x - pad));
        const fy = Math.max(0, Math.round(box.y - pad));
        const fw = Math.min(canvas.width - fx, Math.round(box.width + pad * 2));
        const fh = Math.min(canvas.height - fy, Math.round(box.height + pad * 2));
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = fw;
        faceCanvas.height = fh;
        faceCanvas.getContext('2d')!.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
        croppedFaces.push(faceCanvas.toDataURL('image/jpeg', 0.85));

        if (personId > 0) {
          const known = knownFacesRef.current.find(k => k.id === personId);
          if (known && faceSize > known.bestFaceSize) {
            known.bestFaceImage = faceCanvas.toDataURL('image/jpeg', 0.85);
            known.bestFaceSize = faceSize;
          }
        }
      });

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
        ctx.fillText('\u26a0 DETECTED', 28, 40);
      }

      faceIdCounterRef.current += detections.length;
      return { annotatedFrame: canvas.toDataURL('image/jpeg', 0.7), croppedFaces, personIds: facePersonIds };
    } catch (err) {
      console.error('Face detection error:', err);
      return { annotatedFrame: frameDataUrl, croppedFaces: [], personIds: [] };
    }
  }, [faceApiReady, getSfaceEmbedding]);

  const resetKnownFaces = useCallback(() => {
    knownFacesRef.current = [];
    faceIdCounterRef.current = 0;
  }, []);

  return { detectFaces, faceApiReady, resetKnownFaces };
}
