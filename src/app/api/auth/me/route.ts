import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser, isSuperAdmin, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId, tenantId, role, email, name } = authUser;

    // Buscar información del negocio para mostrar en el frontend
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, subscriptionStatus: true },
    });

    // Validar si el comercio está suspendido
    if (tenant && tenant.subscriptionStatus !== 'active' && tenant.subscriptionStatus !== 'trialing') {
      const response = NextResponse.json({ error: 'suspended' }, { status: 403 });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      id: userId,
      tenantId,
      name,
      email,
      role,
      tenantName: tenant?.name || 'Mi Comercio',
      isSuperAdmin: isSuperAdmin(authUser),
    });
  } catch (error) {
    console.error('Error in auth/me:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

