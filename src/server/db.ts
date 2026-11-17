import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

let isDbInitialized = false;

export async function isDbConnected(): Promise<boolean> {
  if (!pool) return false;
  try {
    const res = await pool.query('SELECT 1');
    return res.rowCount === 1;
  } catch (err) {
    console.error('Error al verificar conexión con PostgreSQL:', err);
    return false;
  }
}

export async function initDb(): Promise<void> {
  if (!pool) {
    console.log('[DB] No se ha configurado DATABASE_URL. Operando en modo archivo / caché local.');
    return;
  }

  if (isDbInitialized) return;

  try {
    console.log('[DB] Conectando y aplicando migraciones en PostgreSQL...');

    await pool.query(`
      -- 1. Tabla de usuarios para el SaaS
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user', -- 'admin', 'pro', 'user'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 2. Tabla persistente de microdatos y agregaciones DGT
      CREATE TABLE IF NOT EXISTS dgt_records (
        id BIGSERIAL PRIMARY KEY,
        anyo INT NOT NULL,
        mes INT NOT NULL,
        provincia VARCHAR(100) NOT NULL,
        centro_examen VARCHAR(100) NOT NULL,
        codigo_autoescuela VARCHAR(50) NOT NULL,
        nombre_autoescuela VARCHAR(255) NOT NULL,
        codigo_seccion VARCHAR(50) NOT NULL,
        tipo_examen VARCHAR(50) NOT NULL,
        permiso_raw VARCHAR(50),
        permiso_grupo VARCHAR(50) NOT NULL,
        aptos INT DEFAULT 0,
        c1 INT DEFAULT 0,
        c2 INT DEFAULT 0,
        c34 INT DEFAULT 0,
        c5 INT DEFAULT 0,
        no_aptos INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dgt_periodo ON dgt_records(anyo, mes, permiso_grupo);
      CREATE INDEX IF NOT EXISTS idx_dgt_school ON dgt_records(codigo_autoescuela);
      CREATE INDEX IF NOT EXISTS idx_dgt_prov ON dgt_records(provincia);

      -- 3. Tabla de logs de sincronizaciones
      CREATE TABLE IF NOT EXISTS sync_logs (
        id VARCHAR(100) PRIMARY KEY,
        fecha VARCHAR(100) NOT NULL,
        fichero_nombre VARCHAR(255) NOT NULL,
        origen_url TEXT,
        fichero_tamanno VARCHAR(100),
        total_registros INT DEFAULT 0,
        registros_validos INT DEFAULT 0,
        registros_descartados INT DEFAULT 0,
        estado VARCHAR(50) NOT NULL,
        hash_integridad VARCHAR(100),
        periodo VARCHAR(100),
        automatico BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 4. Tabla de configuración del extractor
      CREATE TABLE IF NOT EXISTS extractor_config (
        id INT PRIMARY KEY DEFAULT 1,
        auto_sync_enabled BOOLEAN DEFAULT true,
        interval_hours INT DEFAULT 24,
        target_year INT DEFAULT 2026,
        last_check_at VARCHAR(100),
        next_check_at VARCHAR(100),
        last_published_period VARCHAR(100),
        source_portal_url TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    isDbInitialized = true;
    console.log('[DB] PostgreSQL listo y tablas sincronizadas.');
  } catch (err) {
    console.error('[DB] Error inicializando tablas en PostgreSQL:', err);
  }
}
