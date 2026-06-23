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

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    // Obtener clientes con recuento de compras
    const clients = await db.client.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { sales: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error GET /api/clients:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();
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

    const client = await db.client.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        cuitCuil: data.cuitCuil || null,
      },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/clients:', error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
