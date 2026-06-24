import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateTenantSchema = z.object({
  id: z.string().min(1, 'El ID del comercio es requerido'),
  status: z.enum(['active', 'suspended'], {
    errorMap: () => ({ message: 'El estado debe ser active o suspended' }),
  }),
});

// GET /api/super-admin/tenants — Listar todos los comercios registrados
export async function GET() {
  try {
    const authUser = getAuthUser();
    if (!authUser || !isSuperAdmin(authUser)) {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Super Administrador' }, { status: 403 });
    }

    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Formatear la respuesta para el frontend
    const formattedTenants = tenants.map((tenant) => {
      const owner = tenant.users[0] || null;
      return {
        id: tenant.id,
        name: tenant.name,
        subscriptionStatus: tenant.subscriptionStatus,
        createdAt: tenant.createdAt,
        ownerName: owner ? owner.name : 'Sin Administrador',
        ownerEmail: owner ? owner.email : '—',
      };
    });

    return NextResponse.json({ tenants: formattedTenants });
  } catch (error) {
    console.error('Error GET /api/super-admin/tenants:', error);
    return NextResponse.json({ error: 'Error al obtener los comercios' }, { status: 500 });
  }
}

// PUT /api/super-admin/tenants — Activar o suspender un comercio
export async function PUT(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser || !isSuperAdmin(authUser)) {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Super Administrador' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateTenantSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, status } = result.data;

    // No permitir que el super admin suspenda su propio tenant actual (por seguridad)
    if (id === authUser.tenantId && status === 'suspended') {
      return NextResponse.json({ error: 'No puedes suspender tu propio comercio' }, { status: 400 });
    }

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: { subscriptionStatus: status },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        subscriptionStatus: updatedTenant.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error('Error PUT /api/super-admin/tenants:', error);
    return NextResponse.json({ error: 'Error al actualizar el estado del comercio' }, { status: 500 });
  }
}
