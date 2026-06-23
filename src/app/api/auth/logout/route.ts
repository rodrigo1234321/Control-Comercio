import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada con éxito' });
  
  // Expirar la cookie inmediatamente
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expira ya mismo
    path: '/',
  });

  return response;
}
