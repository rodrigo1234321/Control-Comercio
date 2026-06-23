import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const createMovementSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  type: z.enum(['IN', 'OUT'], { errorMap: () => ({ message: 'El tipo debe ser IN o OUT' }) }),
  quantity: z.number().int().positive('La cantidad debe ser un número entero positivo'),
  reason: z.string().min(2, 'Debe especificar el motivo del movimiento (ej. Compra, Pérdida)'),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    // Obtener historial completo de movimientos de stock con datos del producto y usuario
    const movements = await db.stockMovement.findMany({
      where: { tenantId },
      include: {
        product: {
          select: {
            code: true,
            name: true,
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Limitar a los últimos 200 por rendimiento
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error('Error GET /api/stock:', error);
    return NextResponse.json({ error: 'Error al obtener historial de stock' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId, userId } = authUser;

    const body = await request.json();
    const result = createMovementSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { productId, type, quantity, reason } = result.data;

    // Verificar existencia del producto en el tenant
    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Validar si es una salida y hay stock suficiente
    if (type === 'OUT' && product.stock < quantity) {
      return NextResponse.json({
        error: `Stock insuficiente. Stock disponible: ${product.stock}, solicitado: ${quantity}`
      }, { status: 400 });
    }

    // Registrar movimiento y actualizar stock en transacción
    const movement = await db.$transaction(async (tx) => {
      // 1. Crear el movimiento
      const newMov = await tx.stockMovement.create({
        data: {
          tenantId,
          productId,
          userId,
          type,
          quantity,
          reason,
        },
      });

      // 2. Modificar el stock en el producto
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            [type === 'IN' ? 'increment' : 'decrement']: quantity,
          },
        },
      });

      return newMov;
    });

    return NextResponse.json({ success: true, movement });
  } catch (error) {
    console.error('Error POST /api/stock:', error);
    return NextResponse.json({ error: 'Error al registrar movimiento de stock' }, { status: 500 });
  }
}
