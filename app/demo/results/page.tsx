'use client';

import { motion } from 'framer-motion';
import { CheckCircle, BarChart3, Users, ScanFace, RotateCcw, ArrowRight, Shield, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoContext } from '@/lib/demo-context';
import { Nav } from '@/components/nav';
import { InlineGallery } from '@/components/face-gallery';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const num = typeof value === 'string' ? parseInt(value) || 0 : value;
  return <span className="tabular-nums">{num}{suffix}</span>;
}

export default function ResultsPage() {
  const router = useRouter();
  const { alerts, faceGallery, stats, resetSession } = useDemoContext();

  const handleRunAgain = () => {
    resetSession();
    router.push('/demo/live');
  };

  const hasData = alerts.length > 0;
  const detectedAlerts = alerts.filter(a => a.detected);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header — always show */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center">
          <motion.div variants={fadeUp} className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${hasData ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/10'}`}>
            {hasData ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <Eye className="w-8 h-8 text-gray-500" />}
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl font-bold mb-2">
            {hasData ? 'Analysis Complete' : 'Session Summary'}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 text-sm">
            {hasData
              ? `${alerts.length} frames analyzed · ${detectedAlerts.length} alerts triggered · ${stats.uniquePersons} unique persons`
              : 'No frames were captured in this session. Try running the demo with your camera enabled.'}
          </motion.p>
        </motion.div>

        {/* Stats grid — ALWAYS show (even with zeros) */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BarChart3, label: 'Frames Analyzed', value: stats.framesProcessed, color: 'text-white', border: 'border-white/10' },
            { icon: ScanFace, label: 'Alerts Triggered', value: stats.alertsTriggered, color: 'text-red-400', border: stats.alertsTriggered > 0 ? 'border-red-500/20 animate-neon' : 'border-white/10' },
            { icon: Users, label: 'Unique Persons', value: stats.uniquePersons, color: 'text-emerald-400', border: stats.uniquePersons > 0 ? 'border-emerald-500/20' : 'border-white/10' },
            { icon: Shield, label: 'Detection Rate', value: stats.detectionRate, suffix: '%', color: 'text-amber-400', border: 'border-white/10' },
          ].map((item, i) => (
            <motion.div key={item.label} variants={fadeUp} transition={{ delay: 0.1 * i }}
              className={`bg-white/[0.03] border ${item.border} rounded-2xl p-5 text-center backdrop-blur-sm`}>
              <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2 opacity-60`} />
              <p className={`text-3xl sm:text-2xl font-bold ${item.color}`}>
                <AnimatedNumber value={item.value} suffix={item.suffix} />
              </p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Session insight — always show */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />Session Insight
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {hasData ? (
              detectedAlerts.length > 0
                ? `AI detected ${detectedAlerts.length} potential incident${detectedAlerts.length > 1 ? 's' : ''} across ${alerts.length} analyzed frames. ${stats.uniquePersons > 0 ? `${stats.uniquePersons} unique individual${stats.uniquePersons > 1 ? 's were' : ' was'} identified via face recognition.` : 'No faces were detected in the captured frames.'} Detection confidence averaged ${detectedAlerts.length > 0 ? Math.round(detectedAlerts.reduce((s, a) => s + a.confidence, 0) / detectedAlerts.length) : 0}%.`
                : `${alerts.length} frames were analyzed with no incidents detected matching your criteria. The monitored area appears secure during the observation window.`
            ) : (
              'Start a live demo session to begin AI-powered monitoring. The system will analyze camera frames in real-time and report any activity matching your defined rules.'
            )}
          </p>
        </motion.div>

        {/* Face Gallery — show placeholder if no faces */}
        {faceGallery.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <InlineGallery faces={faceGallery} />
          </motion.div>
        ) : hasData ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 text-center">
            <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No faces were detected in the analyzed frames</p>
            <p className="text-[10px] text-gray-600 mt-1">Face recognition requires clear frontal views within detection range</p>
          </motion.div>
        ) : null}

        {/* Alert summary — show if any detected */}
        {detectedAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-red-400" />Detected Alerts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {detectedAlerts.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                  className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-red-500/20 transition-colors">
                  <img src={a.thumbnail} alt="" className="w-full aspect-video object-cover" />
                  <div className="p-2">
                    <p className="text-[10px] text-red-400 font-medium">{a.confidence}% confidence</p>
                    <p className="text-[9px] text-gray-500 line-clamp-2">{a.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-8">
          <button onClick={handleRunAgain}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold hover:scale-[1.02] transition-all shadow-lg shadow-emerald-600/20">
            <RotateCcw className="w-4 h-4" />Run Another Demo
          </button>
          <Link href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all">
            Back to Overview <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <footer className="text-center py-6 border-t border-white/[0.06]">
          <a href="#" className="group inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-emerald-500 group-hover:shadow-[0_0_6px_rgba(16,185,129,0.4)] transition-all duration-300" />
            <span className="text-[10px] text-white/20 group-hover:text-emerald-400 transition-colors duration-300">nauman.devhunt</span>
          </a>
        </footer>
      </div>
    </main>
  );
}
