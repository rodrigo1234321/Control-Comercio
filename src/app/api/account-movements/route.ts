import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const createMovementSchema = z.object({
  clientId: z.string().min(1, 'El ID de cliente es requerido'),
  type: z.enum(['DEBT', 'PAYMENT']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  note: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Obtener movimientos de un cliente específico
      const movements = await db.accountMovement.findMany({
        where: { tenantId, clientId },
        include: {
          sale: {
            select: { id: true, totalAmount: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'asc' },
      });

      // Calcular saldo neto del cliente
      const balance = movements.reduce((acc, m) => {
        if (m.type === 'DEBT') return acc + m.amount;
        if (m.type === 'PAYMENT') return acc - m.amount;
        return acc;
      }, 0);

      return NextResponse.json({ movements, balance });
    } else {
      // Obtener balances consolidados para todos los clientes
      const movements = await db.accountMovement.findMany({
        where: { tenantId },
        select: { clientId: true, type: true, amount: true }
      });

      const balances: Record<string, number> = {};
      movements.forEach((m) => {
        if (!balances[m.clientId]) {
          balances[m.clientId] = 0;
        }
        if (m.type === 'DEBT') {
          balances[m.clientId] += m.amount;
        } else if (m.type === 'PAYMENT') {
          balances[m.clientId] -= m.amount;
        }
      });

      return NextResponse.json({ balances });
    }
  } catch (error) {
    console.error('Error GET /api/account-movements:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos de cuenta' }, { status: 500 });
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
    const result = createMovementSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { clientId, type, amount, note } = result.data;

    // Verificar si el cliente pertenece al tenant
    const client = await db.client.findFirst({
      where: { id: clientId, tenantId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const movement = await db.accountMovement.create({
      data: {
        tenantId,
        clientId,
        type,
        amount,
        note: note || (type === 'PAYMENT' ? 'Pago recibido' : 'Ajuste de saldo'),
      }
    });

    return NextResponse.json({ success: true, movement }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/account-movements:', error);
    return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 });
  }
}
