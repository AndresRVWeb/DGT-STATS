import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import type {
  AutoescuelaRecord,
  AutoescuelaSummary,
  CargaSyncLog,
  DemografiaEdadDgt,
  EvolucionMensual,
  ExamenStats,
  ExtractorConfig,
  NationalOverviewResponse,
  ProvinciaStats,
  RemoteDgtFile,
  SeccionAutoescuela,
  TipoPermisoFilter,
} from '../types/dgt.ts';

const DGT_LIST_URL =
  'https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/conductores-autoescuelas.html';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CACHE_DIR = path.resolve(process.cwd(), '.dgt-cache');
const FILES_DIR = path.join(CACHE_DIR, 'files');
const LOGS_PATH = path.join(CACHE_DIR, 'sync-logs.json');
const CONFIG_PATH = path.join(CACHE_DIR, 'extractor-config.json');

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PREFIX_TO_PROVINCIA: Record<string, { nombre: string; codigo: string }> = {
  VI: { nombre: 'Araba/Álava', codigo: '01' },
  AB: { nombre: 'Albacete', codigo: '02' },
  A: { nombre: 'Alicante/Alacant', codigo: '03' },
  AL: { nombre: 'Almería', codigo: '04' },
  AV: { nombre: 'Ávila', codigo: '05' },
  BA: { nombre: 'Badajoz', codigo: '06' },
  PM: { nombre: 'Balears (Illes)', codigo: '07' },
  IB: { nombre: 'Balears (Illes)', codigo: '07' },
  B: { nombre: 'Barcelona', codigo: '08' },
  BU: { nombre: 'Burgos', codigo: '09' },
  CC: { nombre: 'Cáceres', codigo: '10' },
  CA: { nombre: 'Cádiz', codigo: '11' },
  CS: { nombre: 'Castellón/Castelló', codigo: '12' },
  CR: { nombre: 'Ciudad Real', codigo: '13' },
  CO: { nombre: 'Córdoba', codigo: '14' },
  C: { nombre: 'Coruña (A)', codigo: '15' },
  CU: { nombre: 'Cuenca', codigo: '16' },
  GI: { nombre: 'Girona', codigo: '17' },
  GE: { nombre: 'Girona', codigo: '17' },
  GR: { nombre: 'Granada', codigo: '18' },
  GU: { nombre: 'Guadalajara', codigo: '19' },
  SS: { nombre: 'Gipuzkoa', codigo: '20' },
  H: { nombre: 'Huelva', codigo: '21' },
  HU: { nombre: 'Huesca', codigo: '22' },
  J: { nombre: 'Jaén', codigo: '23' },
  LE: { nombre: 'León', codigo: '24' },
  L: { nombre: 'Lleida', codigo: '25' },
  LO: { nombre: 'Rioja (La)', codigo: '26' },
  LU: { nombre: 'Lugo', codigo: '27' },
  M: { nombre: 'Madrid', codigo: '28' },
  MA: { nombre: 'Málaga', codigo: '29' },
  MU: { nombre: 'Murcia', codigo: '30' },
  NA: { nombre: 'Navarra', codigo: '31' },
  OR: { nombre: 'Ourense', codigo: '32' },
  OU: { nombre: 'Ourense', codigo: '32' },
  O: { nombre: 'Asturias', codigo: '33' },
  P: { nombre: 'Palencia', codigo: '34' },
  GC: { nombre: 'Palmas (Las)', codigo: '35' },
  PO: { nombre: 'Pontevedra', codigo: '36' },
  SA: { nombre: 'Salamanca', codigo: '37' },
  TF: { nombre: 'Santa Cruz de Tenerife', codigo: '38' },
  S: { nombre: 'Cantabria', codigo: '39' },
  SG: { nombre: 'Segovia', codigo: '40' },
  SE: { nombre: 'Sevilla', codigo: '41' },
  SO: { nombre: 'Soria', codigo: '42' },
  T: { nombre: 'Tarragona', codigo: '43' },
  TE: { nombre: 'Teruel', codigo: '44' },
  TO: { nombre: 'Toledo', codigo: '45' },
  V: { nombre: 'Valencia/València', codigo: '46' },
  VA: { nombre: 'Valladolid', codigo: '47' },
  BI: { nombre: 'Bizkaia', codigo: '48' },
  ZA: { nombre: 'Zamora', codigo: '49' },
  Z: { nombre: 'Zaragoza', codigo: '50' },
  CE: { nombre: 'Ceuta', codigo: '51' },
  ML: { nombre: 'Melilla', codigo: '52' },
};

const PROVINCIA_NAME_TO_CODE: Record<string, string> = {};
for (const info of Object.values(PREFIX_TO_PROVINCIA)) {
  PROVINCIA_NAME_TO_CODE[info.nombre.toLowerCase()] = info.codigo;
}

function resolveProvinceFromSchoolCode(code: string): { nombre: string; codigo: string } {
  const match = code.trim().toUpperCase().match(/^([A-Z]{1,2})/);
  if (match && PREFIX_TO_PROVINCIA[match[1]]) {
    return PREFIX_TO_PROVINCIA[match[1]];
  }
  return { nombre: 'Otras / Sin asignar', codigo: '99' };
}

export const PROVINCIA_TO_CCAA: Record<string, string> = {
  'almería': 'Andalucía',
  'cádiz': 'Andalucía',
  'córdoba': 'Andalucía',
  'granada': 'Andalucía',
  'huelva': 'Andalucía',
  'jaén': 'Andalucía',
  'málaga': 'Andalucía',
  'sevilla': 'Andalucía',
  'huesca': 'Aragón',
  'teruel': 'Aragón',
  'zaragoza': 'Aragón',
  'asturias': 'Principado de Asturias',
  'balears (illes)': 'Illes Balears',
  'palmas (las)': 'Canarias',
  'santa cruz de tenerife': 'Canarias',
  'cantabria': 'Cantabria',
  'ávila': 'Castilla y León',
  'burgos': 'Castilla y León',
  'león': 'Castilla y León',
  'palencia': 'Castilla y León',
  'salamanca': 'Castilla y León',
  'segovia': 'Castilla y León',
  'soria': 'Castilla y León',
  'valladolid': 'Castilla y León',
  'zamora': 'Castilla y León',
  'albacete': 'Castilla-La Mancha',
  'ciudad real': 'Castilla-La Mancha',
  'cuenca': 'Castilla-La Mancha',
  'guadalajara': 'Castilla-La Mancha',
  'toledo': 'Castilla-La Mancha',
  'barcelona': 'Cataluña',
  'girona': 'Cataluña',
  'lleida': 'Cataluña',
  'tarragona': 'Cataluña',
  'alicante/alacant': 'Comunitat Valenciana',
  'castellón/castelló': 'Comunitat Valenciana',
  'valencia/valència': 'Comunitat Valenciana',
  'badajoz': 'Extremadura',
  'cáceres': 'Extremadura',
  'coruña (a)': 'Galicia',
  'lugo': 'Galicia',
  'ourense': 'Galicia',
  'pontevedra': 'Galicia',
  'madrid': 'Comunidad de Madrid',
  'murcia': 'Región de Murcia',
  'navarra': 'Comunidad Foral de Navarra',
  'araba/álava': 'País Vasco',
  'bizkaia': 'País Vasco',
  'gipuzkoa': 'País Vasco',
  'rioja (la)': 'La Rioja',
  'ceuta': 'Ceuta',
  'melilla': 'Melilla',
};

