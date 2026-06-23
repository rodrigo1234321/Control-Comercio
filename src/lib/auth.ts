import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'control-comercio-super-secret-key-12345678';
export const AUTH_COOKIE_NAME = 'auth_token';

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

// Genera un token JWT para la sesión
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verifica un token JWT y devuelve el payload descifrado
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    return null;
  }
}

// Obtiene el usuario autenticado directamente desde la cookie
export function getAuthUser(): AuthPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

// Encripta una contraseña
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compara una contraseña en texto plano con el hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

