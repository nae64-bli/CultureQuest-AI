import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { claimStoredAdminHash, getStoredAdminHash } from './db.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

interface SessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function verifyEnvPasscode(candidate: string, envSecret: string): boolean {
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(envSecret).digest();
  return crypto.timingSafeEqual(a, b);
}

export function signAdminToken(): { token: string; expiresAt: string } {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const payload: SessionPayload = { role: 'admin', iat: now, exp };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url'
  );
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as Partial<SessionPayload>;
    if (payload.role !== 'admin' || typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function getAdminMode(): Promise<
  'env' | 'claimed' | 'claim_required'
> {
  if (process.env.ADMIN_PASSCODE?.trim()) {
    return 'env';
  }
  const stored = await getStoredAdminHash();
  return stored ? 'claimed' : 'claim_required';
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    return verifyEnvPasscode(passcode, envPasscode);
  }
  const stored = await getStoredAdminHash();
  if (!stored) return false;
  return verifyScryptHash(passcode, stored);
}

export async function claimInitialAdminPasscode(
  passcode: string
): Promise<boolean> {
  if (process.env.ADMIN_PASSCODE?.trim()) {
    return false;
  }
  const hash = hashPasscode(passcode);
  return claimStoredAdminHash(hash);
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({
      error: 'Se requiere sesión de administrador válida para modificar el catálogo.',
    });
    return;
  }
  next();
}
