import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const clientSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El correo electrónico no es válido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  cuitCuil: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser();
    const { id } = params;

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId } = authUser;

    const body = await request.json();
    const result = clientSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = result.data;

    // Verificar pertenencia al tenant
    const existingClient = await db.client.findFirst({
      where: { id, tenantId },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const client = await db.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        cuitCuil: data.cuitCuil || null,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('Error PUT /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser();
    const { id } = params;

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId } = authUser;

    // Verificar pertenencia al tenant
    const existingClient = await db.client.findFirst({
      where: { id, tenantId },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    await db.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Cliente eliminado con éxito' });
  } catch (error) {
    console.error('Error DELETE /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente. Puede tener ventas asociadas.' }, { status: 500 });
  }
}
