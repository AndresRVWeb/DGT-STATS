import React from 'react';

interface PerformanceGaugeProps {
  label: string;
  value: number; // e.g. 81.76
  benchmark: number; // e.g. 68.4
  benchmarkLabel?: string;
  sublabel?: string;
}

export const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({
  label,
  value,
  benchmark,
  benchmarkLabel = 'Media DGT',
  sublabel,
}) => {
  const diff = Number((value - benchmark).toFixed(1));
  const isAbove = diff >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-800">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            {value.toFixed(1)}%
          </span>
          <span
            className={`font-mono text-[11px] tabular-nums font-semibold ${
              isAbove ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {isAbove ? `+${diff}%` : `${diff}%`}
          </span>
        </div>
      </div>

      {/* Progress track with official benchmark marker */}
      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 70 ? 'bg-emerald-600' : value >= 50 ? 'bg-sky-600' : 'bg-amber-600'
          }`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
        {/* Benchmark line marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
          style={{ left: `${benchmark}%` }}
          title={`${benchmarkLabel}: ${benchmark}%`}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{sublabel || 'Tasa oficial calculada'}</span>
        <span className="font-mono">
          Ref. {benchmarkLabel}: {benchmark}%
        </span>
      </div>
    </div>
  );
};
