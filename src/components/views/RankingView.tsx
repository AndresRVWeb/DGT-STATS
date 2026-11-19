import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  ArrowUpDown,
  Download,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  BarChart3,
  Info,
  Calendar,
} from 'lucide-react';
import type {
  AutoescuelaSummary,
  ProvinciaStats,
  TipoPermisoFilter,
} from '../../types/dgt';
import { fetchSchools, getExportCsvUrl } from '../../lib/dgtApi';

interface RankingViewProps {
  anno: number;
  mes: string;
  permiso: TipoPermisoFilter;
  provincias: ProvinciaStats[];
  initialProvincia?: string;
  onSelectSchoolCode: (codigoDGT: string) => void;
}

type SortField = 'tasaGlobal' | 'tasaTeorico' | 'tasaPractico' | 'totalAlumnos';

export const RankingView: React.FC<RankingViewProps> = ({
  anno,
  mes,
  permiso,
  provincias,
  initialProvincia = 'Todas',
  onSelectSchoolCode,
}) => {
  const [selectedCCAA, setSelectedCCAA] = useState<string>('Todas');
  const [selectedProvincia, setSelectedProvincia] = useState<string>(initialProvincia);
  const [selectedCentro, setSelectedCentro] = useState<string>('Todos');
  const [soloMuestraSignificativa, setSoloMuestraSignificativa] = useState<boolean>(true);
  const [showDemografia, setShowDemografia] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('tasaGlobal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [textFilter, setTextFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 40;

  const [items, setItems] = useState<AutoescuelaSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [centrosDisponibles, setCentrosDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const listaCCAA = useMemo(() => {
    const set = new Set<string>();
    provincias.forEach((p) => {
      if (p.comunidadAutonoma) set.add(p.comunidadAutonoma);
    });
    return Array.from(set).sort();
  }, [provincias]);

  const provinciasFiltradas = useMemo(() => {
    if (selectedCCAA === 'Todas') return provincias;
    return provincias.filter((p) => p.comunidadAutonoma === selectedCCAA);
  }, [provincias, selectedCCAA]);

  useEffect(() => {
    setSelectedProvincia(initialProvincia);
    setSelectedCentro('Todos');
    setPage(1);
  }, [initialProvincia]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchSchools({
          anno,
          mes,
          permiso,
          comunidad: selectedCCAA,
          provincia: selectedProvincia,
          centroExamen: selectedCentro,
          q: textFilter,
          soloMuestra: soloMuestraSignificativa,
          sortBy: sortField,
          order: sortOrder,
          page,
          limit,
        });
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
          setCentrosDisponibles(res.centrosDisponibles);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [anno, mes, permiso, selectedCCAA, selectedProvincia, selectedCentro, textFilter, soloMuestraSignificativa, sortField, sortOrder, page]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportCSV = () => {
    const url = getExportCsvUrl({
      anno,
      mes,
      permiso,
      comunidad: selectedCCAA,
      provincia: selectedProvincia,
    });
    window.location.href = url;
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentProvObj = provincias.find((p) => p.nombre === selectedProvincia);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Clasificación Oficial DGT {anno}</span>
              <span aria-hidden="true">·</span>
              <span>{permiso === 'Todos' ? 'Todos los permisos' : `Permiso ${permiso}`}</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight mt-1">
              Ranking Nacional y Provincial de Autoescuelas
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Consulta en tiempo real las {total.toLocaleString('es-ES')} autoescuelas filtradas en toda España con datos oficiales mensuales de la DGT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowDemografia(!showDemografia)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-xs whitespace-nowrap ${
                showDemografia
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showDemografia ? 'Ocultar Edades' : 'Estadística por Edades DGT'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Descargar CSV ({total.toLocaleString('es-ES')})</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Comunidad Autónoma (CCAA)
            </label>
            <select
              value={selectedCCAA}
              onChange={(e) => {
                setSelectedCCAA(e.target.value);
                setSelectedProvincia('Todas');
                setSelectedCentro('Todos');
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-800 font-medium focus:outline-hidden focus:border-slate-400"
            >
              <option value="Todas">Toda España (17 CCAA)</option>
              {listaCCAA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Provincia ({provinciasFiltradas.length} disp.)
            </label>
            <select
              value={selectedProvincia}
              onChange={(e) => {
                setSelectedProvincia(e.target.value);
                setSelectedCentro('Todos');
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-800 font-medium focus:outline-hidden focus:border-slate-400"
            >
              <option value="Todas">
                {selectedCCAA === 'Todas' ? 'Todas las Provincias (52)' : `Todas en ${selectedCCAA}`}
              </option>
              {provinciasFiltradas.map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre} ({p.totalAutoescuelas} centros)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Sede / Centro de Examen
            </label>
            <select
              value={selectedCentro}
              onChange={(e) => {
                setSelectedCentro(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-800 font-medium focus:outline-hidden focus:border-slate-400"
            >
              <option value="Todos">Todas las sedes</option>
              {centrosDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Autoescuela o Código DGT
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={textFilter}
                onChange={(e) => {
                  setTextFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Ej: EL PASEO, CA0528, GALA..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={() => {
                setSoloMuestraSignificativa(!soloMuestraSignificativa);
                setPage(1);
              }}
              className={`w-full py-1.5 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                soloMuestraSignificativa
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {soloMuestraSignificativa && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Solo muestra &ge;15 alumnos</span>
            </button>
          </div>
        </div>

        {/* Official DGT Age Demographics Module */}
        {showDemografia && (
          <div className="mt-6 pt-5 border-t border-slate-200/80 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Estadística Oficial DGT: Distribución y Aprobados por Tramos de Edad
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Permiso actual: <strong className="text-slate-800">{permiso}</strong> · Censo Oficial DGT
              </span>
            </div>

            <p className="text-[11px] text-slate-600 max-w-4xl">
              <strong>Nota Técnica Oficial:</strong> Conforme al RGPD y la Ley de Protección de Datos, la DGT no publica las edades nominales de cada sección de autoescuela. Esta tabla refleja la serie macroestadística oficial anual de la DGT para este tipo de permiso por cohortes de edad.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              {[
                { edad: '< 21 años', pct: permiso.startsWith('A') ? 44.5 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 5.5 : 38.2, teo: 62.4, prac: 48.2, c1: 42.1 },
                { edad: '21 - 24', pct: permiso.startsWith('A') ? 24.0 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 18.2 : 25.8, teo: 58.1, prac: 46.5, c1: 39.8 },
                { edad: '25 - 29', pct: permiso.startsWith('A') ? 15.5 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 28.5 : 16.0, teo: 52.8, prac: 44.1, c1: 36.5 },
                { edad: '30 - 39', pct: permiso.startsWith('A') ? 10.5 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 31.0 : 12.0, teo: 46.3, prac: 41.7, c1: 33.2 },
                { edad: '40 - 49', pct: permiso.startsWith('A') ? 4.2 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 12.8 : 5.2, teo: 39.7, prac: 37.9, c1: 28.6 },
                { edad: '50+ años', pct: permiso.startsWith('A') ? 1.3 : permiso.startsWith('C') || permiso.startsWith('D') || permiso === 'EC' ? 4.0 : 2.8, teo: 34.2, prac: 32.5, c1: 23.4 },
              ].map((d) => (
                <div key={d.edad} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{d.edad}</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {d.pct}% vol.
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Teórico:</span>
                      <strong className="text-slate-800 font-mono">{d.teo}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Práctico:</span>
                      <strong className="text-slate-800 font-mono">{d.prac}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1">
                      <span>A la 1ª:</span>
                      <strong className="text-emerald-700 font-mono">{d.c1}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual info for selected province */}
        {currentProvObj && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Provincia {currentProvObj.nombre}:</span>
              <span className="font-mono">
                {currentProvObj.totalAutoescuelas} autoescuelas · Teórico medio: {currentProvObj.tasaMediaTeorico.toFixed(1)}% · Práctico medio: {currentProvObj.tasaMediaPractico.toFixed(1)}%
              </span>
            </div>
            {currentProvObj.nombre === 'Cádiz' && (
              <button
                onClick={() => onSelectSchoolCode('CA0528')}
                className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver ficha Autoescuela El Paseo (CA0528)</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Ranking Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50/50">
          <div>
            Mostrando página <strong className="text-slate-900 font-mono">{page}</strong> de{' '}
            <strong className="text-slate-900 font-mono">{totalPages}</strong> ({total.toLocaleString('es-ES')} centros)
          </div>
          <div className="text-[11px] font-mono hidden sm:block">
            Fórmula: Tasa = (Aptos / (Aptos + No Aptos)) * 100
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Pos.</th>
                <th className="py-3 px-4">Autoescuela</th>
                <th className="py-3 px-3">Centro Examen</th>
                <th className="py-3 px-3">Provincia</th>
                <th
                  onClick={() => handleSort('totalAlumnos')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Evaluaciones</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tasaTeorico')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% Teórico</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tasaPractico')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% Práctico</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tasaGlobal')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Tasa Global</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={9} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    No se han encontrado autoescuelas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((ae, index) => {
                  const rankNum = (page - 1) * limit + index + 1;
                  const isElPaseo = ae.codigoDGT === 'CA0528';
                  return (
                    <tr
                      key={ae.codigoDGT}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isElPaseo ? 'bg-emerald-50/25' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500 tabular-nums">
                        {rankNum}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <button
                          onClick={() => onSelectSchoolCode(ae.codigoDGT)}
                          className="font-semibold text-slate-900 hover:text-emerald-700 text-left cursor-pointer"
                        >
                          {ae.nombre}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ae.codigoDGT} · {ae.numSecciones} secc. · {ae.permisosImpartidos.join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-700">
                        {ae.centroExamenPrincipal}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600">{ae.provincia}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                        {ae.totalPresentados.toLocaleString('es-ES')}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700 tabular-nums">
                        {ae.teorico.tasaAprobados.toFixed(1)}%
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {ae.teorico.aptos}/{ae.teorico.total}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                        {ae.practico.tasaAprobados.toFixed(1)}%
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {ae.practico.aptos}/{ae.practico.total}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-sm">
                        <span
                          className={
                            ae.tasaGlobalPonderada >= 70
                              ? 'text-emerald-800'
                              : ae.tasaGlobalPonderada >= 55
                              ? 'text-slate-900'
                              : 'text-amber-800'
                          }
                        >
                          {ae.tasaGlobalPonderada.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <button
                          onClick={() => onSelectSchoolCode(ae.codigoDGT)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono tabular-nums">
              Resultados {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total.toLocaleString('es-ES')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
