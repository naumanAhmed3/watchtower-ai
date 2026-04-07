'use client';

import { motion } from 'framer-motion';
import { Camera, MessageSquare, Bell, ScanFace, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

const FEATURES = [
  { icon: Camera, title: 'Works With Any Camera', desc: 'Connects to existing CCTV infrastructure. No new hardware needed. IP cameras, webcams, RTSP feeds.' },
  { icon: MessageSquare, title: 'Plain English Rules', desc: 'Guards define threats naturally: "Person in restricted area after 6pm" or "Forklift in pedestrian zone".' },
  { icon: Bell, title: 'Real-Time Alerts', desc: 'Instant notifications when AI detects a match. Sub-3-second response time with frame evidence.' },
  { icon: ScanFace, title: 'Face Recognition', desc: 'On-device face detection and tracking. Identify repeat visitors, track individuals across frames.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/8 blur-[120px]" />
      </div>

      <Nav />

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 sm:pt-32 pb-16 sm:pb-24">
        <motion.div className="max-w-3xl" {...fadeUp}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-white/40 tracking-wide">Client Project — Atlas Freight &amp; Logistics</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            AI{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Surveillance
            </span>{' '}
            System
          </h1>

          <p className="text-lg sm:text-xl text-white/40 max-w-xl leading-relaxed mb-4">
            Built for a warehouse operator monitoring 12 facilities with 200+ cameras
          </p>

          <p className="text-sm text-white/25 max-w-lg leading-relaxed mb-10">
            Atlas Freight&apos;s security team was manually monitoring 200+ CCTV feeds across 12 warehouses. Incidents — falls, unauthorized access, safety violations — went unnoticed for an average of 45 minutes. They needed AI that watches everything simultaneously and alerts instantly.
          </p>

          <Link href="/demo/live" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            Try Live Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Challenge → Solution */}
      <section className="relative max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <span className="text-[10px] text-white/20 tracking-[0.2em] uppercase">The Challenge</span>
            <p className="text-sm text-white/40 leading-relaxed mt-3">
              200+ cameras across 12 warehouses, but only 8 guards on rotation. By the time someone noticed an incident on a feed, the average response time was 45 minutes. Safety violations, unauthorized access after hours, and workplace injuries were going unreported.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <span className="text-[10px] text-white/20 tracking-[0.2em] uppercase">The Solution</span>
            <p className="text-sm text-white/40 leading-relaxed mt-3">
              An AI layer that sits on top of their existing cameras. Guards write rules in plain English — &ldquo;person in hard-hat zone without helmet&rdquo; or &ldquo;forklift in pedestrian area.&rdquo; The system watches every feed simultaneously and alerts within seconds, with frame evidence and face tracking.
            </p>
          </motion.div>
        </div>

        {/* Client card */}
        <motion.div className="mt-12 inline-flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]" {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 flex items-center justify-center text-lg">🏭</div>
          <div>
            <p className="text-sm font-medium text-white/70">Atlas Freight &amp; Logistics</p>
            <p className="text-xs text-white/30">Warehouse Operations · 12 Facilities · 200+ Cameras</p>
          </div>
          <div className="hidden sm:block ml-4 pl-4 border-l border-white/[0.06]">
            <p className="text-xs text-emerald-400/80 italic">&ldquo;Response time: 45 min → 30 seconds&rdquo;</p>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative max-w-5xl mx-auto px-6 pb-24">
        <span className="text-[10px] text-white/20 tracking-[0.2em] uppercase">Key Capabilities</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {FEATURES.map((f, i) => (
            <motion.div key={i} className="group p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300" {...fadeUp} transition={{ delay: 0.1 * i }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow">
                <f.icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">{f.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Portfolio disclaimer */}
      <section className="relative max-w-5xl mx-auto px-6 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-4">
            <Shield className="w-3.5 h-3.5 text-amber-400/60" />
            <span className="text-[11px] text-white/30">Portfolio Preview</span>
          </div>
          <p className="text-xs text-white/20 leading-relaxed max-w-lg mx-auto">
            What you see here is a curated subset of features, shared with our client&apos;s permission for portfolio purposes. The production system delivered to Atlas Freight includes multi-camera grid monitoring, shift-based rule scheduling, incident report generation, integration with their existing access control systems, and a mobile app for on-the-go alerts.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative max-w-5xl mx-auto px-6 pb-20 text-center">
        <p className="text-sm text-white/20 mb-6">See it in action with your camera</p>
        <Link href="/demo/live" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
          Try the Live Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] relative">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <a href="#" className="group inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-emerald-500 group-hover:shadow-[0_0_6px_rgba(16,185,129,0.4)] transition-all duration-300" />
            <span className="text-[10px] text-white/20 group-hover:text-emerald-400 transition-colors duration-300">nauman.devhunt</span>
          </a>
          <span className="text-[10px] text-white/10">AI Surveillance System</span>
        </div>
      </footer>
    </div>
  );
}
