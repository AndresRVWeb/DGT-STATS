import React from 'react';
import {
  LayoutDashboard,
  Trophy,
  Search,
  Scale,
  Cpu,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import type { AutoescuelaRecord } from '../../types/dgt';

export type ActiveTab = 'dashboard' | 'ranking' | 'buscador' | 'comparador' | 'automatizacion';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onQuickSelectElPaseo: () => void;
  totalRecordsCount: number;
  ultimoPeriodoLabel: string;
  elPaseo: AutoescuelaRecord | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onQuickSelectElPaseo,
  totalRecordsCount,
  ultimoPeriodoLabel,
  elPaseo,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard General',
      icon: LayoutDashboard,
      description: 'Resumen nacional y KPIs 2026',
    },
    {
      id: 'ranking' as ActiveTab,
      label: 'Ranking Nacional y Provincial',
      icon: Trophy,
      description: 'Las 52 provincias de España',
    },
    {
      id: 'buscador' as ActiveTab,
      label: 'Buscador de Autoescuelas',
      icon: Search,
      description: 'Ficha técnica y secciones',
    },
    {
      id: 'comparador' as ActiveTab,
      label: 'Comparador de Tasas',
      icon: Scale,
      description: 'Teórico vs. Práctico',
    },
    {
      id: 'automatizacion' as ActiveTab,
      label: 'Automatización y Datos',
      icon: Cpu,
      description: 'Extractor mensual DGT',
    },
  ];

  return (
    <aside className="w-72 shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      {/* Brand & DGT Header */}
      <div className="p-5 border-b border-slate-800/80">
        <BrandLogo
          size="md"
          subtitle="Observatorio Oficial España"
          theme="dark"
        />

        {/* Clean unboxed metadata */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">{ultimoPeriodoLabel}</span>
          <span className="font-mono tabular-nums text-slate-200 font-medium shrink-0">
            {totalRecordsCount > 0 ? `${totalRecordsCount.toLocaleString('es-ES')} centros` : 'Cargando...'}
          </span>
        </div>
      </div>

      {/* Main Navigation Items (Fixed Left Menu) */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-medium tracking-wider text-slate-400">
          Módulos de Análisis
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group cursor-pointer border ${
                isActive
                  ? 'bg-slate-800 text-white font-medium border-slate-700/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs leading-tight truncate">{item.label}</div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}

        {/* Direct Access to Autoescuela El Paseo (Real DGT CA0528) */}
        <div className="pt-5 mt-4 border-t border-slate-800/80 px-1">
          <div className="px-2 text-[11px] font-medium tracking-wider text-slate-400 mb-2">
            Referencia Cádiz
          </div>
          <button
            onClick={onQuickSelectElPaseo}
            className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white group-hover:text-emerald-300 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Autoescuela El Paseo</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1 truncate font-mono tabular-nums">
              {elPaseo
                ? `Cádiz · ${elPaseo.numSecciones} secc. · ${elPaseo.tasaGlobalPonderada.toFixed(1)}%`
                : 'Cádiz · Cód. CA0528'}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="text-emerald-400">CA0528</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">Datos reales 2026</span>
            </div>
          </button>
        </div>
      </nav>

      {/* Footer Official Attribution */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Fuente</span>
          <span className="font-medium text-slate-300">OpenData DGT España</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Fórmula</span>
          <span className="font-mono text-slate-300">A / (A + NA) · 100</span>
        </div>
      </div>
    </aside>
  );
};
