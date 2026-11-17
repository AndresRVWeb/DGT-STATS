import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'dgt-stats-super-secret-production-key-2026';
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN || 'dgt-cron-secret-token-change-in-env';

export interface UserPayload {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'pro' | 'user';
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// En memoria como fallback si PostgreSQL no está conectado
const inMemoryUsers: Map<string, { id: string; email: string; password_hash: string; name?: string; role: 'admin' | 'pro' | 'user' }> = new Map();

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export async function registerUser(email: string, passwordPlain: string, name?: string): Promise<{ user: UserPayload; token: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !passwordPlain || passwordPlain.length < 6) {
    throw new Error('El correo y la contraseña (mínimo 6 caracteres) son obligatorios.');
  }

  const hash = await hashPassword(passwordPlain);
  const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`;

  if (pool) {
    // Si es el primer usuario, se le asigna rol admin automáticamente
    const countRes = await pool.query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = parseInt(countRes.rows[0].count, 10) === 0;
    const role: 'admin' | 'pro' | 'user' = isFirstUser ? 'admin' : 'user';

    const insertRes = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role`,
      [id, normalizedEmail, hash, name || '', role]
    );

    const row = insertRes.rows[0];
    const user: UserPayload = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: (row.role as 'admin' | 'pro' | 'user') || 'user',
    };
    const token = generateToken(user);
    return { user, token };
  } else {
    // Modo local / archivo sin BD externa
    if (inMemoryUsers.has(normalizedEmail)) {
      throw new Error('El correo ya está registrado.');
    }
    const isFirst = inMemoryUsers.size === 0;
    const role: 'admin' | 'pro' | 'user' = isFirst ? 'admin' : 'user';
    const userRecord = { id, email: normalizedEmail, password_hash: hash, name: name || '', role };
    inMemoryUsers.set(normalizedEmail, userRecord);

    const user: UserPayload = { id, email: normalizedEmail, name: name || '', role };
    const token = generateToken(user);
    return { user, token };
  }
}

export async function loginUser(email: string, passwordPlain: string): Promise<{ user: UserPayload; token: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  let userRecord: { id: string; email: string; password_hash: string; name?: string; role: 'admin' | 'pro' | 'user' } | null = null;

  if (pool) {
    const res = await pool.query('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [normalizedEmail]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      userRecord = {
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        name: row.name,
        role: (row.role as 'admin' | 'pro' | 'user') || 'user',
      };
    }
  } else {
    userRecord = inMemoryUsers.get(normalizedEmail) || null;
  }

  if (!userRecord) {
    throw new Error('Credenciales incorrectas.');
  }

  const isValid = await verifyPassword(passwordPlain, userRecord.password_hash);
  if (!isValid) {
    throw new Error('Credenciales incorrectas.');
  }

  const user: UserPayload = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    role: userRecord.role,
  };

  const token = generateToken(user);
  return { user, token };
}

// Middleware para verificar JWT
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }

  req.user = payload;
  next();
}

// Middleware opcional (si hay token lo adjunta, pero no bloquea si es anónimo)
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

// Middleware para administradores
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
  });
}

// Middleware para el Cron (Token secreto) O Administrador
export function requireCronOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-cron-token'];
  if (apiKey && typeof apiKey === 'string' && apiKey.trim() === API_SECRET_TOKEN) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === API_SECRET_TOKEN) {
      return next();
    }
    const payload = verifyToken(token);
    if (payload && payload.role === 'admin') {
      req.user = payload;
      return next();
    }
  }

  return res.status(401).json({
    error: 'Acceso no autorizado. Se requiere token secreto de automatización o rol de administrador.',
  });
}
