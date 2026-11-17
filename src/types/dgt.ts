/**
 * Tipos oficiales para el procesamiento de Microdatos DGT 2026
 * Dirección General de Tráfico - Estadísticas de Exámenes por Autoescuela y Sección
 */

export type TipoPermisoFilter = 'Todos' | 'B' | 'A1/A2' | 'C' | 'D' | 'AM';

export interface ExamenStats {
  aptos: number;
  noAptos: number;
  total: number;
  tasaAprobados: number; // Fórmula oficial: (Aptos / (Aptos + No Aptos)) * 100
  aptosPrimeraConvocatoria: number;
  aptosSegundaConvocatoria: number;
  aptosTerceraOCuartaConv: number;
  aptosCincoOMasConv: number;
  tasaPrimeraConvocatoria: number;
}

export interface EvolucionMensual {
  mes: string; // "Ene", "Feb", ... "Dic"
  mesNumero: number;
  anno: number;
  teoricoAptos: number;
  teoricoNoAptos: number;
  teoricoTasa: number;
  practicoAptos: number;
  practicoNoAptos: number;
  practicoTasa: number;
  totalPresentados: number;
}

export interface SeccionAutoescuela {
  idSeccion: string; // ej: "01", "02"
  codigoDGT: string; // ej: "CA0528-01"
  denominacion: string;
  centroExamen: string;
  teorico: ExamenStats;
  practico: ExamenStats;
  destreza?: ExamenStats;
  totalAlumnos: number;
}

export interface AutoescuelaSummary {
  id: string;
  codigoDGT: string; // ej: "CA0528"
  nombre: string;
  provincia: string;
  codigoProvincia: string;
  centroExamenPrincipal: string;
  numSecciones: number;
  permisosImpartidos: string[];
  teorico: ExamenStats;
  practico: ExamenStats;
  totalPresentados: number;
  tasaGlobalPonderada: number;
  brechaTeoricoPractico: number;
  muestraSignificativa: boolean; // Flag DGT: >= 15 presentados
}

export interface AutoescuelaRecord extends AutoescuelaSummary {
  secciones: SeccionAutoescuela[];
  evolucion: EvolucionMensual[];
  desglosePermisos: Array<{
    permiso: string;
    teorico: ExamenStats;
    practico: ExamenStats;
    totalPresentados: number;
  }>;
  annoDatos: number;
  mesesIncluidos: number[];
}

export interface ProvinciaStats {
  codigoProvincia: string;
  nombre: string;
  totalAutoescuelas: number;
  totalSecciones: number;
  totalAlumnos: number;
  teoricoAptos: number;
  teoricoNoAptos: number;
  tasaMediaTeorico: number;
  practicoAptos: number;
  practicoNoAptos: number;
  tasaMediaPractico: number;
  centrosExamen: string[];
}

export interface NationalOverviewResponse {
  anno: number;
  mesSeleccionado: string; // "all" o "1".."12"
  permiso: TipoPermisoFilter;
  ultimaActualizacion: string;
  ultimoMesDisponible: number;
  mesesDisponibles: number[];
  totales: {
    totalAutoescuelas: number;
    totalSecciones: number;
    totalAlumnosExamen: number;
    totalEvaluacionesTeorico: number;
    totalEvaluacionesPractico: number;
    tasaAprobadosTeorico: number;
    tasaAprobadosPractico: number;
    tasaPrimeraConvocatoriaTeorico: number;
    tasaPrimeraConvocatoriaPractico: number;
    brechaTeoricoPractico: number;
  };
  evolucionNacional: EvolucionMensual[];
  provincias: ProvinciaStats[];
  destacadas: AutoescuelaSummary[];
  elPaseo: AutoescuelaRecord | null;
}

export interface RemoteDgtFile {
  anno: number;
  mes: number;
  mesNombre: string;
  url: string;
  fileName: string;
  downloaded: boolean;
  cachedSizeKb?: number;
}

export interface CargaSyncLog {
  id: string;
  fecha: string;
  ficheroNombre: string;
  origenUrl: string;
  ficheroTamanno: string;
  totalRegistros: number;
  registrosValidos: number;
  registrosDescartados: number;
  estado: 'completado' | 'error' | 'en_proceso';
  hashIntegridad: string;
  periodo: string;
  automatico: boolean;
}

export interface ExtractorConfig {
  autoSyncEnabled: boolean;
  intervalHours: number;
  targetYear: number;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  lastPublishedPeriod: string;
  sourcePortalUrl: string;
  isSyncing: boolean;
  currentStepMessage: string | null;
}
