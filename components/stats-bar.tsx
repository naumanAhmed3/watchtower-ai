'use client';

import type { DemoStats } from '@/lib/types';

export function StatsBar({ stats, watching }: { stats: DemoStats; watching?: boolean }) {
  const items = [
    { label: 'Frames', value: stats.framesProcessed, color: 'text-white' },
    { label: 'Alerts', value: stats.alertsTriggered, color: 'text-red-400' },
    { label: 'Detection Rate', value: stats.framesProcessed ? `${stats.detectionRate}%` : '\u2014', color: 'text-amber-400' },
    { label: 'Persons', value: stats.uniquePersons, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(s => (
        <div key={s.label} className={`bg-white/5 border border-white/10 rounded-xl p-4 text-center ${watching ? 'animate-neon' : ''}`}>
          <p className={`text-xl sm:text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
