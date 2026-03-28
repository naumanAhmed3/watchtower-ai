'use client';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TOTAL = 120;

export function CountdownTimer({ timeRemaining }: { timeRemaining: number }) {
  const progress = timeRemaining / TOTAL;
  const offset = CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const strokeColor =
    timeRemaining > 30 ? '#10b981' :  // emerald
    timeRemaining > 10 ? '#f59e0b' :  // amber
    '#ef4444';                          // red

  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={RADIUS} fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>
        <span className="text-sm font-mono font-bold" style={{ color: strokeColor }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