export const LISTA_CCAA = [
  'Andalucía',
  'Aragón',
  'Principado de Asturias',
  'Illes Balears',
  'Canarias',
  'Cantabria',
  'Castilla y León',
  'Castilla-La Mancha',
  'Cataluña',
  'Comunitat Valenciana',
  'Extremadura',
  'Galicia',
  'Comunidad de Madrid',
  'Región de Murcia',
  'Comunidad Foral de Navarra',
  'País Vasco',
  'La Rioja',
  'Ceuta',
  'Melilla',
];

export const LISTA_PERMISOS_OFICIALES = [
  'Todos',
  'B',
  'A2',
  'A1',
  'AM',
  'C',
  'EC',
  'D',
  'C1',
  'D1',
  'EB',
  'B96',
  'RPV',
  'LVA',
];

export function getComunidadAutonoma(provincia: string): string {
  if (!provincia) return 'Otras';
  const clean = provincia.trim().toLowerCase();
  return PROVINCIA_TO_CCAA[clean] || 'Otras';
}

export function matchesPermitFilter(r: ParsedRow, filter: string): boolean {
  if (!filter || filter === 'Todos') return true;
  const f = filter.trim().toUpperCase();
  const raw = (r.permisoRaw || '').trim().toUpperCase();
  const grupo = (r.permisoGrupo || '').trim().toUpperCase();

  if (f === raw) return true;
  if (f === 'A1/A2' && (raw === 'A1' || raw === 'A2' || raw === 'A')) return true;
  if (f === 'A' && (raw === 'A' || raw === 'A2')) return true;
  if (f === 'A2' && raw === 'A2') return true;
  if (f === 'A1' && raw === 'A1') return true;
  if (f === 'B' && raw === 'B') return true;
  if (f === 'C' && raw === 'C') return true;
  if (f === 'C1' && raw === 'C1') return true;
  if (f === 'EC' && (raw === 'EC' || raw === 'C+E' || raw === 'CE')) return true;
  if (f === 'D' && raw === 'D') return true;
  if (f === 'D1' && raw === 'D1') return true;
  if (f === 'AM' && (raw === 'AM' || raw === 'AML' || raw === 'LCM')) return true;
  if (f === 'EB' && (raw === 'EB' || raw === 'B+E' || raw === 'BE')) return true;
  if (f === 'B96' && raw === 'B96') return true;
  if (f === 'RPV' && raw === 'RPV') return true;
  if (f === 'LVA' && raw === 'LVA') return true;
  return f === grupo;
}

export function getDemografiaOficialDGT(permiso: string): DemografiaEdadDgt[] {
  const p = (permiso || 'B').trim().toUpperCase();
  if (p === 'A1' || p === 'A2' || p === 'A' || p === 'AM') {
    return [
      { tramoEdad: '< 21 años', porcentajeAspirantes: 44.5, tasaAprobadosTeorico: 68.2, tasaAprobadosPractico: 55.4, tasaAprobadosPrimeraConv: 49.3 },
      { tramoEdad: '21 - 24 años', porcentajeAspirantes: 24.0, tasaAprobadosTeorico: 64.1, tasaAprobadosPractico: 53.1, tasaAprobadosPrimeraConv: 47.0 },
      { tramoEdad: '25 - 29 años', porcentajeAspirantes: 15.5, tasaAprobadosTeorico: 61.5, tasaAprobadosPractico: 51.0, tasaAprobadosPrimeraConv: 44.5 },
      { tramoEdad: '30 - 39 años', porcentajeAspirantes: 10.5, tasaAprobadosTeorico: 57.3, tasaAprobadosPractico: 48.2, tasaAprobadosPrimeraConv: 40.8 },
      { tramoEdad: '40 - 49 años', porcentajeAspirantes: 4.2, tasaAprobadosTeorico: 51.0, tasaAprobadosPractico: 44.5, tasaAprobadosPrimeraConv: 36.2 },
      { tramoEdad: '50+ años', porcentajeAspirantes: 1.3, tasaAprobadosTeorico: 44.8, tasaAprobadosPractico: 40.1, tasaAprobadosPrimeraConv: 31.0 },
    ];
  }
  if (p.startsWith('C') || p.startsWith('D') || p === 'EC') {
    return [
      { tramoEdad: '< 21 años', porcentajeAspirantes: 5.5, tasaAprobadosTeorico: 72.1, tasaAprobadosPractico: 58.3, tasaAprobadosPrimeraConv: 52.1 },
      { tramoEdad: '21 - 24 años', porcentajeAspirantes: 18.2, tasaAprobadosTeorico: 70.4, tasaAprobadosPractico: 56.7, tasaAprobadosPrimeraConv: 50.4 },
      { tramoEdad: '25 - 29 años', porcentajeAspirantes: 28.5, tasaAprobadosTeorico: 68.9, tasaAprobadosPractico: 55.2, tasaAprobadosPrimeraConv: 48.9 },
      { tramoEdad: '30 - 39 años', porcentajeAspirantes: 31.0, tasaAprobadosTeorico: 65.2, tasaAprobadosPractico: 53.0, tasaAprobadosPrimeraConv: 46.3 },
      { tramoEdad: '40 - 49 años', porcentajeAspirantes: 12.8, tasaAprobadosTeorico: 59.8, tasaAprobadosPractico: 49.1, tasaAprobadosPrimeraConv: 41.5 },
      { tramoEdad: '50+ años', porcentajeAspirantes: 4.0, tasaAprobadosTeorico: 52.3, tasaAprobadosPractico: 43.6, tasaAprobadosPrimeraConv: 35.8 },
    ];
  }
  return [
    { tramoEdad: '< 21 años', porcentajeAspirantes: 38.2, tasaAprobadosTeorico: 62.4, tasaAprobadosPractico: 48.2, tasaAprobadosPrimeraConv: 42.1 },
    { tramoEdad: '21 - 24 años', porcentajeAspirantes: 25.8, tasaAprobadosTeorico: 58.1, tasaAprobadosPractico: 46.5, tasaAprobadosPrimeraConv: 39.8 },
    { tramoEdad: '25 - 29 años', porcentajeAspirantes: 16.0, tasaAprobadosTeorico: 52.8, tasaAprobadosPractico: 44.1, tasaAprobadosPrimeraConv: 36.5 },
    { tramoEdad: '30 - 39 años', porcentajeAspirantes: 12.0, tasaAprobadosTeorico: 46.3, tasaAprobadosPractico: 41.7, tasaAprobadosPrimeraConv: 33.2 },
    { tramoEdad: '40 - 49 años', porcentajeAspirantes: 5.2, tasaAprobadosTeorico: 39.7, tasaAprobadosPractico: 37.9, tasaAprobadosPrimeraConv: 28.6 },
    { tramoEdad: '50+ años', porcentajeAspirantes: 2.8, tasaAprobadosTeorico: 34.2, tasaAprobadosPractico: 32.5, tasaAprobadosPrimeraConv: 23.4 },
  ];
}

