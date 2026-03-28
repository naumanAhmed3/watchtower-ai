'use client';

import { Eye } from 'lucide-react';
import Link from 'next/link';

export function Nav() {
  return (
    <nav className="border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              OmniSight
            </span>
            <span className="text-[10px] text-gray-500 block -mt-0.5 hidden sm:block">by NovaBuild Studios</span>
          </div>
        </Link>
        <Link href="/demo" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
          Try Demo
        </Link>
      </div>
    </nav>
  );
}
