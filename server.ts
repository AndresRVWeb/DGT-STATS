import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import { dgtEngine } from './src/server/dgtExtractor.ts';
import type { TipoPermisoFilter } from './src/types/dgt.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ limit: '15mb', type: 'text/*' }));

  // Start background initialization of real 2026 DGT microdata
  const initPromise = dgtEngine.initialize().catch((err) => {
    console.error('Error en inicialización inicial DGT:', err);
  });

  // Middleware to ensure engine is initialized before data routes
  app.use('/api/dgt', async (req, res, next) => {
    if (req.path === '/sync/status' || req.path === '/sync') {
      return next();
    }
    await initPromise;
    next();
  });

  // 1. National & Provincial Overview (Year 2026 / 2025, Month, Permit)
  app.get('/api/dgt/overview', (req, res) => {
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
    const data = dgtEngine.getOverview(anno, mes, permiso);
    res.json(data);
  });

  // 2. Paginated, Filtered, Sorted Driving Schools across all 52 Spanish Provinces
  app.get('/api/dgt/schools', (req, res) => {
    const anno = parseInt(String(req.query.anno || '2026'), 10) || 2026;
    const mes = String(req.query.mes || 'all');
    const permiso = (String(req.query.permiso || 'B') as TipoPermisoFilter) || 'B';
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
    const provincia = req.query.provincia ? String(req.query.provincia) : 'Todas';
    const csv = dgtEngine.exportCsv({ anno, mes, permiso, provincia });
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

  // 7. Trigger Live Extraction from DGT Portal (www.dgt.es)
  app.post('/api/dgt/sync', async (req, res) => {
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

  // 8. Update Monthly Extractor Scheduler Config
  app.post('/api/dgt/sync/config', (req, res) => {
    const updated = dgtEngine.updateConfig(req.body || {});
    res.json(updated);
  });

  // 9. Manual DGT File Upload & Parsing
  app.post('/api/dgt/upload', (req, res) => {
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
    console.log(`AutoMetrics DGT Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
