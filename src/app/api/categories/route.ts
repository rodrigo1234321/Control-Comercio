import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
});

// GET /api/categories — Listar categorías del tenant
export async function GET() {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const categories = await db.category.findMany({
      where: { tenantId: authUser.tenantId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error GET /api/categories:', error);
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

// POST /api/categories — Crear categoría (solo ADMIN)
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Administrador' }, { status: 403 });
    }

    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { name, description } = result.data;

    // Verificar que no exista una categoría con el mismo nombre en el tenant
    const existing = await db.category.findFirst({
      where: { tenantId: authUser.tenantId, name },
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        tenantId: authUser.tenantId,
        name,
        description: description || null,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/categories:', error);
    return NextResponse.json({ error: 'Error interno al crear categoría' }, { status: 500 });
  }
}

// DELETE /api/categories?id=xxx — Eliminar categoría (solo ADMIN)
export async function DELETE(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
    }

    // Verificar que la categoría pertenece al tenant
    const category = await db.category.findFirst({
      where: { id, tenantId: authUser.tenantId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }

    await db.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /api/categories:', error);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
