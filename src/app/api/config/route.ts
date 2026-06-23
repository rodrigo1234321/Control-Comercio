import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const updateConfigSchema = z.object({
  name: z.string().min(2, 'El nombre del negocio debe tener al menos 2 caracteres'),
  currency: z.string().length(3, 'El código de moneda debe tener 3 letras (ej. ARS)'),
  taxPercentage: z.number().min(0, 'El porcentaje de impuesto no puede ser negativo'),
  cuit: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  allowNegativeStock: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Error GET /api/config:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Administrador' }, { status: 403 });
    }

    const { tenantId } = authUser;

    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = result.data;

    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        currency: data.currency,
        taxPercentage: data.taxPercentage,
        cuit: data.cuit || null,
        logoUrl: data.logoUrl || null,
        allowNegativeStock: data.allowNegativeStock ?? false,
      },
    });

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error) {
    console.error('Error PUT /api/config:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
