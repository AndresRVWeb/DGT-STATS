import type {
  AutoescuelaRecord,
  AutoescuelaSummary,
  CargaSyncLog,
  ExtractorConfig,
  NationalOverviewResponse,
  RemoteDgtFile,
  TipoPermisoFilter,
} from '../types/dgt';

export interface SchoolsQueryResponse {
  items: AutoescuelaSummary[];
  total: number;
  page: number;
  limit: number;
  centrosDisponibles: string[];
}

export interface SyncStatusResponse {
  config: ExtractorConfig;
  logs: CargaSyncLog[];
  catalog: RemoteDgtFile[];
  loadedYears: Array<{
    anno: number;
    meses: number[];
    totalRows: number;
  }>;
}

export async function fetchOverview(params: {
  anno?: number;
  mes?: string;
  permiso?: TipoPermisoFilter;
  comunidad?: string;
}): Promise<NationalOverviewResponse> {
  const qs = new URLSearchParams({
    anno: String(params.anno ?? 2026),
    mes: params.mes ?? 'all',
    permiso: params.permiso ?? 'B',
  });
  if (params.comunidad && params.comunidad !== 'Todas') qs.set('comunidad', params.comunidad);
  const res = await fetch(`/api/dgt/overview?${qs.toString()}`);
  if (!res.ok) throw new Error(`Error cargando resumen DGT (${res.status})`);
  return res.json();
}

export async function fetchSchools(params: {
  anno?: number;
  mes?: string;
  permiso?: TipoPermisoFilter;
  comunidad?: string;
  provincia?: string;
  centroExamen?: string;
  q?: string;
  soloMuestra?: boolean;
  sortBy?: 'tasaGlobal' | 'tasaTeorico' | 'tasaPractico' | 'totalAlumnos';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<SchoolsQueryResponse> {
  const qs = new URLSearchParams();
  qs.set('anno', String(params.anno ?? 2026));
  qs.set('mes', params.mes ?? 'all');
  qs.set('permiso', params.permiso ?? 'B');
  if (params.comunidad && params.comunidad !== 'Todas') qs.set('comunidad', params.comunidad);
  if (params.provincia) qs.set('provincia', params.provincia);
  if (params.centroExamen) qs.set('centroExamen', params.centroExamen);
  if (params.q) qs.set('q', params.q);
  if (params.soloMuestra) qs.set('soloMuestra', 'true');
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.order) qs.set('order', params.order);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 50));

  const res = await fetch(`/api/dgt/schools?${qs.toString()}`);
  if (!res.ok) throw new Error(`Error consultando autoescuelas (${res.status})`);
  return res.json();
}

export async function fetchSchoolDetail(
  codigoDGT: string,
  params: { anno?: number; mes?: string; permiso?: TipoPermisoFilter } = {}
): Promise<AutoescuelaRecord> {
  const qs = new URLSearchParams({
    anno: String(params.anno ?? 2026),
    mes: params.mes ?? 'all',
    permiso: params.permiso ?? 'B',
  });
  const res = await fetch(`/api/dgt/schools/${encodeURIComponent(codigoDGT)}?${qs.toString()}`);
  if (!res.ok) throw new Error(`No se pudo cargar la ficha de ${codigoDGT}`);
  return res.json();
}

export async function fetchCompareSchools(
  codeA: string,
  codeB: string,
  params: { anno?: number; permiso?: TipoPermisoFilter } = {}
): Promise<{ schoolA: AutoescuelaRecord | null; schoolB: AutoescuelaRecord | null }> {
  const qs = new URLSearchParams({
    codes: `${codeA},${codeB}`,
    anno: String(params.anno ?? 2026),
    permiso: params.permiso ?? 'B',
  });
  const res = await fetch(`/api/dgt/compare?${qs.toString()}`);
  if (!res.ok) throw new Error('Error comparando centros');
  return res.json();
}

export async function fetchSyncStatus(refreshCatalog = false): Promise<SyncStatusResponse> {
  const res = await fetch(`/api/dgt/sync/status${refreshCatalog ? '?refreshCatalog=true' : ''}`);
  if (!res.ok) throw new Error('Error obteniendo estado de sincronización');
  return res.json();
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('dgt_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function triggerDgtSync(payload: {
  scope: 'latest' | 'year_2026' | 'year_2025' | 'missing_2026' | 'single_month';
  anno?: number;
  mes?: number;
}): Promise<{ syncedCount: number; message: string; status: SyncStatusResponse }> {
  const res = await fetch('/api/dgt/sync', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error ejecutando extractor DGT');
  }
  return res.json();
}

export async function updateExtractorConfig(
  payload: Partial<ExtractorConfig>
): Promise<ExtractorConfig> {
  const res = await fetch('/api/dgt/sync/config', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error actualizando configuración del extractor');
  }
  return res.json();
}

export async function uploadDgtFile(
  content: string,
  fileName: string
): Promise<{ success: boolean; count: number; anno: number; mes: number; status: SyncStatusResponse }> {
  const res = await fetch('/api/dgt/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error procesando fichero');
  }
  return res.json();
}

export function getExportCsvUrl(params: {
  anno?: number;
  mes?: string;
  permiso?: TipoPermisoFilter;
  comunidad?: string;
  provincia?: string;
}): string {
  const qs = new URLSearchParams({
    anno: String(params.anno ?? 2026),
    mes: params.mes ?? 'all',
    permiso: params.permiso ?? 'B',
    provincia: params.provincia ?? 'Todas',
  });
  if (params.comunidad && params.comunidad !== 'Todas') qs.set('comunidad', params.comunidad);
  return `/api/dgt/export?${qs.toString()}`;
}
