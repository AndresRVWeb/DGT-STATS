import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Upload,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Database,
  ShieldCheck,
  Clock,
  ExternalLink,
  CalendarCheck,
} from 'lucide-react';
import type { SyncStatusResponse } from '../../lib/dgtApi';
import {
  fetchSyncStatus,
  triggerDgtSync,
  updateExtractorConfig,
  uploadDgtFile,
} from '../../lib/dgtApi';
import { generarPlantillaMicrodatosDGT } from '../../lib/dgtParser';

interface AutomationViewProps {
  onDataUpdated: () => void;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'pro' | 'user';
  } | null;
  onOpenAuthModal?: () => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  onDataUpdated,
  user,
  onOpenAuthModal,
}) => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const loadStatus = async (refreshCatalog = false) => {
    try {
      const data = await fetchSyncStatus(refreshCatalog);
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus(true);
  }, []);

  // Poll every 1.5s while extraction is running
  useEffect(() => {
    if (!status?.config.isSyncing) return;
    const timer = setInterval(() => {
      void loadStatus(false);
    }, 1500);
    return () => clearInterval(timer);
  }, [status?.config.isSyncing]);

  const handleTriggerSync = async (
    scope: 'latest' | 'year_2026' | 'year_2025' | 'missing_2026' | 'single_month',
    anno?: number,
    mes?: number
  ) => {
    setBannerError(null);
    setBannerMessage('Conectando con el portal estadístico oficial de la DGT (www.dgt.es)...');
    try {
      // Optimistically mark syncing
      if (status) {
        setStatus({
          ...status,
          config: { ...status.config, isSyncing: true },
        });
      }
      const res = await triggerDgtSync({ scope, anno, mes });
      setStatus(res.status);
      setBannerMessage(res.message);
      onDataUpdated();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Error ejecutando extractor DGT');
      void loadStatus(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!status) return;
    const next = !status.config.autoSyncEnabled;
    const updated = await updateExtractorConfig({ autoSyncEnabled: next });
    setStatus({ ...status, config: updated });
  };

  const handleIntervalChange = async (hours: number) => {
    if (!status) return;
    const updated = await updateExtractorConfig({ intervalHours: hours });
    setStatus({ ...status, config: updated });
  };

  const handleUploadText = async (text: string, fileName: string) => {
    setBannerError(null);
    setBannerMessage(`Procesando fichero ${fileName}...`);
    try {
      const res = await uploadDgtFile(text, fileName);
      setStatus(res.status);
      setBannerMessage(
        `Fichero ${fileName} procesado: ${res.count.toLocaleString('es-ES')} registros incorporados (${res.mes}/${res.anno}).`
      );
      onDataUpdated();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Error al procesar fichero');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        void handleUploadText(text, file.name);
      };
      reader.readAsText(file, 'latin1');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        void handleUploadText(text, file.name);
      };
      reader.readAsText(file, 'latin1');
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generarPlantillaMicrodatosDGT();
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'PLANTILLA_OFICIAL_DGT_MATRABA_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !status) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-36 bg-white border border-slate-200/80 rounded-xl" />
        <div className="h-64 bg-white border border-slate-200/80 rounded-xl" />
      </div>
    );
  }

  const { config, catalog, logs, loadedYears } = status;
  const catalog2026 = catalog.filter((c) => c.anno === 2026);
  const catalog2025 = catalog.filter((c) => c.anno === 2025);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Role / Permission Notice */}
      {user?.role === 'admin' ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Modo Administrador Activo:</strong> Tu sesión cuenta con permisos totales para forzar descargas en vivo desde <code>dgt.es</code>, cargar ficheros microdatos y modificar la vigilancia automática.
            </span>
          </div>
          <span className="bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0 self-start sm:self-auto">
            Admin Verificado
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Modo Consulta (Solo Lectura):</strong> Estás explorando el catálogo y registros de la DGT. Para forzar descargas en el servidor, subir archivos manuales o modificar la frecuencia de escaneo, se requiere rol de Administrador.
            </span>
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-md transition-colors cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto"
            >
              Iniciar Sesión como Admin
            </button>
          )}
        </div>
      )}

      {/* Header & Main Extractor Controls */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Extractor Oficial Conectado a dgt.es</span>
              <span aria-hidden="true">·</span>
              <span>Actualización Mensual Automática 2026</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight mt-1">
              Extractor Mensual de Microdatos DGT (España)
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Conecta directamente con el repositorio oficial de microdatos MATRABA de la Dirección General de Tráfico,
              detecta nuevas publicaciones mensuales (habitualmente hacia el día 15 de cada mes), descomprime los paquetes ZIP
              y recalcula los indicadores de toda España.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleTriggerSync('missing_2026')}
              disabled={config.isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${config.isSyncing ? 'animate-spin' : ''}`} />
              <span>Buscar Nuevos Meses 2026</span>
            </button>

            <button
              onClick={() => handleTriggerSync('year_2026')}
              disabled={config.isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <span>Re-sincronizar 2026 Completo</span>
            </button>

            <button
              onClick={() => handleTriggerSync('year_2025')}
              disabled={config.isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <span>Cargar Histórico 2025</span>
            </button>
          </div>
        </div>

        {/* Scheduler Status Strip */}
        <div className="pt-5 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>Vigilancia Mensual DGT</span>
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {config.autoSyncEnabled ? 'Activa (Automática)' : 'Manual'}
              </span>
              <button
                onClick={handleToggleAutoSync}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                  config.autoSyncEnabled
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {config.autoSyncEnabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>Frecuencia de Comprobación</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <select
                value={config.intervalHours}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800"
              >
                <option value={12}>Cada 12 horas (Recomendado)</option>
                <option value={24}>Diaria (cada 24 horas)</option>
                <option value={168}>Semanal (cada 7 días)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="text-slate-500 font-medium">Último Mes Publicado DGT</div>
            <div className="mt-2 font-mono font-bold text-slate-900 text-sm">
              {config.lastPublishedPeriod}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              {loadedYears.map((y) => `${y.anno}: ${y.meses.length} meses (${y.totalRows.toLocaleString('es-ES')} filas)`).join(' · ')}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="text-slate-500 font-medium">Próxima Comprobación</div>
            <div className="mt-2 font-mono font-semibold text-slate-900 text-xs">
              {config.nextCheckAt
                ? new Date(config.nextCheckAt).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Programada'}
            </div>
            <a
              href={config.sourcePortalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:underline mt-1"
            >
              <span>Portal oficial dgt.es</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Live Progress or Feedback Banner */}
        {(config.isSyncing || bannerMessage || bannerError) && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
              bannerError
                ? 'bg-red-50 border-red-200 text-red-900'
                : config.isSyncing
                ? 'bg-slate-50 border-slate-200 text-slate-800'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
            }`}
          >
            {config.isSyncing ? (
              <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span className="font-medium">
              {config.isSyncing
                ? config.currentStepMessage || 'Extrayendo microdatos desde www.dgt.es...'
                : bannerError || bannerMessage}
            </span>
          </div>
        )}
      </div>

      {/* Remote Catalog 2026 & Manual Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Official 2026 DGT Catalog */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Publicaciones Oficiales Detectadas en dgt.es (Año 2026)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ficheros mensuales ZIP publicados por la DGT para autoescuelas de toda España
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {catalog2026.length} meses publicados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalog2026.map((item) => (
              <div
                key={item.fileName}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{item.mesNombre}</span>
                    {item.downloaded && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    {item.fileName}
                  </div>
                  {item.cachedSizeKb && (
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Sincronizado · {(item.cachedSizeKb / 1024).toFixed(2)} MB TXT
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleTriggerSync('single_month', item.anno, item.mes)}
                  disabled={config.isSyncing}
                  className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {item.downloaded ? 'Actualizar' : 'Extraer'}
                </button>
              </div>
            ))}
          </div>

          {catalog2025.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                También detectados <strong>{catalog2025.length}</strong> meses históricos del año 2025 en dgt.es.
              </span>
              <button
                onClick={() => handleTriggerSync('year_2025')}
                disabled={config.isSyncing}
                className="text-xs font-semibold text-slate-800 hover:underline cursor-pointer"
              >
                Importar año 2025
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Manual Upload & Formula Reference */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold font-display text-slate-900">
                Importación Manual TXT / CSV
              </h2>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`mt-4 border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <Upload className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs font-medium text-slate-800 mt-2">
                Arrastra un fichero TXT/CSV oficial DGT
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Formato oficial MATRABA (separador ;)
              </p>

              <div className="mt-3 flex flex-col gap-2">
                <label className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer">
                  Seleccionar Archivo
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleDownloadTemplate}
                  className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Plantilla DGT 2026</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fórmula Oficial Aplicada</span>
            </div>
            <div className="font-mono text-slate-800 font-semibold">
              Tasa (%) = (Aptos / (Aptos + No Aptos)) * 100
            </div>
          </div>
        </div>
      </div>

      {/* Sync Audit Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900">
              Registro de Auditoría e Ingesta DGT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial de paquetes descargados de www.dgt.es con verificación criptográfica SHA-256
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {logs.length} operaciones
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-sans">
              <tr>
                <th className="py-2.5 px-4">Fecha Sincronización</th>
                <th className="py-2.5 px-4">Fichero Oficial DGT</th>
                <th className="py-2.5 px-4">Periodo</th>
                <th className="py-2.5 px-4 text-right">Filas Procesadas</th>
                <th className="py-2.5 px-4">Origen</th>
                <th className="py-2.5 px-4">Hash SHA-256</th>
                <th className="py-2.5 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-sans text-slate-700 whitespace-nowrap">{log.fecha}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{log.ficheroNombre}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">{log.ficheroTamanno}</div>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700">{log.periodo}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                    {log.registrosValidos.toLocaleString('es-ES')}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600">
                    {log.automatico ? 'Extractor Auto' : 'Manual'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{log.hashIntegridad}</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Completado</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
