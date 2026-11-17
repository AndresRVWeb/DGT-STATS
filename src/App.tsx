import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { TopHeader, type UserSession } from './components/layout/TopHeader';
import { DashboardView } from './components/views/DashboardView';
import { RankingView } from './components/views/RankingView';
import { SearchDetailView } from './components/views/SearchDetailView';
import { RateComparisonView } from './components/views/RateComparisonView';
import { AutomationView } from './components/views/AutomationView';
import { AuthModal } from './components/ui/AuthModal';
import {
  fetchOverview,
  fetchSchoolDetail,
  fetchSyncStatus,
  getExportCsvUrl,
} from './lib/dgtApi';
import { MESES_NOMBRES } from './lib/dgtParser';
import type {
  AutoescuelaRecord,
  NationalOverviewResponse,
  TipoPermisoFilter,
} from './types/dgt';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedPermiso, setSelectedPermiso] = useState<TipoPermisoFilter>('B');
  const [rankingProvincia, setRankingProvincia] = useState<string>('Todas');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  const [overview, setOverview] = useState<NationalOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>('CA0528');
  const [selectedSchool, setSelectedSchool] = useState<AutoescuelaRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Authentication state
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Check stored JWT token on startup
  useEffect(() => {
    const token = localStorage.getItem('dgt_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('dgt_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('dgt_token');
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dgt_token');
    setUser(null);
  };

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchOverview({
        anno: selectedYear,
        mes: selectedMonth,
        permiso: selectedPermiso,
      });
      setOverview(data);
    } catch (err) {
      console.error('Error cargando overview DGT:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, [selectedYear, selectedMonth, selectedPermiso]);

  const loadSchoolDetail = useCallback(async (code: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchSchoolDetail(code, {
        anno: selectedYear,
        mes: selectedMonth,
        permiso: selectedPermiso,
      });
      setSelectedSchool(detail);
    } catch (err) {
      console.error('Error cargando detalle de centro:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedYear, selectedMonth, selectedPermiso]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadSchoolDetail(selectedSchoolCode);
  }, [selectedSchoolCode, loadSchoolDetail]);

  useEffect(() => {
    fetchSyncStatus(false)
      .then((s) => setIsSyncing(s.config.isSyncing))
      .catch(() => {});
  }, []);

  const handleQuickSelectElPaseo = () => {
    setSelectedSchoolCode('CA0528');
    setActiveTab('buscador');
  };

  const handleSelectSchoolCode = (codigoDGT: string) => {
    setSelectedSchoolCode(codigoDGT);
    setActiveTab('buscador');
  };

  const handleNavigateToRanking = (provincia?: string) => {
    setRankingProvincia(provincia || 'Todas');
    setActiveTab('ranking');
  };

  const handleExportCurrentView = () => {
    const url = getExportCsvUrl({
      anno: selectedYear,
      mes: selectedMonth,
      permiso: selectedPermiso,
      provincia: activeTab === 'ranking' ? rankingProvincia : 'Todas',
    });
    window.location.href = url;
  };

  const handleGlobalSearchChange = (q: string) => {
    setGlobalSearch(q);
    if (q.trim().length > 0 && activeTab !== 'buscador' && activeTab !== 'ranking') {
      setActiveTab('buscador');
    }
  };

  const ultimoMesLabel = overview
    ? `${MESES_NOMBRES[overview.ultimoMesDisponible - 1] || 'Oct'} ${overview.anno}`
    : 'Octubre 2026';

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* 1. Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'ranking' && activeTab !== 'ranking') {
            setRankingProvincia('Todas');
          }
        }}
        onQuickSelectElPaseo={handleQuickSelectElPaseo}
        totalRecordsCount={overview?.totales.totalAutoescuelas ?? 0}
        ultimoPeriodoLabel={ultimoMesLabel}
        elPaseo={overview?.elPaseo ?? null}
      />

      {/* 2. Main Viewport Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopHeader
          activeTab={activeTab}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          availableMonths={overview?.mesesDisponibles ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          selectedPermiso={selectedPermiso}
          onSelectPermiso={setSelectedPermiso}
          onExportCurrentView={handleExportCurrentView}
          onOpenSyncModal={() => setActiveTab('automatizacion')}
          breadcrumbsExtra={activeTab === 'buscador' && selectedSchool ? selectedSchool.nombre : undefined}
          searchQuery={globalSearch}
          onSearchChange={handleGlobalSearchChange}
          isSyncing={isSyncing}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/70">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  overview={overview}
                  loading={loadingOverview}
                  onSelectSchoolCode={handleSelectSchoolCode}
                  onNavigateToRanking={handleNavigateToRanking}
                  onNavigateToComparador={() => setActiveTab('comparador')}
                />
              )}

              {activeTab === 'ranking' && (
                <RankingView
                  anno={selectedYear}
                  mes={selectedMonth}
                  permiso={selectedPermiso}
                  provincias={overview?.provincias ?? []}
                  initialProvincia={rankingProvincia}
                  onSelectSchoolCode={handleSelectSchoolCode}
                />
              )}

              {activeTab === 'buscador' && (
                <SearchDetailView
                  anno={selectedYear}
                  permiso={selectedPermiso}
                  overview={overview}
                  selectedSchool={selectedSchool}
                  loadingDetail={loadingDetail}
                  onSelectSchoolCode={handleSelectSchoolCode}
                  externalSearchQuery={globalSearch}
                />
              )}

              {activeTab === 'comparador' && (
                <RateComparisonView
                  anno={selectedYear}
                  permiso={selectedPermiso}
                  overview={overview}
                  onSelectSchoolCode={handleSelectSchoolCode}
                />
              )}

              {activeTab === 'automatizacion' && (
                <AutomationView
                  onDataUpdated={() => {
                    void loadOverview();
                    void loadSchoolDetail(selectedSchoolCode);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modal de Autenticación / Registro de Administrador */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />
    </div>
  );
}
