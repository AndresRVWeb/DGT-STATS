import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  Award,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import type { NationalOverviewResponse } from '../../types/dgt';
import { StatCard } from '../ui/StatCard';
import { PerformanceGauge } from '../ui/PerformanceGauge';
import { MonthlyEvolutionChart } from '../ui/MonthlyEvolutionChart';
import { MESES_NOMBRES } from '../../lib/dgtParser';

interface DashboardViewProps {
  overview: NationalOverviewResponse | null;
  loading: boolean;
  onSelectSchoolCode: (codigoDGT: string) => void;
  onNavigateToRanking: (provincia?: string) => void;
  onNavigateToComparador: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  loading,
  onSelectSchoolCode,
  onNavigateToRanking,
  onNavigateToComparador,
}) => {
  const [showAllProvinces, setShowAllProvinces] = useState(false);

  if (loading || !overview) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-32 bg-white border border-slate-200/80 rounded-xl p-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-lg" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200/80 rounded-xl" />
      </div>
    );
  }

  const { totales, elPaseo, provincias, destacadas, evolucionNacional, anno, ultimoMesDisponible, permiso, mesSeleccionado } = overview;
  const cadizStats = provincias.find((p) => p.codigoProvincia === '11' || p.nombre.toLowerCase().includes('cádiz')) || provincias[0];
  const ultimoMesLabel = MESES_NOMBRES[ultimoMesDisponible - 1] || `Mes ${ultimoMesDisponible}`;
  const periodoTexto = mesSeleccionado === 'all'
    ? `Acumulado Ene–${ultimoMesLabel} ${anno}`
    : `${MESES_NOMBRES[Number(mesSeleccionado) - 1] || mesSeleccionado} ${anno}`;

  const visibleProvinces = showAllProvinces ? provincias : provincias.slice(0, 8);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Executive DGT Context Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Microdatos Oficiales DGT
              </span>
              <span aria-hidden="true">·</span>
              <span>{periodoTexto}</span>
              <span aria-hidden="true">·</span>
              <span>{permiso === 'Todos' ? 'Todos los permisos' : `Permiso ${permiso}`}</span>
              <span aria-hidden="true">·</span>
              <span>{provincias.length} provincias y ciudades autónomas</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              Observatorio Nacional de Autoescuelas en España ({anno})
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Extracción directa y consolidación mensual de los ficheros oficiales publicados por la Dirección General de Tráfico.
              Cada tasa se calcula con precisión matemática sobre exámenes reales realizados en toda España.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToRanking('Cádiz')}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver Ranking Cádiz
            </button>
            {elPaseo && (
              <button
                onClick={() => onSelectSchoolCode(elPaseo.codigoDGT)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Ficha El Paseo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Primary National KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Autoescuelas Activas (España)"
          value={totales.totalAutoescuelas.toLocaleString('es-ES')}
          subtitle={`${totales.totalSecciones.toLocaleString('es-ES')} secciones autorizadas`}
          icon={Building2}
        />
        <StatCard
          title="Evaluaciones Reales Procesadas"
          value={totales.totalAlumnosExamen.toLocaleString('es-ES')}
          subtitle={`${totales.totalEvaluacionesTeorico.toLocaleString('es-ES')} teo. · ${totales.totalEvaluacionesPractico.toLocaleString('es-ES')} prác.`}
          icon={Users}
        />
        <StatCard
          title="Tasa Media Teórico (España)"
          value={`${totales.tasaAprobadosTeorico.toFixed(1)}%`}
          subtitle={`1ª conv. sobre total: ${totales.tasaPrimeraConvocatoriaTeorico.toFixed(1)}%`}
          icon={GraduationCap}
        />
        <StatCard
          title="Tasa Media Práctico (España)"
          value={`${totales.tasaAprobadosPractico.toFixed(1)}%`}
          subtitle={`Brecha teórica-práctica: ${totales.brechaTeoricoPractico.toFixed(1)} pp`}
          icon={Award}
        />
      </div>

      {/* Monthly National Trend Chart */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <MonthlyEvolutionChart
          data={evolucionNacional}
          title={`Evolución Mensual Nacional ${anno} (${permiso === 'Todos' ? 'Todos los permisos' : `Permiso ${permiso}`})`}
          subtitle={`Serie temporal real extraída mes a mes de dgt.es hasta ${ultimoMesLabel} ${anno}`}
          benchmarkTeorico={totales.tasaAprobadosTeorico}
          benchmarkPractico={totales.tasaAprobadosPractico}
        />
      </div>

      {/* Spotlight: Autoescuela El Paseo (CA0528) & Provincia de Cádiz */}
      {elPaseo && cadizStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono font-semibold text-emerald-800">REFERENCIA CÁDIZ</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">Cód. DGT {elPaseo.codigoDGT}</span>
                  <span aria-hidden="true">·</span>
                  <span>{elPaseo.numSecciones} secciones</span>
                </div>
                <button
                  onClick={() => onSelectSchoolCode(elPaseo.codigoDGT)}
                  className="text-xs font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Abrir auditoría completa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold font-display text-slate-900">
                    Autoescuela {elPaseo.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Datos reales consolidados de la DGT en {periodoTexto} · Centro de examen: {elPaseo.centroExamenPrincipal}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    {elPaseo.tasaGlobalPonderada.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Tasa Global Ponderada</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PerformanceGauge
                  label={`Examen Teórico (${permiso === 'Todos' ? 'General' : `Permiso ${permiso}`})`}
                  value={elPaseo.teorico.tasaAprobados}
                  benchmark={cadizStats.tasaMediaTeorico}
                  benchmarkLabel={`Media ${cadizStats.nombre}`}
                  sublabel={`${elPaseo.teorico.aptos} aptos de ${elPaseo.teorico.total} evaluaciones`}
                />
                <PerformanceGauge
                  label="Examen Práctico de Circulación"
                  value={elPaseo.practico.tasaAprobados}
                  benchmark={cadizStats.tasaMediaPractico}
                  benchmarkLabel={`Media ${cadizStats.nombre}`}
                  sublabel={`${elPaseo.practico.aptos} aptos de ${elPaseo.practico.total} evaluaciones`}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Secciones activas: <strong className="text-slate-800 font-mono">{elPaseo.numSecciones}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  1ª conv. teórico: <strong className="text-slate-800 font-mono">{elPaseo.teorico.tasaPrimeraConvocatoria.toFixed(1)}%</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  1ª conv. práctico: <strong className="text-slate-800 font-mono">{elPaseo.practico.tasaPrimeraConvocatoria.toFixed(1)}%</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                Total evaluaciones: {elPaseo.totalPresentados.toLocaleString('es-ES')}
              </span>
            </div>
          </div>

          {/* Right Col: Real Cádiz Provincial Stats */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Provincia de {cadizStats.nombre}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Cód. {cadizStats.codigoProvincia}</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Autoescuelas activas:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {cadizStats.totalAutoescuelas.toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Secciones registradas:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {cadizStats.totalSecciones.toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Evaluaciones reales:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {cadizStats.totalAlumnos.toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Tasa media teórico:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {cadizStats.tasaMediaTeorico.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Tasa media práctico:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {cadizStats.tasaMediaPractico.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-600">Brecha Teórico - Práctico:</span>
                  <span className="font-mono font-semibold text-amber-700 tabular-nums">
                    {(cadizStats.tasaMediaTeorico - cadizStats.tasaMediaPractico).toFixed(1)} pp
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => onNavigateToRanking(cadizStats.nombre)}
                className="w-full py-2 text-xs font-semibold text-center text-slate-900 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200/80 transition-colors cursor-pointer"
              >
                Explorar todas las de {cadizStats.nombre}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top National High-Volume Centers Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900">
              Top Nacional de Autoescuelas (Muestra ≥ 150 Evaluaciones)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Centros reales de España con mayor tasa global ponderada en {periodoTexto}
            </p>
          </div>
          <button
            onClick={() => onNavigateToRanking()}
            className="text-xs font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>Ranking completo ({totales.totalAutoescuelas.toLocaleString('es-ES')})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Autoescuela</th>
                <th className="py-3 px-4">Provincia</th>
                <th className="py-3 px-4 text-right">Evaluaciones</th>
                <th className="py-3 px-4 text-right">% Teórico</th>
                <th className="py-3 px-4 text-right">% Práctico</th>
                <th className="py-3 px-4 text-right">Tasa Global</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {destacadas.map((ae, idx) => (
                <tr key={ae.codigoDGT} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="font-semibold text-slate-900">{ae.nombre}</div>
                    <div className="text-[11px] text-slate-500">
                      Cód. {ae.codigoDGT} · {ae.numSecciones} secc. · {ae.centroExamenPrincipal}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700">{ae.provincia}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                    {ae.totalPresentados.toLocaleString('es-ES')}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                    {ae.teorico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                    {ae.practico.tasaAprobados.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums">
                    {ae.tasaGlobalPonderada.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <button
                      onClick={() => onSelectSchoolCode(ae.codigoDGT)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All 52 Spanish Provinces Grid */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900">
              Mapa Estadístico por Provincias de España ({provincias.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rendimiento real agregado en {periodoTexto}. Haz clic en cualquier provincia para ver su ranking completo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllProvinces(!showAllProvinces)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md border border-slate-200 cursor-pointer whitespace-nowrap"
            >
              {showAllProvinces ? 'Mostrar principales (8)' : `Ver las ${provincias.length} provincias`}
            </button>
            <button
              onClick={onNavigateToComparador}
              className="text-xs font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Comparador</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {visibleProvinces.map((prov) => (
            <button
              key={prov.nombre}
              onClick={() => onNavigateToRanking(prov.nombre)}
              className="text-left p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                <span className="truncate">{prov.nombre}</span>
                <span className="font-mono text-slate-400 font-normal shrink-0 ml-2">
                  {prov.codigoProvincia}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {prov.totalAutoescuelas.toLocaleString('es-ES')} autoescuelas · {prov.totalSecciones.toLocaleString('es-ES')} secc.
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Teórico:</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {prov.tasaMediaTeorico.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Práctico:</span>
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {prov.tasaMediaPractico.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                  <span className="text-slate-500">Evaluaciones:</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    {prov.totalAlumnos.toLocaleString('es-ES')}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
