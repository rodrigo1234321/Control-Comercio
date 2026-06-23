import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Correo o contraseña no válidos' }, { status: 400 });
    }

    const { email, password } = result.data;

    // Buscar al usuario
    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Credenciales inválidas o cuenta inactiva' }, { status: 401 });
    }

    // Comparar contraseñas
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Verificar estado de suscripción del negocio
    if (user.tenant.subscriptionStatus !== 'active' && user.tenant.subscriptionStatus !== 'trialing') {
      return NextResponse.json({ error: 'La cuenta del negocio está suspendida por falta de pago' }, { status: 403 });
    }

    // Firmar token JWT
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      }
    });

    // Colocar cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor' }, { status: 500 });
  }
}
