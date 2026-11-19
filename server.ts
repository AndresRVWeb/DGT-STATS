import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { dgtEngine } from './src/server/dgtExtractor.ts';
import { initDb, isDbConnected } from './src/server/db.ts';
import {
  registerUser,
  loginUser,
  authenticateToken,
  requireAdmin,
  requireCronOrAdmin,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import type { TipoPermisoFilter } from './src/types/dgt.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // 1. Hardening & Seguridad Express
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permitir Vite SPA y assets
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ limit: '15mb', type: 'text/*' }));

  // Rate Limiting para proteger contra abusos y DDoS
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 180, // 180 peticiones por minuto por IP
    message: { error: 'Demasiadas solicitudes desde esta IP, por favor inténtalo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // 20 intentos de login por 15 min
    message: { error: 'Demasiados intentos de autenticación. Por favor espera unos minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);

  // Inicializar Base de datos PostgreSQL si está disponible
  await initDb();

  // Background initialization of DGT microdata
  const initPromise = dgtEngine.initialize().catch((err) => {
    console.error('Error en inicialización inicial DGT:', err);
  });

  // Healthcheck endpoint para producción (Cloud Run, Docker, VPS, Dokploy)
  app.get('/api/health', async (_req, res) => {
    const dbOk = await isDbConnected();
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'ARV AutoMetrics',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbOk ? 'PostgreSQL (Conectado)' : 'Caché en memoria/disco',
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    });
  });

  // ---------------- AUTH ROUTES ----------------
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { email, password, name } = req.body || {};
      const result = await registerUser(email, password, name);
      res.status(201).json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      res.status(401).json({ error: msg });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ---------------- DGT DATA ROUTES ----------------

  // Middleware to ensure engine is initialized before data routes
  app.use('/api/dgt', async (req, res, next) => {
    if (req.path === '/sync/status' || req.path === '/sync') {
      return next();
    }
    await initPromise;
    next();
  });

  // 1. National & Provincial Overview (Year 2026 / 2025, Month, Permit, CCAA)
  app.get('/api/dgt/overview', (req, res) => {
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const comunidad = req.query.comunidad ? String(req.query.comunidad) : undefined;
    const data = dgtEngine.getOverview(anno, mes, permiso, comunidad);
    res.json(data);
  });

  // 2. Paginated, Filtered, Sorted Driving Schools across all 52 Spanish Provinces & 17 CCAA
  app.get('/api/dgt/schools', (req, res) => {
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const comunidadAutonoma = req.query.comunidad ? String(req.query.comunidad) : 'Todas';
    const provincia = req.query.provincia ? String(req.query.provincia) : 'Todas';
    const centroExamen = req.query.centroExamen ? String(req.query.centroExamen) : 'Todos';
    const q = req.query.q ? String(req.query.q) : '';
    const soloMuestraSignificativa = req.query.soloMuestra === 'true';
    const sortBy = (String(req.query.sortBy || 'tasaGlobal') as 'tasaGlobal' | 'tasaTeorico' | 'tasaPractico' | 'totalAlumnos');
    const order = (String(req.query.order || 'desc') as 'asc' | 'desc');
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '50'), 10) || 50;

    const result = dgtEngine.querySchools({
      anno,
      mes,
      permiso,
      comunidadAutonoma,
      provincia,
      centroExamen,
      q,
      soloMuestraSignificativa,
      sortBy,
      order,
      page,
      limit,
    });
    res.json(result);
  });

  // 3. Detailed Dossier for any Driving School in Spain (e.g. CA0528 EL PASEO)
  app.get('/api/dgt/schools/:codigo', (req, res) => {
    const codigo = req.params.codigo;
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const detail = dgtEngine.getSchoolDetail(codigo, anno, mes, permiso);
    if (!detail) {
      return res.status(404).json({ error: `Centro ${codigo} no encontrado en el periodo seleccionado.` });
    }
    res.json(detail);
  });

  // 4. Compare 2 Driving Schools side-by-side
  app.get('/api/dgt/compare', (req, res) => {
    const codesParam = String(req.query.codes || 'CA0528,M0240');
    const [c1, c2] = codesParam.split(',').map((s) => s.trim());
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const schoolA = c1 ? dgtEngine.getSchoolDetail(c1, anno, 'all', permiso) : null;
    const schoolB = c2 ? dgtEngine.getSchoolDetail(c2, anno, 'all', permiso) : null;
    res.json({ schoolA, schoolB });
  });

  // 5. CSV Export
  app.get('/api/dgt/export', (req, res) => {
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const comunidad = req.query.comunidad ? String(req.query.comunidad) : 'Todas';
    const provincia = req.query.provincia ? String(req.query.provincia) : 'Todas';
    const csv = dgtEngine.exportCsv({ anno, mes, permiso, provincia, comunidadAutonoma: comunidad });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="DGT_Microdatos_${anno}_${provincia}.csv"`);
    res.send('\uFEFF' + csv);
  });

  // 6. Sync Status, Remote Catalog & Logs
  app.get('/api/dgt/sync/status', async (req, res) => {
    if (req.query.refreshCatalog === 'true') {
      try {
        await dgtEngine.discoverRemoteCatalog();
      } catch {
        // ignore network hiccup on catalog refresh
      }
    }
    res.json(dgtEngine.getSyncStatus());
  });

  // 7. Trigger Live Extraction from DGT Portal (PROTEGIDO: Cron o Admin)
  app.post('/api/dgt/sync', requireCronOrAdmin, async (req, res) => {
    const scope = req.body?.scope || 'missing_2026';
    const anno = req.body?.anno ? Number(req.body.anno) : undefined;
    const mes = req.body?.mes ? Number(req.body.mes) : undefined;

    const result = await dgtEngine.syncFromDgt({
      scope,
      anno,
      mes,
      automatic: false,
    });
    res.json({ ...result, status: dgtEngine.getSyncStatus() });
  });

  // 8. Update Monthly Extractor Scheduler Config (PROTEGIDO: Solo Admin)
  app.post('/api/dgt/sync/config', requireAdmin, (req, res) => {
    const updated = dgtEngine.updateConfig(req.body || {});
    res.json(updated);
  });

  // 9. Manual DGT File Upload & Parsing (PROTEGIDO: Solo Admin)
  app.post('/api/dgt/upload', requireAdmin, (req, res) => {
    const { content, fileName } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Contenido CSV/TXT inválido' });
    }
    const result = dgtEngine.ingestUploadedContent(content, fileName || 'DGT_UPLOAD.txt');
    if (result.count === 0) {
      return res.status(400).json({ error: 'El fichero no coincide con el diseño de registro oficial DGT.' });
    }
    res.json({
      success: true,
      ...result,
      status: dgtEngine.getSyncStatus(),
    });
  });

  // Mount Vite middleware in dev or serve dist in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARV AutoMetrics Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