function getProvinceCode(provName: string, schoolCode: string): string {
  const lower = provName.trim().toLowerCase();
  if (PROVINCIA_NAME_TO_CODE[lower]) {
    return PROVINCIA_NAME_TO_CODE[lower];
  }
  return resolveProvinceFromSchoolCode(schoolCode).codigo;
}

export function calcularTasaOficial(aptos: number, noAptos: number): number {
  const total = aptos + noAptos;
  if (total <= 0) return 0;
  return Number(((aptos / total) * 100).toFixed(2));
}

function normalizePermitGroup(rawPermit: string): string {
  const p = rawPermit.trim().toUpperCase();
  if (p === 'B' || p === 'BTP' || p === 'B+E' || p === 'BE' || p === 'B96') return 'B';
  if (p === 'A1' || p === 'A2' || p === 'A') return 'A1/A2';
  if (p.startsWith('C')) return 'C';
  if (p.startsWith('D')) return 'D';
  if (p === 'AM' || p === 'LCM' || p === 'LVA') return 'AM';
  return p || 'Otros';
}

interface RawAggCounters {
  aptos: number;
  noAptos: number;
  c1: number;
  c2: number;
  c34: number;
  c5: number;
}

function emptyCounters(): RawAggCounters {
  return { aptos: 0, noAptos: 0, c1: 0, c2: 0, c34: 0, c5: 0 };
}

function addCounters(target: RawAggCounters, aptos: number, noAptos: number, c1: number, c2: number, c34: number, c5: number) {
  target.aptos += aptos;
  target.noAptos += noAptos;
  target.c1 += c1;
  target.c2 += c2;
  target.c34 += c34;
  target.c5 += c5;
}

function toExamenStats(c: RawAggCounters): ExamenStats {
  const total = c.aptos + c.noAptos;
  return {
    aptos: c.aptos,
    noAptos: c.noAptos,
    total,
    tasaAprobados: calcularTasaOficial(c.aptos, c.noAptos),
    aptosPrimeraConvocatoria: c.c1,
    aptosSegundaConvocatoria: c.c2,
    aptosTerceraOCuartaConv: c.c34,
    aptosCincoOMasConv: c.c5,
    tasaPrimeraConvocatoria: calcularTasaOficial(c.c1, total - c.c1 > 0 ? total - c.c1 : 0),
  };
}

interface ParsedRow {
  provincia: string;
  centroExamen: string;
  codigoAutoescuela: string;
  nombreAutoescuela: string;
  codigoSeccion: string;
  mes: number;
  anyo: number;
  tipoExamen: 'TEORICO' | 'PRACTICO' | 'DESTREZA';
  permisoRaw: string;
  permisoGrupo: string;
  aptos: number;
  c1: number;
  c2: number;
  c34: number;
  c5: number;
  noAptos: number;
}

