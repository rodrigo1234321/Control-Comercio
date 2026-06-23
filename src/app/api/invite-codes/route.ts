import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

// Genera un código legible tipo "KIOSCO-A3F8-2024"
function generateCode(): string {
  const prefix = ['COMERCIO', 'PYME', 'NEGOCIO', 'TIENDA'][Math.floor(Math.random() * 4)];
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${random}-${year}`;
}

// GET: Listar todos los códigos (solo ADMIN)
export async function GET() {
  try {
    const user = getAuthUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const codes = await db.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error listando códigos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Crear un nuevo código de invitación (solo ADMIN)
export async function POST(request: Request) {
  try {
    const user = getAuthUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const note = body.note || null;
    const planType = body.planType || 'pro';

    const code = generateCode();

    const inviteCode = await db.inviteCode.create({
      data: {
        code,
        planType,
        note,
      },
    });

    return NextResponse.json({ inviteCode });
  } catch (error) {
    console.error('Error creando código:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar un código no usado (solo ADMIN)
export async function DELETE(request: Request) {
  try {
    const user = getAuthUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID del código requerido' }, { status: 400 });
    }

    // Solo permitir borrar códigos no usados
    const existing = await db.inviteCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
    }
    if (existing.isUsed) {
      return NextResponse.json({ error: 'No se puede eliminar un código ya utilizado' }, { status: 400 });
    }

    await db.inviteCode.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando código:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
