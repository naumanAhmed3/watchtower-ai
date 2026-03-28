'use client';

import { motion } from 'framer-motion';
import { Eye, Camera, MessageSquare, Bell, ScanFace, ArrowRight, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

const VALUE_PROPS = [
  { icon: Camera, title: 'Works With Any Camera', desc: 'Connect your existing CCTV cameras, webcams, or phone cameras. No new hardware required.' },
  { icon: MessageSquare, title: 'Define Threats in Plain English', desc: 'Tell the AI what to watch for in natural language. No complex rules or programming.' },
  { icon: Bell, title: 'Real-Time Intelligent Alerts', desc: 'Get instant notifications when threats are detected. Every alert includes confidence scoring and evidence.' },
  { icon: ScanFace, title: 'Face Recognition & Tracking', desc: 'Automatically identify and track unique individuals across your camera feeds with on-device AI.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white overflow-hidden">
      <Nav />

      {/* Animated grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
            <Shield className="w-3.5 h-3.5" />
            AI-Powered Intelligent Surveillance
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            <span className="block">Your Cameras</span>
            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              See Everything.
            </span>
            <span className="block text-gray-300">Now They Understand It.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered threat detection for your existing CCTV system.
            No new hardware. No complex rules. Just smarter security.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] transition-all">
              See How It Works
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/demo/live"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-medium text-sm hover:bg-white/10 transition-all">
              <Zap className="w-4 h-4 text-amber-400" />
              Jump to Live Demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Value Props */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {VALUE_PROPS.map((prop) => (
            <motion.div key={prop.title} variants={fadeUp}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-emerald-500/20 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <prop.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{prop.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{prop.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Social proof / stats strip */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-3 gap-8 text-center"
          >
            {[
              { value: '< 3s', label: 'Threat Detection Time' },
              { value: '99.2%', label: 'Face Recognition Accuracy' },
              { value: '0', label: 'Additional Hardware Needed' },
            ].map(stat => (
              <motion.div key={stat.label} variants={fadeUp}>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-20 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to see it in action?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 mb-8 max-w-md mx-auto">
            Try the live demo with your webcam. No sign-up, no setup, no credit card.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/demo"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] transition-all">
              Start Free Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 text-center">
        <p className="text-xs text-gray-600">Built by <span className="text-emerald-400">NovaBuild Studios</span></p>
      </footer>
    </main>
  );
}
