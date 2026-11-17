import React from 'react';
import { Download, RefreshCw, Calendar, Search, Car } from 'lucide-react';
import { ActiveTab } from './Sidebar';
import type { TipoPermisoFilter } from '../../types/dgt';
import { MESES_NOMBRES } from '../../lib/dgtParser';

interface TopHeaderProps {
  activeTab: ActiveTab;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: number[];
  selectedPermiso: TipoPermisoFilter;
  onSelectPermiso: (permiso: TipoPermisoFilter) => void;
  onExportCurrentView: () => void;
  onOpenSyncModal: () => void;
  breadcrumbsExtra?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSyncing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  selectedPermiso,
  onSelectPermiso,
  onExportCurrentView,
  onOpenSyncModal,
  breadcrumbsExtra,
  searchQuery,
  onSearchChange,
  isSyncing = false,
}) => {
  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard General';
      case 'ranking':
        return 'Ranking Nacional y Provincial';
      case 'buscador':
        return 'Buscador y Ficha Técnica';
      case 'comparador':
        return 'Comparador de Tasas';
      case 'automatizacion':
        return 'Extractor Mensual DGT';
      default:
        return 'Análisis';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="flex items-center gap-2 min-w-0 text-xs">
        <span className="text-slate-500 font-medium whitespace-nowrap">AutoMetrics DGT</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900 font-semibold truncate font-display text-sm">
          {getTabLabel(activeTab)}
        </span>
        {breadcrumbsExtra && (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-emerald-800 font-medium truncate">
              {breadcrumbsExtra}
            </span>
          </>
        )}
      </div>

      {/* Zone 2 & 3: Global Period/Permit Controls & Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Search */}
        <div className="relative hidden xl:block w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar centro o código DGT..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:border-slate-400 text-slate-800 placeholder:text-slate-400 transition-colors"
          />
        </div>

        {/* Permit Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
          <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedPermiso}
            onChange={(e) => onSelectPermiso(e.target.value as TipoPermisoFilter)}
            className="bg-transparent border-none focus:outline-hidden text-xs text-slate-800 cursor-pointer"
            aria-label="Filtrar por permiso"
          >
            <option value="B">Permiso B</option>
            <option value="Todos">Todos los permisos</option>
            <option value="A1/A2">Motos (A1/A2)</option>
            <option value="C">Camión (C)</option>
            <option value="D">Autobús (D)</option>
            <option value="AM">Ciclomotor (AM)</option>
          </select>
        </div>

        {/* Month Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="bg-transparent border-none focus:outline-hidden text-xs text-slate-800 cursor-pointer"
            aria-label="Filtrar por mes"
          >
            <option value="all">Acumulado {selectedYear}</option>
            {availableMonths.map((m) => (
              <option key={m} value={String(m)}>
                {MESES_NOMBRES[m - 1] || `Mes ${m}`} {selectedYear}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedYear}
            onChange={(e) => {
              onSelectYear(Number(e.target.value));
              onSelectMonth('all');
            }}
            className="bg-transparent border-none focus:outline-hidden text-xs text-slate-800 cursor-pointer"
            aria-label="Seleccionar año"
          >
            <option value={2026}>2026 (Actual)</option>
            <option value={2025}>2025 (Histórico)</option>
          </select>
        </div>

        {/* Extractor shortcut button */}
        <button
          onClick={onOpenSyncModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Abrir extractor mensual automático DGT"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-emerald-700' : ''}`} />
          <span>{isSyncing ? 'Extrayendo...' : 'Extractor DGT'}</span>
        </button>

        {/* Primary Export CTA */}
        <button
          onClick={onExportCurrentView}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>
    </header>
  );
};
