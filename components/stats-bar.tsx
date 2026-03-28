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
    <div className="grid grid-cols-4 gap-3">
      {items.map(s => (
        <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
