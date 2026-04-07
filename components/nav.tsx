'use client';

import Link from 'next/link';

export function Nav() {
  return (
    <nav className="border-b border-white/[0.06] backdrop-blur-md bg-[#0a0a0f]/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.6)] transition-all duration-300" />
          <span className="text-xs text-white/40 group-hover:text-white/70 tracking-widest uppercase transition-colors duration-300">nauman.devhunt</span>
        </Link>
        <Link href="/demo/live" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
          Try Demo →
        </Link>
      </div>
    </nav>
  );
}
