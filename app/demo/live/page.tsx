'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Eye, Square, AlertTriangle, CheckCircle, Clock, Loader2, SwitchCamera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDemoContext } from '@/lib/demo-context';
import { useWebcam } from '@/lib/use-webcam';
import { Nav } from '@/components/nav';
import { StatsBar } from '@/components/stats-bar';
import { CountdownTimer } from '@/components/countdown-timer';

const EXAMPLES = ['Person not wearing safety vest', 'Unauthorized person in restricted zone', 'Worker fallen or lying on ground', 'Fire or smoke detected', 'Unattended package or object', 'Forklift in pedestrian area'];

export default function LiveDemoPage() {
  const router = useRouter();
  const {
    prompt, setPrompt, alerts, stats, analyzing, currentFrame,
    analyzeFrame, timeRemaining, timerActive, startSession, endSession, faceApiReady,
  } = useDemoContext();
  const { videoRef, canvasRef, webcamActive, startWebcam, stopWebcam, captureFrame, switchCamera } = useWebcam();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWatching = timerActive;

  // Auto-navigate to results when timer ends
  useEffect(() => {
    if (!timerActive && timeRemaining === 0) {
      stopWebcam();
      if (intervalRef.current) clearInterval(intervalRef.current);
      router.push('/demo/results');
    }
  }, [timerActive, timeRemaining, stopWebcam, router]);

  // Capture loop — every 5 seconds while watching + webcam active
  useEffect(() => {
    if (!isWatching || !webcamActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const capture = () => {
      if (analyzing) return;
      const frame = captureFrame();
      if (frame) analyzeFrame(frame);
    };
    intervalRef.current = setInterval(capture, 5000);
    capture();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isWatching, webcamActive, analyzing, captureFrame, analyzeFrame]);

  const handleStartWatching = useCallback(async () => {
    if (!prompt.trim()) return;
    if (!webcamActive) await startWebcam();
    startSession();
  }, [prompt, webcamActive, startWebcam, startSession]);

  const handleStop = useCallback(() => {
    endSession();
    stopWebcam();
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push('/demo/results');
  }, [endSession, stopWebcam, router]);

  const detectedCount = alerts.filter(a => a.detected).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
      <Nav />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Prompt + Timer bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-300 mb-2 block">What should AI watch for?</label>
              <div className="flex gap-3">
                <input
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the activity to detect..."
                  disabled={isWatching}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                />
                {!isWatching ? (
                  <button onClick={handleStartWatching} disabled={!prompt.trim() || !faceApiReady}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-40 transition-all animate-glow">
                    <Eye className="w-4 h-4" />Watch
                  </button>
                ) : (
                  <button onClick={handleStop}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                    <Square className="w-4 h-4" />Stop
                  </button>
                )}
              </div>
              {!isWatching && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setPrompt(ex)}
                      className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              {!faceApiReady && (
                <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />Loading AI models...
                </p>
              )}
            </div>
            {isWatching && <CountdownTimer timeRemaining={timeRemaining} />}
          </div>
        </motion.div>

        {/* Main grid: Feed + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Webcam feed */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-3">
            <div className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${isWatching ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-white/10'}`}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />Live Camera
                </span>
                <div className="flex items-center gap-3">
                  {analyzing && <span className="text-xs text-cyan-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</span>}
                  {webcamActive && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-red-400 font-medium">LIVE</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="aspect-video bg-black relative flex items-center justify-center">
                <video ref={videoRef} playsInline autoPlay muted
                  className="w-full h-full object-contain"
                  style={{ display: webcamActive ? 'block' : 'none' }} />

                {/* Scan line overlay when monitoring */}
                {isWatching && webcamActive && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-scan-line" />
                  </div>
                )}

                {/* Camera switch button */}
                {webcamActive && (
                  <button onClick={switchCamera}
                    className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
                    title="Switch camera">
                    <SwitchCamera className="w-4.5 h-4.5" />
                  </button>
                )}

                {!webcamActive && (
                  <button onClick={() => startWebcam()}
                    className="flex flex-col items-center gap-3 text-gray-500 hover:text-emerald-400 transition-colors">
                    <Camera className="w-16 h-16" />
                    <span className="text-sm font-medium">Click to start webcam</span>
                    <span className="text-xs text-gray-600">Camera access required for live demo</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Alert timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2">
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
                    <p className="text-sm">{isWatching ? 'Waiting for frames...' : 'Start watching to see alerts'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {alerts.map((a, idx) => (
                      <motion.div key={a.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-3 ${a.detected ? 'bg-red-500/5' : ''}`}>
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
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatsBar stats={stats} watching={isWatching} />
        </motion.div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
