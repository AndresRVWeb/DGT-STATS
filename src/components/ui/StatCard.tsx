import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: string;
    isPositive: boolean;
    reference: string;
  };
  icon?: LucideIcon;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  badgeText,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="truncate">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        {badgeText && !Icon && (
          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-display text-slate-900 tracking-tight font-mono tabular-nums">
          {value}
        </span>
      </div>

      {(delta || subtitle) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          {delta && (
            <>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  delta.isPositive ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {delta.isPositive ? `+${delta.value}` : delta.value}
              </span>
              <span>vs</span>
              <span className="truncate text-slate-500">{delta.reference}</span>
            </>
          )}
          {subtitle && !delta && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
