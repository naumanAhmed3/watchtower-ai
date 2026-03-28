'use client';

import { motion } from 'framer-motion';
import { CheckCircle, BarChart3, Users, ScanFace, RotateCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoContext } from '@/lib/demo-context';
import { Nav } from '@/components/nav';
import { InlineGallery } from '@/components/face-gallery';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function ResultsPage() {
  const router = useRouter();
  const { alerts, faceGallery, stats, resetSession } = useDemoContext();

  const handleRunAgain = () => {
    resetSession();
    router.push('/demo/live');
  };

  // Empty state
  if (alerts.length === 0 && faceGallery.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-gray-500" />
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-2xl font-bold mb-3">No Results Yet</motion.h1>
            <motion.p variants={fadeUp} className="text-gray-400 mb-8">Run the live demo first to generate analysis results.</motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/demo/live"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold hover:scale-[1.02] transition-all">
                Go to Live Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Success header */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center">
          <motion.div variants={fadeUp} className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl font-bold mb-2">Analysis Complete</motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400">
            Here&apos;s a summary of everything detected during your session.
          </motion.p>
        </motion.div>

        {/* Stats grid */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BarChart3, label: 'Frames Analyzed', value: stats.framesProcessed, color: 'text-white', bg: 'bg-white/5' },
            { icon: ScanFace, label: 'Alerts Triggered', value: stats.alertsTriggered, color: 'text-red-400', bg: 'bg-red-500/5' },
            { icon: Users, label: 'Unique Persons', value: stats.uniquePersons, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
            { icon: BarChart3, label: 'Detection Rate', value: `${stats.detectionRate}%`, color: 'text-amber-400', bg: 'bg-amber-500/5' },
          ].map(item => (
            <motion.div key={item.label} variants={fadeUp}
              className={`${item.bg} border border-white/10 rounded-2xl p-5 text-center`}>
              <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-[11px] text-gray-500 mt-1">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Gallery */}
        {faceGallery.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <InlineGallery faces={faceGallery} />
          </motion.div>
        )}

        {/* Alert summary */}
        {alerts.filter(a => a.detected).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-red-400" />Detected Alerts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {alerts.filter(a => a.detected).map(a => (
                <div key={a.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
                  <img src={a.thumbnail} alt="" className="w-full aspect-video object-cover" />
                  <div className="p-2">
                    <p className="text-[10px] text-red-400 font-medium">{a.confidence}% confidence</p>
                    <p className="text-[9px] text-gray-500 line-clamp-2">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-8">
          <button onClick={handleRunAgain}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold hover:scale-[1.02] transition-all shadow-lg shadow-emerald-600/20">
            <RotateCcw className="w-4 h-4" />Run Another Demo
          </button>
          <a href="mailto:contact@novabuild.studio"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all">
            Request Full Demo <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        <footer className="text-center py-4 border-t border-white/5">
          <p className="text-xs text-gray-600">Built by <span className="text-emerald-400">NovaBuild Studios</span></p>
        </footer>
      </div>
    </main>
  );
}
