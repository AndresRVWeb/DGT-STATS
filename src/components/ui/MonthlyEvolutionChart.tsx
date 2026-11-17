import React, { useState } from 'react';
import type { EvolucionMensual } from '../../types/dgt';

interface MonthlyEvolutionChartProps {
  data: EvolucionMensual[];
  title?: string;
  subtitle?: string;
  benchmarkTeorico?: number;
  benchmarkPractico?: number;
}

export const MonthlyEvolutionChart: React.FC<MonthlyEvolutionChartProps> = ({
  data,
  title = 'Evolución Mensual de Tasas de Aprobados',
  subtitle = 'Porcentaje oficial de aptos en prueba teórica y prueba de circulación',
  benchmarkTeorico,
  benchmarkPractico,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 border border-slate-200/80 rounded-lg bg-slate-50/40">
        No hay datos mensuales disponibles para este filtro.
      </div>
    );
  }

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold font-display text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Clean inline legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
            <span>Teórico (%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span>Práctico (%)</span>
          </span>
        </div>
      </div>

      {/* Hover Tooltip Bar (fixed height so no layout jitter) */}
      <div className="h-7 px-3 rounded-md bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs font-mono">
        {hovered ? (
          <>
            <span className="font-sans font-semibold text-slate-800">
              {hovered.mes} {hovered.anno}
            </span>
            <div className="flex items-center gap-4 tabular-nums">
              <span className="text-slate-700">
                Teórico: <strong className="text-slate-900">{hovered.teoricoTasa.toFixed(1)}%</strong> ({hovered.teoricoAptos}/{hovered.teoricoAptos + hovered.teoricoNoAptos})
              </span>
              <span className="text-emerald-800">
                Práctico: <strong className="text-emerald-700">{hovered.practicoTasa.toFixed(1)}%</strong> ({hovered.practicoAptos}/{hovered.practicoAptos + hovered.practicoNoAptos})
              </span>
            </div>
          </>
        ) : (
          <span className="font-sans text-slate-500">
            Pasa el cursor sobre cualquier mes para ver el desglose exacto de aptos y evaluaciones.
          </span>
        )}
      </div>

      {/* Minimalist Bar Chart */}
      <div className="relative pt-4 pb-1">
        {/* Horizontal Grid Lines */}
        <div className="relative h-48 flex items-end gap-2 sm:gap-3 border-b border-slate-200 pb-0.5">
          {[25, 50, 75, 100].map((pct) => (
            <div
              key={pct}
              className="absolute left-0 right-0 border-t border-dashed border-slate-200/70 pointer-events-none flex items-center"
              style={{ bottom: `${pct}%` }}
            >
              <span className="text-[10px] font-mono text-slate-400 -mt-4 bg-white pr-1 tabular-nums">
                {pct}%
              </span>
            </div>
          ))}

          {benchmarkTeorico !== undefined && benchmarkTeorico > 0 && (
            <div
              className="absolute left-6 right-0 border-t border-slate-400/70 pointer-events-none"
              style={{ bottom: `${benchmarkTeorico}%` }}
              title={`Media Teórico: ${benchmarkTeorico}%`}
            />
          )}
          {benchmarkPractico !== undefined && benchmarkPractico > 0 && (
            <div
              className="absolute left-6 right-0 border-t border-emerald-500/60 pointer-events-none"
              style={{ bottom: `${benchmarkPractico}%` }}
              title={`Media Práctico: ${benchmarkPractico}%`}
            />
          )}

          <div className="w-6 shrink-0" />

          {data.map((m, idx) => (
            <div
              key={`${m.anno}-${m.mesNumero}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative z-10"
            >
              <div className="w-full h-full flex items-end justify-center gap-1 px-0.5">
                <div
                  className="w-2.5 sm:w-3.5 bg-slate-800 group-hover:bg-slate-950 rounded-t-xs transition-all duration-200"
                  style={{ height: `${Math.min(100, Math.max(2, m.teoricoTasa))}%` }}
                />
                <div
                  className="w-2.5 sm:w-3.5 bg-emerald-600 group-hover:bg-emerald-500 rounded-t-xs transition-all duration-200"
                  style={{ height: `${Math.min(100, Math.max(2, m.practicoTasa))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center gap-2 sm:gap-3 pt-2">
          <div className="w-6 shrink-0" />
          {data.map((m) => (
            <div
              key={`lbl-${m.anno}-${m.mesNumero}`}
              className="flex-1 text-center text-[11px] font-mono text-slate-600"
            >
              {m.mes}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
