import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  MapPin,
  FileText,
} from 'lucide-react';
import type {
  AutoescuelaRecord,
  AutoescuelaSummary,
  NationalOverviewResponse,
  SeccionAutoescuela,
  TipoPermisoFilter,
} from '../../types/dgt';
import { fetchSchools } from '../../lib/dgtApi';
import { PerformanceGauge } from '../ui/PerformanceGauge';
import { MonthlyEvolutionChart } from '../ui/MonthlyEvolutionChart';
import { AuditReportModal } from '../ui/AuditReportModal';

interface SearchDetailViewProps {
  anno: number;
  permiso: TipoPermisoFilter;
  overview: NationalOverviewResponse | null;
  selectedSchool: AutoescuelaRecord | null;
  loadingDetail: boolean;
  onSelectSchoolCode: (codigoDGT: string) => void;
  externalSearchQuery?: string;
}

export const SearchDetailView: React.FC<SearchDetailViewProps> = ({
  anno,
  permiso,
  overview,
  selectedSchool,
  loadingDetail,
  onSelectSchoolCode,
  externalSearchQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(externalSearchQuery);
  const [searchResults, setSearchResults] = useState<AutoescuelaSummary[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedSeccionId, setSelectedSeccionId] = useState<string>('todas');
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  useEffect(() => {
    if (externalSearchQuery) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    setSelectedSeccionId('todas');
  }, [selectedSchool?.codigoDGT]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchSchools({
          anno,
          permiso: 'Todos',
          q,
          limit: 12,
        });
        if (!cancelled) setSearchResults(res.items);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, anno]);

  const quickCenters = [
    { codigo: 'CA0528', label: 'El Paseo (Cádiz)' },
    ...(overview?.destacadas.slice(0, 4).map((d) => ({
      codigo: d.codigoDGT,
      label: `${d.nombre} (${d.provincia})`,
    })) || []),
  ];

  const mediaNacionalTeorico = overview?.totales.tasaAprobadosTeorico ?? 68.4;
  const mediaNacionalPractico = overview?.totales.tasaAprobadosPractico ?? 45.2;

  const provBenchmark = selectedSchool
    ? overview?.provincias.find((p) => p.nombre === selectedSchool.provincia)
    : undefined;
  const mediaProvTeorico = provBenchmark?.tasaMediaTeorico ?? mediaNacionalTeorico;
  const mediaProvPractico = provBenchmark?.tasaMediaPractico ?? mediaNacionalPractico;

  const currentSection: SeccionAutoescuela | null =
    selectedSchool && selectedSeccionId !== 'todas'
      ? selectedSchool.secciones.find((s) => s.idSeccion === selectedSeccionId) || null
      : null;

  const activeStats = selectedSchool
    ? currentSection
      ? {
          teorico: currentSection.teorico,
          practico: currentSection.practico,
          totalAlumnos: currentSection.totalAlumnos,
        }
      : {
          teorico: selectedSchool.teorico,
          practico: selectedSchool.practico,
          totalAlumnos: selectedSchool.totalPresentados,
        }
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search Header and Quick Select */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Buscador Censal España ({overview?.totales.totalAutoescuelas.toLocaleString('es-ES') ?? '...'} centros)</span>
              <span aria-hidden="true">·</span>
              <span>Microdatos {anno}</span>
            </div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight mt-0.5">
              Auditoría y Ficha Técnica de Autoescuela
            </h1>
          </div>

          {/* Quick Access Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Acceso directo:</span>
            {quickCenters.map((qc) => (
              <button
                key={qc.codigo}
                onClick={() => onSelectSchoolCode(qc.codigo)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedSchool?.codigoDGT === qc.codigo
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {qc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Search Input */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busca cualquier autoescuela de España por nombre, código DGT o provincia (ej: 'EL PASEO', 'CA0528', 'GALA', 'HOY-VOY', 'TORCAL')..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-slate-400 text-slate-900"
          />
        </div>

        {/* Search Dropdown */}
        {searchQuery.trim().length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-lg overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {searching ? (
              <div className="p-4 text-xs text-slate-500 text-center">Buscando en base censal DGT {anno}...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                No se encontraron centros para "{searchQuery}".
              </div>
            ) : (
              searchResults.map((ae) => (
                <button
                  key={ae.codigoDGT}
                  onClick={() => {
                    onSelectSchoolCode(ae.codigoDGT);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700">
                      {ae.nombre}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {ae.provincia} · {ae.centroExamenPrincipal} · Cód. {ae.codigoDGT} · {ae.numSecciones} secciones
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="font-bold text-slate-900">{ae.tasaGlobalPonderada.toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-500">{ae.totalPresentados.toLocaleString('es-ES')} eval.</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Dossier Card */}
      {loadingDetail || !selectedSchool || !activeStats ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs animate-pulse space-y-4">
          <div className="h-14 bg-slate-100 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-slate-100 rounded" />
            <div className="h-32 bg-slate-100 rounded" />
            <div className="h-32 bg-slate-100 rounded" />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
          {/* Dossier Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                    Autoescuela {selectedSchool.nombre}
                  </h2>
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    · Cód. {selectedSchool.codigoDGT}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedSchool.provincia} ({selectedSchool.centroExamenPrincipal})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedSchool.numSecciones} secciones autorizadas</span>
                  <span aria-hidden="true">·</span>
                  <span>Permisos: {selectedSchool.permisosImpartidos.join(', ')}</span>
                  <span aria-hidden="true">·</span>
                  <span>Filtro activo: {permiso === 'Todos' ? 'Todos' : `Permiso ${permiso}`}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => setShowAuditModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generar Certificado Oficial</span>
              </button>
            </div>
          </div>

          {/* Section Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Secciones Autorizadas ({selectedSchool.secciones.length})
              </label>
              {currentSection && (
                <button
                  onClick={() => setSelectedSeccionId('todas')}
                  className="text-xs text-emerald-800 font-medium hover:underline cursor-pointer"
                >
                  ← Ver consolidado de todas las secciones
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedSeccionId('todas')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  selectedSeccionId === 'todas'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Consolidado Total ({selectedSchool.totalPresentados.toLocaleString('es-ES')} eval.)
              </button>
              {selectedSchool.secciones.map((sec) => (
                <button
                  key={sec.idSeccion}
                  onClick={() => setSelectedSeccionId(sec.idSeccion)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedSeccionId === sec.idSeccion
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Sección {sec.idSeccion} ({sec.totalAlumnos} eval.)
                </button>
              ))}
            </div>
          </div>

          {/* 3 Primary Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">Examen Teórico</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                  {activeStats.teorico.tasaAprobados.toFixed(1)}%
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    activeStats.teorico.tasaAprobados >= mediaProvTeorico
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {activeStats.teorico.tasaAprobados >= mediaProvTeorico ? '+' : ''}
                  {(activeStats.teorico.tasaAprobados - mediaProvTeorico).toFixed(1)}% vs prov.
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span>Aptos / No Aptos:</span>
                  <span className="font-bold text-slate-900">
                    {activeStats.teorico.aptos} / {activeStats.teorico.noAptos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Aptos 1ª conv.:</span>
                  <span className="font-semibold text-slate-800">
                    {activeStats.teorico.aptosPrimeraConvocatoria} ({activeStats.teorico.tasaPrimeraConvocatoria.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">Examen Práctico Circulación</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                  {activeStats.practico.tasaAprobados.toFixed(1)}%
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    activeStats.practico.tasaAprobados >= mediaProvPractico
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {activeStats.practico.tasaAprobados >= mediaProvPractico ? '+' : ''}
                  {(activeStats.practico.tasaAprobados - mediaProvPractico).toFixed(1)}% vs prov.
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span>Aptos / No Aptos:</span>
                  <span className="font-bold text-slate-900">
                    {activeStats.practico.aptos} / {activeStats.practico.noAptos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Aptos 1ª conv.:</span>
                  <span className="font-semibold text-slate-800">
                    {activeStats.practico.aptosPrimeraConvocatoria} ({activeStats.practico.tasaPrimeraConvocatoria.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">Balance y Convocatorias</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                  {selectedSchool.tasaGlobalPonderada.toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-slate-600">
                  Tasa Ponderada
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span>Evaluaciones totales:</span>
                  <span className="font-bold text-slate-900">{activeStats.totalAlumnos.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Brecha Teo-Prác:</span>
                  <span className="font-semibold text-amber-700">
                    {(activeStats.teorico.tasaAprobados - activeStats.practico.tasaAprobados).toFixed(1)} pp
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark Comparisons Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/80">
            <div className="p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Comparativa vs Media Provincial ({selectedSchool.provincia})
              </h3>
              <div className="space-y-4">
                <PerformanceGauge
                  label="Tasa Teórico vs Provincia"
                  value={activeStats.teorico.tasaAprobados}
                  benchmark={mediaProvTeorico}
                  benchmarkLabel={`Media ${selectedSchool.provincia}`}
                />
                <PerformanceGauge
                  label="Tasa Práctico vs Provincia"
                  value={activeStats.practico.tasaAprobados}
                  benchmark={mediaProvPractico}
                  benchmarkLabel={`Media ${selectedSchool.provincia}`}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Comparativa vs Media Nacional (España {anno})
              </h3>
              <div className="space-y-4">
                <PerformanceGauge
                  label="Tasa Teórico vs España"
                  value={activeStats.teorico.tasaAprobados}
                  benchmark={mediaNacionalTeorico}
                  benchmarkLabel="Media España"
                />
                <PerformanceGauge
                  label="Tasa Práctico vs España"
                  value={activeStats.practico.tasaAprobados}
                  benchmark={mediaNacionalPractico}
                  benchmarkLabel="Media España"
                />
              </div>
            </div>
          </div>

          {/* Monthly Evolution Chart & Table */}
          <div className="pt-4 border-t border-slate-200/80 space-y-6">
            <MonthlyEvolutionChart
              data={selectedSchool.evolucion}
              title={`Evolución Mensual ${anno} · ${selectedSchool.nombre}`}
              subtitle="Rendimiento mes a mes extraído directamente de los microdatos oficiales DGT"
              benchmarkTeorico={mediaProvTeorico}
              benchmarkPractico={mediaProvPractico}
            />

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Mes</th>
                    <th className="py-2.5 px-3 text-right">Evaluaciones</th>
                    <th className="py-2.5 px-3 text-right">Aptos Teo.</th>
                    <th className="py-2.5 px-3 text-right">% Teórico</th>
                    <th className="py-2.5 px-3 text-right">Aptos Prác.</th>
                    <th className="py-2.5 px-3 text-right">% Práctico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSchool.evolucion.map((ev) => (
                    <tr key={`${ev.anno}-${ev.mesNumero}`} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {ev.mes} {ev.anno}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 tabular-nums">
                        {ev.totalPresentados}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                        {ev.teoricoAptos}/{ev.teoricoAptos + ev.teoricoNoAptos}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700 tabular-nums">
                        {ev.teoricoTasa.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                        {ev.practicoAptos}/{ev.practicoAptos + ev.practicoNoAptos}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                        {ev.practicoTasa.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AuditReportModal
        autoescuela={showAuditModal ? selectedSchool : null}
        mediaNacionalTeorico={mediaNacionalTeorico}
        mediaNacionalPractico={mediaNacionalPractico}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
};
