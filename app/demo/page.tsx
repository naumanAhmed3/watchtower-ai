'use client';

import { motion } from 'framer-motion';
import { Camera, MessageSquare, Cpu, Bell, ArrowRight, Flame, PersonStanding, Package, CarFront, Siren, HandMetal } from 'lucide-react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const slideRight = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } };

const STEPS = [
  { num: '01', icon: Camera, title: 'Connect Your Cameras', desc: 'Use your webcam, phone camera, or any IP camera. The system works with your existing hardware.' },
  { num: '02', icon: MessageSquare, title: 'Define Security Rules', desc: 'Describe what to watch for in plain English: "person entering restricted area" or "fire or smoke".' },
  { num: '03', icon: Cpu, title: 'AI Monitors in Real-Time', desc: 'Our AI analyzes every frame using GPT-4o vision and on-device face recognition. No cloud dependency for detection.' },
  { num: '04', icon: Bell, title: 'Receive Instant Alerts', desc: 'Get real-time alerts with confidence scores, annotated frames, and identified persons of interest.' },
];

const DETECT_EXAMPLES = [
  { icon: PersonStanding, label: 'Person in restricted zone' },
  { icon: Flame, label: 'Fire or smoke' },
  { icon: Siren, label: 'Suspicious behavior' },
  { icon: Package, label: 'Unattended bag' },
  { icon: HandMetal, label: 'Physical altercation' },
  { icon: CarFront, label: 'Vehicle violation' },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
      <Nav />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.p variants={fadeUp} className="text-emerald-400 text-sm font-medium mb-3">How It Works</motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-bold mb-4">
            From Camera to{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Intelligence
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 max-w-lg mx-auto">
            Four simple steps to transform any camera into a smart security system.
          </motion.p>
        </motion.div>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-6">
          {STEPS.map((step, i) => (
            <motion.div key={step.num} variants={slideRight}
              className="flex gap-5 items-start bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] transition-all group">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <step.icon className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[10px] font-mono text-emerald-500/60">{step.num}</span>
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block absolute left-10 mt-16 w-px h-6 bg-gradient-to-b from-emerald-500/30 to-transparent" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* What Can It Detect */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-2xl font-bold mb-6 text-center">
            What Can It Detect?
          </motion.h2>
          <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DETECT_EXAMPLES.map(ex => (
              <motion.div key={ex.label} variants={fadeUp}
                className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 hover:border-emerald-500/20 transition-all">
                <ex.icon className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-gray-300">{ex.label}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeUp} className="text-center text-xs text-gray-500 mt-4">
            ...and anything else you can describe in natural language
          </motion.p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-3xl p-10 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to try it yourself?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 mb-6 max-w-md mx-auto">
            The live demo uses your webcam and runs for 2 minutes. Define a threat, and watch the AI detect it in real-time.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/demo/live"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] transition-all">
              Try Live Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="text-[11px] text-gray-500 mt-4">
            No sign-up required. Camera access needed.
          </motion.p>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.06] py-6 text-center">
        <a href="#" className="group inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-emerald-500 group-hover:shadow-[0_0_6px_rgba(16,185,129,0.4)] transition-all duration-300" />
          <span className="text-[10px] text-white/20 group-hover:text-emerald-400 transition-colors duration-300">nauman.devhunt</span>
        </a>
      </footer>
    </main>
  );
}