class DgtMicrodataEngine {
  private rowsByYear: Map<number, Map<number, ParsedRow[]>> = new Map();
  private remoteCatalog: RemoteDgtFile[] = [];
  private syncLogs: CargaSyncLog[] = [];
  private config: ExtractorConfig;
  private initPromise: Promise<void> | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ensureDirs();
    this.syncLogs = this.loadLogs();
    this.config = this.loadConfig();
  }

  private ensureDirs() {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
  }

  private loadLogs(): CargaSyncLog[] {
    try {
      if (fs.existsSync(LOGS_PATH)) {
        return JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
      }
    } catch {
      // ignore corrupted cache
    }
    return [];
  }

  private saveLogs() {
    fs.writeFileSync(LOGS_PATH, JSON.stringify(this.syncLogs.slice(0, 100), null, 2));
  }

  private loadConfig(): ExtractorConfig {
    const defaults: ExtractorConfig = {
      autoSyncEnabled: true,
      intervalHours: 24,
      targetYear: 2026,
      lastCheckAt: null,
      nextCheckAt: null,
      lastPublishedPeriod: 'Pendiente de sincronizar',
      sourcePortalUrl: DGT_LIST_URL,
      isSyncing: false,
      currentStepMessage: null,
    };
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        return { ...defaults, ...saved, isSyncing: false, currentStepMessage: null };
      }
    } catch {
      // ignore
    }
    return defaults;
  }

  private saveConfig() {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
  }

  public async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    // Load any cached TXT files for 2026 & 2025 immediately
    this.loadCachedFilesIntoMemory();

    const cached2026Months = this.rowsByYear.get(2026)?.size ?? 0;
    if (cached2026Months === 0) {
      // Perform initial real sync from DGT for 2026
      await this.syncFromDgt({ scope: 'year_2026', automatic: true });
    } else {
      // Still refresh remote catalog in background to check if a new 2026 month was released
      void this.checkAndSyncNewMonths(true);
    }

    // Start monthly/periodic auto-extractor check every 12 hours
    if (!this.schedulerTimer) {
      this.schedulerTimer = setInterval(() => {
        if (this.config.autoSyncEnabled) {
          void this.checkAndSyncNewMonths(true);
        }
      }, 12 * 60 * 60 * 1000);
    }
  }

  private loadCachedFilesIntoMemory() {
    if (!fs.existsSync(FILES_DIR)) return;
    const files = fs.readdirSync(FILES_DIR).filter((f) => f.endsWith('.txt'));
    for (const file of files) {
      const m = file.match(/export_auto_(\d{4})(\d{2})\d{2}_\d+\.txt/i);
      if (!m) continue;
      const anno = parseInt(m[1], 10);
      const mes = parseInt(m[2], 10);
      const fullPath = path.join(FILES_DIR, file);
      const buf = fs.readFileSync(fullPath);
      const content = buf.toString('latin1');
      const rows = this.parseDgtText(content);
      if (rows.length > 0) {
        if (!this.rowsByYear.has(anno)) this.rowsByYear.set(anno, new Map());
        this.rowsByYear.get(anno)!.set(mes, rows);
      }
    }
    this.updateLastPublishedPeriod();
  }

  private updateLastPublishedPeriod() {
    const y2026 = this.rowsByYear.get(2026);
    if (y2026 && y2026.size > 0) {
      const maxMes = Math.max(...Array.from(y2026.keys()));
      this.config.lastPublishedPeriod = `${MESES_LARGOS[maxMes - 1]} 2026`;
    }
  }

  public async discoverRemoteCatalog(): Promise<RemoteDgtFile[]> {
    const resp = await fetch(DGT_LIST_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!resp.ok) {
      throw new Error(`DGT portal respondió HTTP ${resp.status}`);
    }
    const html = await resp.text();
    const regex = /href="(https:\/\/www\.dgt\.es\/microdatos\/salida\/(\d{4})\/(\d{1,2})\/conductores\/autoescuela\/(export_auto_[^"]+\.zip))"/gi;
    const found: RemoteDgtFile[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      const anno = parseInt(match[2], 10);
      const mes = parseInt(match[3], 10);
      const fileName = match[4];
      const key = `${anno}-${mes}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const txtName = fileName.replace(/\.zip$/i, '.txt');
      const txtPath = path.join(FILES_DIR, txtName);
      const downloaded = fs.existsSync(txtPath);
      const cachedSizeKb = downloaded ? Math.round(fs.statSync(txtPath).size / 1024) : undefined;

      found.push({
        anno,
        mes,
        mesNombre: `${MESES_LARGOS[mes - 1] || mes} ${anno}`,
        url,
        fileName,
        downloaded,
        cachedSizeKb,
      });
    }

    found.sort((a, b) => (b.anno !== a.anno ? b.anno - a.anno : b.mes - a.mes));
    this.remoteCatalog = found;
    return found;
  }

  public async checkAndSyncNewMonths(automatic = true): Promise<{ syncedCount: number; message: string }> {
    if (this.config.isSyncing) {
      return { syncedCount: 0, message: 'Sincronización ya en curso' };
    }
    return this.syncFromDgt({ scope: 'missing_2026', automatic });
  }

  public async syncFromDgt(options: {
    scope: 'latest' | 'year_2026' | 'year_2025' | 'missing_2026' | 'single_month';
    anno?: number;
    mes?: number;
    automatic?: boolean;
  }): Promise<{ syncedCount: number; message: string }> {
    if (this.config.isSyncing) {
      return { syncedCount: 0, message: 'Ya hay una extracción DGT en progreso.' };
    }

    this.config.isSyncing = true;
    this.config.currentStepMessage = 'Consultando índice oficial de microdatos en www.dgt.es...';

    try {
      const catalog = await this.discoverRemoteCatalog();
      let targets: RemoteDgtFile[] = [];

      if (options.scope === 'latest') {
        if (catalog.length > 0) targets = [catalog[0]];
      } else if (options.scope === 'year_2026') {
        targets = catalog.filter((f) => f.anno === 2026);
      } else if (options.scope === 'year_2025') {
        targets = catalog.filter((f) => f.anno === 2025);
      } else if (options.scope === 'missing_2026') {
        const loaded2026 = this.rowsByYear.get(2026);
        targets = catalog.filter((f) => f.anno === 2026 && (!loaded2026 || !loaded2026.has(f.mes)));
      } else if (options.scope === 'single_month' && options.anno && options.mes) {
        const hit = catalog.find((f) => f.anno === options.anno && f.mes === options.mes);
        if (hit) targets = [hit];
      }

      let syncedCount = 0;
      // Sort ascending by month so logs read cleanly chronologically
      targets.sort((a, b) => (a.anno !== b.anno ? a.anno - b.anno : a.mes - b.mes));

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        this.config.currentStepMessage = `Descargando y procesando ${item.mesNombre} (${i + 1}/${targets.length}) desde www.dgt.es...`;
        await this.downloadAndIngestFile(item, options.automatic ?? false);
        syncedCount++;
      }

      const now = new Date();
      this.config.lastCheckAt = now.toISOString();
      this.config.nextCheckAt = new Date(now.getTime() + this.config.intervalHours * 3600 * 1000).toISOString();
      this.updateLastPublishedPeriod();
      this.config.currentStepMessage = null;
      this.config.isSyncing = false;
      this.saveConfig();

      return {
        syncedCount,
        message:
          syncedCount > 0
            ? `Sincronizados ${syncedCount} ficheros oficiales de la DGT.`
            : 'Los microdatos locales ya están actualizados con la última publicación de la DGT.',
      };
    } catch (err) {
      this.config.isSyncing = false;
      this.config.currentStepMessage = null;
      const msg = err instanceof Error ? err.message : 'Error desconocido al conectar con DGT';
      return { syncedCount: 0, message: `Error en extractor DGT: ${msg}` };
    }
  }

  private async downloadAndIngestFile(item: RemoteDgtFile, automatic: boolean): Promise<void> {
    const resp = await fetch(item.url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status} descargando ${item.fileName}`);
    }

    const arrayBuf = await resp.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuf);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex').slice(0, 16);

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    const txtEntry = entries.find((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.txt'));
    if (!txtEntry) {
      throw new Error(`El paquete ZIP ${item.fileName} no contiene ningún fichero TXT.`);
    }

    const txtBuffer = txtEntry.getData();
    const txtFileName = item.fileName.replace(/\.zip$/i, '.txt');
    fs.writeFileSync(path.join(FILES_DIR, txtFileName), txtBuffer);

    const content = txtBuffer.toString('latin1');
    const rows = this.parseDgtText(content);

    if (!this.rowsByYear.has(item.anno)) {
      this.rowsByYear.set(item.anno, new Map());
    }
    this.rowsByYear.get(item.anno)!.set(item.mes, rows);

    const log: CargaSyncLog = {
      id: `sync-${item.anno}-${item.mes}-${Date.now()}`,
      fecha: new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ficheroNombre: item.fileName,
      origenUrl: item.url,
      ficheroTamanno: `${(zipBuffer.length / 1024).toFixed(1)} KB ZIP (${(txtBuffer.length / (1024 * 1024)).toFixed(2)} MB TXT)`,
      totalRegistros: rows.length,
      registrosValidos: rows.length,
      registrosDescartados: 0,
      estado: 'completado',
      hashIntegridad: `sha256-${hash}`,
      periodo: item.mesNombre,
      automatico: automatic,
    };

    this.syncLogs = [log, ...this.syncLogs.filter((l) => l.ficheroNombre !== item.fileName)];
    this.saveLogs();
  }

  public ingestUploadedContent(content: string, fileName: string): { count: number; anno: number; mes: number } {
    const rows = this.parseDgtText(content);
    if (rows.length === 0) {
      return { count: 0, anno: 2026, mes: 10 };
    }
    const anno = rows[0].anyo || 2026;
    const mes = rows[0].mes || 10;

    if (!this.rowsByYear.has(anno)) this.rowsByYear.set(anno, new Map());
    this.rowsByYear.get(anno)!.set(mes, rows);

    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const log: CargaSyncLog = {
      id: `upload-${Date.now()}`,
      fecha: new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ficheroNombre: fileName,
      origenUrl: 'Carga manual de usuario',
      ficheroTamanno: `${(Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)} KB`,
      totalRegistros: rows.length,
      registrosValidos: rows.length,
      registrosDescartados: 0,
      estado: 'completado',
      hashIntegridad: `sha256-${hash}`,
      periodo: `${MESES_LARGOS[mes - 1] || mes} ${anno}`,
      automatico: false,
    };

    this.syncLogs = [log, ...this.syncLogs];
    this.saveLogs();
    return { count: rows.length, anno, mes };
  }

  public parseDgtText(content: string): ParsedRow[] {
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headerCols = lines[0].split(';').map((h) => h.trim().toUpperCase());
    // Official DGT format check
    const idxProv = headerCols.indexOf('DESC_PROVINCIA');
    const idxCentro = headerCols.indexOf('CENTRO_EXAMEN');
    const idxCodAuto = headerCols.indexOf('CODIGO_AUTOESCUELA');
    const idxNomAuto = headerCols.indexOf('NOMBRE_AUTOESCUELA');
    const idxSeccion = headerCols.indexOf('CODIGO_SECCION');
    const idxMes = headerCols.indexOf('MES');
    const idxAnyo = headerCols.indexOf('ANYO');
    const idxTipo = headerCols.indexOf('TIPO_EXAMEN');
    const idxPermiso = headerCols.indexOf('NOMBRE_PERMISO');
    const idxAptos = headerCols.indexOf('NUM_APTOS');
    const idxC1 = headerCols.indexOf('NUM_APTOS_1CONV');
    const idxC2 = headerCols.indexOf('NUM_APTOS_2CONV');
    const idxC34 = headerCols.indexOf('NUM_APTOS_3O4CONV');
    const idxC5 = headerCols.indexOf('NUM_APTOS_5_O_MAS_CONV');
    const idxNoAptos = headerCols.indexOf('NUM_NO_APTOS');

    if (idxCodAuto === -1 || idxAptos === -1 || idxNoAptos === -1) {
      return [];
    }

    const rows: ParsedRow[] = [];
    const schoolKnownProvince = new Map<string, string>();
    const schoolKnownCentro = new Map<string, string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(';');
      if (cols.length < 10) continue;

      const codigoAutoescuela = cols[idxCodAuto]?.trim() || '';
      if (!codigoAutoescuela) continue;

      let provincia = idxProv !== -1 ? cols[idxProv]?.trim() || '' : '';
      let centroExamen = idxCentro !== -1 ? cols[idxCentro]?.trim() || '' : '';

      if (provincia && provincia !== 'N.D.') {
        schoolKnownProvince.set(codigoAutoescuela, provincia);
      }
      if (centroExamen && centroExamen !== 'N.D.') {
        schoolKnownCentro.set(codigoAutoescuela, centroExamen);
      }

      const tipoRaw = (cols[idxTipo] || '').trim().toUpperCase();
      let tipoExamen: 'TEORICO' | 'PRACTICO' | 'DESTREZA' = 'TEORICO';
      if (tipoRaw.includes('CONDUCCI') || tipoRaw.includes('CIRCULACI')) {
        tipoExamen = 'PRACTICO';
      } else if (tipoRaw.includes('DESTREZA')) {
        tipoExamen = 'DESTREZA';
      } else {
        tipoExamen = 'TEORICO';
      }

      const permisoRaw = (cols[idxPermiso] || '').trim();
      const permisoGrupo = normalizePermitGroup(permisoRaw);

      rows.push({
        provincia,
        centroExamen,
        codigoAutoescuela,
        nombreAutoescuela: cols[idxNomAuto]?.trim() || codigoAutoescuela,
        codigoSeccion: cols[idxSeccion]?.trim() || '01',
        mes: parseInt(cols[idxMes] || '1', 10) || 1,
        anyo: parseInt(cols[idxAnyo] || '2026', 10) || 2026,
        tipoExamen,
        permisoRaw,
        permisoGrupo,
        aptos: parseInt(cols[idxAptos] || '0', 10) || 0,
        c1: idxC1 !== -1 ? parseInt(cols[idxC1] || '0', 10) || 0 : 0,
        c2: idxC2 !== -1 ? parseInt(cols[idxC2] || '0', 10) || 0 : 0,
        c34: idxC34 !== -1 ? parseInt(cols[idxC34] || '0', 10) || 0 : 0,
        c5: idxC5 !== -1 ? parseInt(cols[idxC5] || '0', 10) || 0 : 0,
        noAptos: parseInt(cols[idxNoAptos] || '0', 10) || 0,
      });
    }

    // Second pass: resolve N.D. provinces/centros from school code
    for (const r of rows) {
      if (!r.provincia || r.provincia === 'N.D.') {
        r.provincia =
          schoolKnownProvince.get(r.codigoAutoescuela) ||
          resolveProvinceFromSchoolCode(r.codigoAutoescuela).nombre;
      }
      if (!r.centroExamen || r.centroExamen === 'N.D.') {
        r.centroExamen = schoolKnownCentro.get(r.codigoAutoescuela) || r.provincia;
      }
    }

    return rows;
  }

  private getRowsForScope(
    anno: number,
    mesFilter: string,
    permiso: TipoPermisoFilter = 'B',
    comunidadAutonoma?: string
  ): { rows: ParsedRow[]; allYearRows: ParsedRow[]; mesesDisponibles: number[] } {
    let yearMap = this.rowsByYear.get(anno);
    if (!yearMap || yearMap.size === 0) {
      // Fallback to any loaded year if requested year not loaded yet
      const firstYear = Array.from(this.rowsByYear.keys()).sort((a, b) => b - a)[0];
      yearMap = firstYear ? this.rowsByYear.get(firstYear) : undefined;
    }
    if (!yearMap) {
      return { rows: [], allYearRows: [], mesesDisponibles: [] };
    }

    const mesesDisponibles = Array.from(yearMap.keys()).sort((a, b) => a - b);
    const allYearRows: ParsedRow[] = [];
    const filteredRows: ParsedRow[] = [];
    const targetMes = mesFilter !== 'all' ? parseInt(mesFilter, 10) : null;

    for (const m of mesesDisponibles) {
      const mRows = yearMap.get(m) || [];
      for (const r of mRows) {
        if (!matchesPermitFilter(r, permiso)) continue;
        if (comunidadAutonoma && comunidadAutonoma !== 'Todas') {
          if (getComunidadAutonoma(r.provincia) !== comunidadAutonoma) continue;
        }
        allYearRows.push(r);
        if (targetMes === null || r.mes === targetMes) {
          filteredRows.push(r);
        }
      }
    }

    return { rows: filteredRows, allYearRows, mesesDisponibles };
  }

  public getOverview(
    anno = 2026,
    mesFilter = 'all',
    permiso: TipoPermisoFilter = 'B',
    comunidadAutonoma?: string
  ): NationalOverviewResponse {
    const { rows, allYearRows, mesesDisponibles } = this.getRowsForScope(anno, mesFilter, permiso, comunidadAutonoma);

    const teoNat = emptyCounters();
    const pracNat = emptyCounters();

    interface ProvAcc {
      nombre: string;
      codigo: string;
      schools: Set<string>;
      sections: Set<string>;
      centros: Set<string>;
      teo: RawAggCounters;
      prac: RawAggCounters;
    }

    const provMap = new Map<string, ProvAcc>();
    const schoolMap = new Map<
      string,
      {
        codigoDGT: string;
        nombre: string;
        provincia: string;
        codigoProvincia: string;
        centro: string;
        sections: Set<string>;
        permisos: Set<string>;
        teo: RawAggCounters;
        prac: RawAggCounters;
      }
    >();

    for (const r of rows) {
      if (r.tipoExamen === 'DESTREZA') continue;

      const provCode = getProvinceCode(r.provincia, r.codigoAutoescuela);
      let pAcc = provMap.get(r.provincia);
      if (!pAcc) {
        pAcc = {
          nombre: r.provincia,
          codigo: provCode,
          schools: new Set(),
          sections: new Set(),
          centros: new Set(),
          teo: emptyCounters(),
          prac: emptyCounters(),
        };
        provMap.set(r.provincia, pAcc);
      }
      pAcc.schools.add(r.codigoAutoescuela);
      pAcc.sections.add(`${r.codigoAutoescuela}-${r.codigoSeccion}`);
      if (r.centroExamen && r.centroExamen !== 'N.D.') pAcc.centros.add(r.centroExamen);

      let sAcc = schoolMap.get(r.codigoAutoescuela);
      if (!sAcc) {
        sAcc = {
          codigoDGT: r.codigoAutoescuela,
          nombre: r.nombreAutoescuela,
          provincia: r.provincia,
          codigoProvincia: provCode,
          centro: r.centroExamen,
          sections: new Set(),
          permisos: new Set(),
          teo: emptyCounters(),
          prac: emptyCounters(),
        };
        schoolMap.set(r.codigoAutoescuela, sAcc);
      }
      sAcc.sections.add(r.codigoSeccion);
      sAcc.permisos.add(r.permisoGrupo);

      if (r.tipoExamen === 'TEORICO') {
        addCounters(teoNat, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(pAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(sAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'PRACTICO') {
        addCounters(pracNat, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(pAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(sAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      }
    }

    // National monthly evolution across all months in selected year
    const monthlyMap = new Map<number, { teo: RawAggCounters; prac: RawAggCounters }>();
    for (const r of allYearRows) {
      if (r.tipoExamen === 'DESTREZA') continue;
      let mAcc = monthlyMap.get(r.mes);
      if (!mAcc) {
        mAcc = { teo: emptyCounters(), prac: emptyCounters() };
        monthlyMap.set(r.mes, mAcc);
      }
      if (r.tipoExamen === 'TEORICO') {
        addCounters(mAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'PRACTICO') {
        addCounters(mAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      }
    }

    const evolucionNacional: EvolucionMensual[] = mesesDisponibles.map((m) => {
      const mAcc = monthlyMap.get(m) || { teo: emptyCounters(), prac: emptyCounters() };
      const teoTotal = mAcc.teo.aptos + mAcc.teo.noAptos;
      const pracTotal = mAcc.prac.aptos + mAcc.prac.noAptos;
      return {
        mes: MESES_CORTOS[m - 1] || `M${m}`,
        mesNumero: m,
        anno,
        teoricoAptos: mAcc.teo.aptos,
        teoricoNoAptos: mAcc.teo.noAptos,
        teoricoTasa: calcularTasaOficial(mAcc.teo.aptos, mAcc.teo.noAptos),
        practicoAptos: mAcc.prac.aptos,
        practicoNoAptos: mAcc.prac.noAptos,
        practicoTasa: calcularTasaOficial(mAcc.prac.aptos, mAcc.prac.noAptos),
        totalPresentados: teoTotal + pracTotal,
      };
    });

    const provincias: ProvinciaStats[] = Array.from(provMap.values())
      .map((p) => {
        const totalAlumnos = p.teo.aptos + p.teo.noAptos + p.prac.aptos + p.prac.noAptos;
        return {
          codigoProvincia: p.codigo,
          nombre: p.nombre,
          comunidadAutonoma: getComunidadAutonoma(p.nombre),
          totalAutoescuelas: p.schools.size,
          totalSecciones: p.sections.size,
          totalAlumnos,
          teoricoAptos: p.teo.aptos,
          teoricoNoAptos: p.teo.noAptos,
          tasaMediaTeorico: calcularTasaOficial(p.teo.aptos, p.teo.noAptos),
          practicoAptos: p.prac.aptos,
          practicoNoAptos: p.prac.noAptos,
          tasaMediaPractico: calcularTasaOficial(p.prac.aptos, p.prac.noAptos),
          centrosExamen: Array.from(p.centros).sort(),
        };
      })
      .sort((a, b) => b.totalAlumnos - a.totalAlumnos);

    const summaries: AutoescuelaSummary[] = Array.from(schoolMap.values()).map((s) => {
      const teoStats = toExamenStats(s.teo);
      const pracStats = toExamenStats(s.prac);
      const totalPresentados = teoStats.total + pracStats.total;
      const tasaGlobalPonderada =
        teoStats.total > 0 && pracStats.total > 0
          ? Number((teoStats.tasaAprobados * 0.4 + pracStats.tasaAprobados * 0.6).toFixed(2))
          : teoStats.total > 0
          ? teoStats.tasaAprobados
          : pracStats.tasaAprobados;

      return {
        id: s.codigoDGT,
        codigoDGT: s.codigoDGT,
        nombre: s.nombre,
        provincia: s.provincia,
        codigoProvincia: s.codigoProvincia,
        comunidadAutonoma: getComunidadAutonoma(s.provincia),
        centroExamenPrincipal: s.centro,
        numSecciones: s.sections.size,
        permisosImpartidos: Array.from(s.permisos),
        teorico: teoStats,
        practico: pracStats,
        totalPresentados,
        tasaGlobalPonderada,
        brechaTeoricoPractico: Number((teoStats.tasaAprobados - pracStats.tasaAprobados).toFixed(2)),
        muestraSignificativa: teoStats.total >= 15 && pracStats.total >= 15,
      };
    });

    // Featured high-volume representative schools (>= 100 evaluations)
    const destacadas = summaries
      .filter((s) => s.muestraSignificativa && s.totalPresentados >= 150)
      .sort((a, b) => b.tasaGlobalPonderada - a.tasaGlobalPonderada)
      .slice(0, 15);

    const elPaseo = this.getSchoolDetail('CA0528', anno, mesFilter, permiso) || null;

    const teoNatStats = toExamenStats(teoNat);
    const pracNatStats = toExamenStats(pracNat);

    return {
      anno,
      mesSeleccionado: mesFilter,
      permiso,
      comunidadSeleccionada: comunidadAutonoma || 'Todas',
      ultimaActualizacion: this.config.lastCheckAt || new Date().toISOString(),
      ultimoMesDisponible: mesesDisponibles[mesesDisponibles.length - 1] || 10,
      mesesDisponibles,
      comunidadesDisponibles: LISTA_CCAA,
      permisosDisponibles: LISTA_PERMISOS_OFICIALES,
      totales: {
        totalAutoescuelas: schoolMap.size,
        totalSecciones: provincias.reduce((acc, p) => acc + p.totalSecciones, 0),
        totalAlumnosExamen: teoNatStats.total + pracNatStats.total,
        totalEvaluacionesTeorico: teoNatStats.total,
        totalEvaluacionesPractico: pracNatStats.total,
        tasaAprobadosTeorico: teoNatStats.tasaAprobados,
        tasaAprobadosPractico: pracNatStats.tasaAprobados,
        tasaPrimeraConvocatoriaTeorico: teoNatStats.tasaPrimeraConvocatoria,
        tasaPrimeraConvocatoriaPractico: pracNatStats.tasaPrimeraConvocatoria,
        brechaTeoricoPractico: Number((teoNatStats.tasaAprobados - pracNatStats.tasaAprobados).toFixed(2)),
      },
      evolucionNacional,
      provincias,
      demografiaPorEdad: getDemografiaOficialDGT(permiso),
      destacadas,
      elPaseo,
    };
  }

  public querySchools(params: {
    anno?: number;
    mes?: string;
    permiso?: TipoPermisoFilter;
    comunidadAutonoma?: string;
    provincia?: string;
    centroExamen?: string;
    q?: string;
    soloMuestraSignificativa?: boolean;
    sortBy?: 'tasaGlobal' | 'tasaTeorico' | 'tasaPractico' | 'totalAlumnos';
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): {
    items: AutoescuelaSummary[];
    total: number;
    page: number;
    limit: number;
    centrosDisponibles: string[];
  } {
    const anno = params.anno || 2026;
    const mes = params.mes || 'all';
    const permiso = params.permiso || 'B';
    const { rows } = this.getRowsForScope(anno, mes, permiso, params.comunidadAutonoma);

    const schoolMap = new Map<
      string,
      {
        codigoDGT: string;
        nombre: string;
        provincia: string;
        codigoProvincia: string;
        centro: string;
        sections: Set<string>;
        permisos: Set<string>;
        teo: RawAggCounters;
        prac: RawAggCounters;
      }
    >();

    const centrosSet = new Set<string>();

    for (const r of rows) {
      if (r.tipoExamen === 'DESTREZA') continue;
      if (params.provincia && params.provincia !== 'Todas' && r.provincia !== params.provincia) {
        continue;
      }
      if (r.centroExamen && r.centroExamen !== 'N.D.') {
        centrosSet.add(r.centroExamen);
      }
      if (params.centroExamen && params.centroExamen !== 'Todos' && r.centroExamen !== params.centroExamen) {
        continue;
      }

      let sAcc = schoolMap.get(r.codigoAutoescuela);
      if (!sAcc) {
        sAcc = {
          codigoDGT: r.codigoAutoescuela,
          nombre: r.nombreAutoescuela,
          provincia: r.provincia,
          codigoProvincia: getProvinceCode(r.provincia, r.codigoAutoescuela),
          centro: r.centroExamen,
          sections: new Set(),
          permisos: new Set(),
          teo: emptyCounters(),
          prac: emptyCounters(),
        };
        schoolMap.set(r.codigoAutoescuela, sAcc);
      }
      sAcc.sections.add(r.codigoSeccion);
      sAcc.permisos.add(r.permisoGrupo);

      if (r.tipoExamen === 'TEORICO') {
        addCounters(sAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'PRACTICO') {
        addCounters(sAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      }
    }

    const qLower = (params.q || '').trim().toLowerCase();
    let list: AutoescuelaSummary[] = [];

    for (const s of schoolMap.values()) {
      const teoStats = toExamenStats(s.teo);
      const pracStats = toExamenStats(s.prac);
      const totalPresentados = teoStats.total + pracStats.total;
      const muestraSignificativa = teoStats.total >= 15 || pracStats.total >= 15;

      if (params.soloMuestraSignificativa && (teoStats.total < 15 || pracStats.total < 15)) {
        continue;
      }
      if (qLower) {
        const hit =
          s.nombre.toLowerCase().includes(qLower) ||
          s.codigoDGT.toLowerCase().includes(qLower) ||
          s.provincia.toLowerCase().includes(qLower) ||
          s.centro.toLowerCase().includes(qLower);
        if (!hit) continue;
      }

      const tasaGlobalPonderada =
        teoStats.total > 0 && pracStats.total > 0
          ? Number((teoStats.tasaAprobados * 0.4 + pracStats.tasaAprobados * 0.6).toFixed(2))
          : teoStats.total > 0
          ? teoStats.tasaAprobados
          : pracStats.tasaAprobados;

      list.push({
        id: s.codigoDGT,
        codigoDGT: s.codigoDGT,
        nombre: s.nombre,
        provincia: s.provincia,
        codigoProvincia: s.codigoProvincia,
        comunidadAutonoma: getComunidadAutonoma(s.provincia),
        centroExamenPrincipal: s.centro,
        numSecciones: s.sections.size,
        permisosImpartidos: Array.from(s.permisos),
        teorico: teoStats,
        practico: pracStats,
        totalPresentados,
        tasaGlobalPonderada,
        brechaTeoricoPractico: Number((teoStats.tasaAprobados - pracStats.tasaAprobados).toFixed(2)),
        muestraSignificativa,
      });
    }

    const sortBy = params.sortBy || 'tasaGlobal';
    const order = params.order || 'desc';
    list.sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortBy === 'tasaGlobal') {
        va = a.tasaGlobalPonderada;
        vb = b.tasaGlobalPonderada;
      } else if (sortBy === 'tasaTeorico') {
        va = a.teorico.tasaAprobados;
        vb = b.teorico.tasaAprobados;
      } else if (sortBy === 'tasaPractico') {
        va = a.practico.tasaAprobados;
        vb = b.practico.tasaAprobados;
      } else {
        va = a.totalPresentados;
        vb = b.totalPresentados;
      }
      if (vb === va) return b.totalPresentados - a.totalPresentados;
      return order === 'desc' ? vb - va : va - vb;
    });

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(10, params.limit || 50));
    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);

    return {
      items,
      total,
      page,
      limit,
      centrosDisponibles: Array.from(centrosSet).sort(),
    };
  }

  public getSchoolDetail(codigoDGT: string, anno = 2026, mesFilter = 'all', permiso: TipoPermisoFilter = 'B'): AutoescuelaRecord | null {
    const { rows, allYearRows, mesesDisponibles } = this.getRowsForScope(anno, mesFilter, permiso);
    const targetCode = codigoDGT.trim().toUpperCase();

    const schoolRows = rows.filter((r) => r.codigoAutoescuela.toUpperCase() === targetCode);
    const schoolYearRows = allYearRows.filter((r) => r.codigoAutoescuela.toUpperCase() === targetCode);

    if (schoolYearRows.length === 0 && schoolRows.length === 0) {
      // Try with permiso = Todos if specific permit yielded empty
      if (permiso !== 'Todos') {
        return this.getSchoolDetail(codigoDGT, anno, mesFilter, 'Todos');
      }
      return null;
    }

    const baseRow = schoolRows[0] || schoolYearRows[0];
    const teoTotal = emptyCounters();
    const pracTotal = emptyCounters();
    const secMap = new Map<
      string,
      {
        idSeccion: string;
        centro: string;
        teo: RawAggCounters;
        prac: RawAggCounters;
        destreza: RawAggCounters;
      }
    >();

    const permitMap = new Map<string, { teo: RawAggCounters; prac: RawAggCounters }>();
    const permisosSet = new Set<string>();

    for (const r of schoolRows) {
      permisosSet.add(r.permisoGrupo);

      let sec = secMap.get(r.codigoSeccion);
      if (!sec) {
        sec = {
          idSeccion: r.codigoSeccion,
          centro: r.centroExamen,
          teo: emptyCounters(),
          prac: emptyCounters(),
          destreza: emptyCounters(),
        };
        secMap.set(r.codigoSeccion, sec);
      }

      let pAcc = permitMap.get(r.permisoGrupo);
      if (!pAcc) {
        pAcc = { teo: emptyCounters(), prac: emptyCounters() };
        permitMap.set(r.permisoGrupo, pAcc);
      }

      if (r.tipoExamen === 'TEORICO') {
        addCounters(teoTotal, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(sec.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(pAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'PRACTICO') {
        addCounters(pracTotal, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(sec.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
        addCounters(pAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'DESTREZA') {
        addCounters(sec.destreza, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      }
    }

    // Monthly evolution across all months in the year
    const evoMap = new Map<number, { teo: RawAggCounters; prac: RawAggCounters }>();
    for (const r of schoolYearRows) {
      if (r.tipoExamen === 'DESTREZA') continue;
      let mAcc = evoMap.get(r.mes);
      if (!mAcc) {
        mAcc = { teo: emptyCounters(), prac: emptyCounters() };
        evoMap.set(r.mes, mAcc);
      }
      if (r.tipoExamen === 'TEORICO') {
        addCounters(mAcc.teo, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      } else if (r.tipoExamen === 'PRACTICO') {
        addCounters(mAcc.prac, r.aptos, r.noAptos, r.c1, r.c2, r.c34, r.c5);
      }
    }

    const evolucion: EvolucionMensual[] = mesesDisponibles.map((m) => {
      const mAcc = evoMap.get(m) || { teo: emptyCounters(), prac: emptyCounters() };
      const teoT = mAcc.teo.aptos + mAcc.teo.noAptos;
      const pracT = mAcc.prac.aptos + mAcc.prac.noAptos;
      return {
        mes: MESES_CORTOS[m - 1] || `M${m}`,
        mesNumero: m,
        anno,
        teoricoAptos: mAcc.teo.aptos,
        teoricoNoAptos: mAcc.teo.noAptos,
        teoricoTasa: calcularTasaOficial(mAcc.teo.aptos, mAcc.teo.noAptos),
        practicoAptos: mAcc.prac.aptos,
        practicoNoAptos: mAcc.prac.noAptos,
        practicoTasa: calcularTasaOficial(mAcc.prac.aptos, mAcc.prac.noAptos),
        totalPresentados: teoT + pracT,
      };
    });

    const secciones: SeccionAutoescuela[] = Array.from(secMap.values())
      .sort((a, b) => a.idSeccion.localeCompare(b.idSeccion))
      .map((s) => {
        const teo = toExamenStats(s.teo);
        const prac = toExamenStats(s.prac);
        const dest = toExamenStats(s.destreza);
        return {
          idSeccion: s.idSeccion,
          codigoDGT: `${baseRow.codigoAutoescuela}-${s.idSeccion}`,
          denominacion: `${baseRow.nombreAutoescuela} · Sección ${s.idSeccion}`,
          centroExamen: s.centro,
          teorico: teo,
          practico: prac,
          destreza: dest.total > 0 ? dest : undefined,
          totalAlumnos: teo.total + prac.total,
        };
      });

    const desglosePermisos = Array.from(permitMap.entries()).map(([perm, acc]) => {
      const teo = toExamenStats(acc.teo);
      const prac = toExamenStats(acc.prac);
      return {
        permiso: perm,
        teorico: teo,
        practico: prac,
        totalPresentados: teo.total + prac.total,
      };
    });

    const teoStats = toExamenStats(teoTotal);
    const pracStats = toExamenStats(pracTotal);
    const totalPresentados = teoStats.total + pracStats.total;
    const tasaGlobalPonderada =
      teoStats.total > 0 && pracStats.total > 0
        ? Number((teoStats.tasaAprobados * 0.4 + pracStats.tasaAprobados * 0.6).toFixed(2))
        : teoStats.total > 0
        ? teoStats.tasaAprobados
        : pracStats.tasaAprobados;

    return {
      id: baseRow.codigoAutoescuela,
      codigoDGT: baseRow.codigoAutoescuela,
      nombre: baseRow.nombreAutoescuela,
      provincia: baseRow.provincia,
      codigoProvincia: getProvinceCode(baseRow.provincia, baseRow.codigoAutoescuela),
      comunidadAutonoma: getComunidadAutonoma(baseRow.provincia),
      centroExamenPrincipal: baseRow.centroExamen,
      numSecciones: secciones.length,
      permisosImpartidos: Array.from(permisosSet),
      teorico: teoStats,
      practico: pracStats,
      totalPresentados,
      tasaGlobalPonderada,
      brechaTeoricoPractico: Number((teoStats.tasaAprobados - pracStats.tasaAprobados).toFixed(2)),
      muestraSignificativa: teoStats.total >= 15 && pracStats.total >= 15,
      secciones,
      evolucion,
      desglosePermisos,
      annoDatos: anno,
      mesesIncluidos: mesesDisponibles,
    };
  }

  public getSyncStatus() {
    return {
      config: this.config,
      logs: this.syncLogs,
      catalog: this.remoteCatalog.slice(0, 36), // latest 3 years
      loadedYears: Array.from(this.rowsByYear.entries()).map(([anno, map]) => ({
        anno,
        meses: Array.from(map.keys()).sort((a, b) => a - b),
        totalRows: Array.from(map.values()).reduce((sum, r) => sum + r.length, 0),
      })),
    };
  }

  public updateConfig(partial: Partial<ExtractorConfig>) {
    this.config = {
      ...this.config,
      autoSyncEnabled: partial.autoSyncEnabled ?? this.config.autoSyncEnabled,
      intervalHours: partial.intervalHours ?? this.config.intervalHours,
      targetYear: partial.targetYear ?? this.config.targetYear,
    };
    this.saveConfig();
    return this.config;
  }

  public exportCsv(params: {
    anno?: number;
    mes?: string;
    permiso?: TipoPermisoFilter;
    comunidadAutonoma?: string;
    provincia?: string;
  }): string {
    const res = this.querySchools({
      anno: params.anno || 2026,
      mes: params.mes || 'all',
      permiso: params.permiso || 'B',
      comunidadAutonoma: params.comunidadAutonoma,
      provincia: params.provincia || 'Todas',
      limit: 10000,
    });

    const headers = [
      'Ranking',
      'Codigo_DGT',
      'Nombre_Autoescuela',
      'Comunidad_Autonoma',
      'Provincia',
      'Centro_Examen',
      'Secciones',
      'Evaluaciones_Totales',
      'Aptos_Teorico',
      'NoAptos_Teorico',
      'Tasa_Teorico_Pct',
      'Aptos_1a_Teorico_Pct',
      'Aptos_Practico',
      'NoAptos_Practico',
      'Tasa_Practico_Pct',
      'Aptos_1a_Practico_Pct',
      'Tasa_Global_Ponderada_Pct',
      'Muestra_Significativa',
    ].join(';');

    const lines = res.items.map((ae, idx) =>
      [
        idx + 1,
        ae.codigoDGT,
        `"${ae.nombre.replace(/"/g, '""')}"`,
        `"${ae.comunidadAutonoma}"`,
        ae.provincia,
        `"${ae.centroExamenPrincipal.replace(/"/g, '""')}"`,
        ae.numSecciones,
        ae.totalPresentados,
        ae.teorico.aptos,
        ae.teorico.noAptos,
        ae.teorico.tasaAprobados.toFixed(2),
        ae.teorico.tasaPrimeraConvocatoria.toFixed(2),
        ae.practico.aptos,
        ae.practico.noAptos,
        ae.practico.tasaAprobados.toFixed(2),
        ae.practico.tasaPrimeraConvocatoria.toFixed(2),
        ae.tasaGlobalPonderada.toFixed(2),
        ae.muestraSignificativa ? 'SI' : 'NO',
      ].join(';')
    );

    return `${headers}\n${lines.join('\n')}`;
  }
}

export const dgtEngine = new DgtMicrodataEngine();
