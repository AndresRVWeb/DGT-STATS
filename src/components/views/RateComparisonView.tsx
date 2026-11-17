import React, { useState, useEffect } from 'react';
import { Scale, Search } from 'lucide-react';
import type {
  AutoescuelaRecord,
  AutoescuelaSummary,
  NationalOverviewResponse,
  TipoPermisoFilter,
} from '../../types/dgt';
import { fetchCompareSchools, fetchSchools } from '../../lib/dgtApi';
import { MonthlyEvolutionChart } from '../ui/MonthlyEvolutionChart';

interface RateComparisonViewProps {
  anno: number;
  permiso: TipoPermisoFilter;
  overview: NationalOverviewResponse | null;
  onSelectSchoolCode: (codigoDGT: string) => void;
}

export const RateComparisonView: React.FC<RateComparisonViewProps> = ({
  anno,
  permiso,
  overview,
  onSelectSchoolCode,
}) => {
  const defaultCodeB = overview?.destacadas.find((d) => d.codigoDGT !== 'CA0528')?.codigoDGT || 'M0240';
  const [codeA, setCodeA] = useState<string>('CA0528');
  const [codeB, setCodeB] = useState<string>(defaultCodeB);

  const [schoolA, setSchoolA] = useState<AutoescuelaRecord | null>(null);
  const [schoolB, setSchoolB] = useState<AutoescuelaRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [queryA, setQueryA] = useState<string>('');
  const [queryB, setQueryB] = useState<string>('');
  const [resultsA, setResultsA] = useState<AutoescuelaSummary[]>([]);
  const [resultsB, setResultsB] = useState<AutoescuelaSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCompareSchools(codeA, codeB, { anno, permiso })
      .then((res) => {
        if (!cancelled) {
          setSchoolA(res.schoolA);
          setSchoolB(res.schoolB);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codeA, codeB, anno, permiso]);

  useEffect(() => {
    if (!queryA.trim()) {
      setResultsA([]);
      return;
    }
    const t = setTimeout(() => {
      fetchSchools({ anno, permiso: 'Todos', q: queryA, limit: 8 }).then((r) => setResultsA(r.items));
    }, 180);
    return () => clearTimeout(t);
  }, [queryA, anno]);

  useEffect(() => {
    if (!queryB.trim()) {
      setResultsB([]);
      return;
    }
    const t = setTimeout(() => {
      fetchSchools({ anno, permiso: 'Todos', q: queryB, limit: 8 }).then((r) => setResultsB(r.items));
    }, 180);
    return () => clearTimeout(t);
  }, [queryB, anno]);

  const mediaNatTeo = overview?.totales.tasaAprobadosTeorico ?? 68.4;
  const mediaNatPrac = overview?.totales.tasaAprobadosPractico ?? 45.2;
  const mediaNatBrecha = overview?.totales.brechaTeoricoPractico ?? 23.2;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & National Averages */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Scale className="w-4 h-4 text-slate-600" />
          <span>Análisis Comparativo DGT {anno}</span>
          <span aria-hidden="true">·</span>
          <span>{permiso === 'Todos' ? 'Todos los permisos' : `Permiso ${permiso}`}</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight mt-1">
          Comparador de Tasas (Teórico vs. Práctico y Evolución)
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          Contrasta en tiempo real el rendimiento de dos autoescuelas cualesquiera de España frente a las medias nacionales reales de {anno}.
        </p>

        <div className="mt-6 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="text-slate-500 text-[11px] font-sans">Media España Teórico ({anno}):</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {mediaNatTeo.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="text-slate-500 text-[11px] font-sans">Media España Práctico ({anno}):</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {mediaNatPrac.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="text-slate-500 text-[11px] font-sans">Brecha Media Nacional:</span>
            <div className="text-xl font-bold text-amber-700 mt-0.5 tabular-nums">
              {mediaNatBrecha.toFixed(1)} pp
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head Selection & Matrix */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200/80">
          {/* Selector A */}
          <div className="relative space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Autoescuela A {schoolA ? `(${schoolA.nombre} · ${schoolA.codigoDGT})` : ''}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryA}
                onChange={(e) => setQueryA(e.target.value)}
                placeholder="Buscar centro A (ej: EL PASEO, CA0528)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
            {resultsA.length > 0 && (
              <div className="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {resultsA.map((r) => (
                  <button
                    key={r.codigoDGT}
                    onClick={() => {
                      setCodeA(r.codigoDGT);
                      setQueryA('');
                      setResultsA([]);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium text-slate-900 truncate">
                      {r.nombre} ({r.provincia})
                    </span>
                    <span className="font-mono text-slate-500 ml-2 shrink-0">{r.codigoDGT}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector B */}
          <div className="relative space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Autoescuela B {schoolB ? `(${schoolB.nombre} · ${schoolB.codigoDGT})` : ''}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryB}
                onChange={(e) => setQueryB(e.target.value)}
                placeholder="Buscar centro B por nombre o código..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
            {resultsB.length > 0 && (
              <div className="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {resultsB.map((r) => (
                  <button
                    key={r.codigoDGT}
                    onClick={() => {
                      setCodeB(r.codigoDGT);
                      setQueryB('');
                      setResultsB([]);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium text-slate-900 truncate">
                      {r.nombre} ({r.provincia})
                    </span>
                    <span className="font-mono text-slate-500 ml-2 shrink-0">{r.codigoDGT}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        {loading || !schoolA || !schoolB ? (
          <div className="h-56 bg-slate-50 rounded-lg animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-200 text-slate-600 font-semibold font-sans">
                <tr>
                  <th className="py-2.5 px-3">Indicador Oficial DGT</th>
                  <th className="py-2.5 px-3 text-right bg-slate-50/50">
                    <button
                      onClick={() => onSelectSchoolCode(schoolA.codigoDGT)}
                      className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                    >
                      {schoolA.nombre}
                    </button>
                    <div className="text-[11px] font-normal text-slate-500 font-mono">
                      {schoolA.codigoDGT} · {schoolA.provincia}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectSchoolCode(schoolB.codigoDGT)}
                      className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                    >
                      {schoolB.nombre}
                    </button>
                    <div className="text-[11px] font-normal text-slate-500 font-mono">
                      {schoolB.codigoDGT} · {schoolB.provincia}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right text-slate-500 font-normal">Media España</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Tasa Aprobados Teórico</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-slate-50/50 tabular-nums">
                    {schoolA.teorico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {schoolB.teorico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {mediaNatTeo.toFixed(1)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Tasa Aprobados Práctico</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-slate-50/50 tabular-nums">
                    {schoolA.practico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {schoolB.practico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {mediaNatPrac.toFixed(1)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Aptos 1ª Conv. Teórico</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 bg-slate-50/50 tabular-nums">
                    {schoolA.teorico.tasaPrimeraConvocatoria.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 tabular-nums">
                    {schoolB.teorico.tasaPrimeraConvocatoria.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {overview?.totales.tasaPrimeraConvocatoriaTeorico.toFixed(1)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Aptos 1ª Conv. Práctico</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 bg-slate-50/50 tabular-nums">
                    {schoolA.practico.tasaPrimeraConvocatoria.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 tabular-nums">
                    {schoolB.practico.tasaPrimeraConvocatoria.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {overview?.totales.tasaPrimeraConvocatoriaPractico.toFixed(1)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Brecha Teórico - Práctico</td>
                  <td className="py-3 px-3 text-right font-semibold text-amber-700 bg-slate-50/50 tabular-nums">
                    {schoolA.brechaTeoricoPractico.toFixed(1)} pp
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-amber-700 tabular-nums">
                    {schoolB.brechaTeoricoPractico.toFixed(1)} pp
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {mediaNatBrecha.toFixed(1)} pp
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Evaluaciones Totales</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 bg-slate-50/50 tabular-nums">
                    {schoolA.totalPresentados.toLocaleString('es-ES')}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {schoolB.totalPresentados.toLocaleString('es-ES')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">-</td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-slate-800">Tasa Global Ponderada</td>
                  <td className="py-3 px-3 text-right font-bold text-base text-emerald-800 bg-slate-50/50 tabular-nums">
                    {schoolA.tasaGlobalPonderada.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-base text-slate-900 tabular-nums">
                    {schoolB.tasaGlobalPonderada.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {(mediaNatTeo * 0.4 + mediaNatPrac * 0.6).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side by side temporal evolution charts */}
      {schoolA && schoolB && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
            <MonthlyEvolutionChart
              data={schoolA.evolucion}
              title={`Evolución ${anno} · ${schoolA.nombre}`}
              subtitle={`${schoolA.provincia} · Cód. ${schoolA.codigoDGT}`}
              benchmarkTeorico={mediaNatTeo}
              benchmarkPractico={mediaNatPrac}
            />
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
            <MonthlyEvolutionChart
              data={schoolB.evolucion}
              title={`Evolución ${anno} · ${schoolB.nombre}`}
              subtitle={`${schoolB.provincia} · Cód. ${schoolB.codigoDGT}`}
              benchmarkTeorico={mediaNatTeo}
              benchmarkPractico={mediaNatPrac}
            />
          </div>
        </div>
      )}
    </div>
  );
};
