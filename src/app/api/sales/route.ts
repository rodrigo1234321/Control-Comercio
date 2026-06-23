import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const saleItemSchema = z.object({
  productId: z.string().min(1, 'El ID de producto es requerido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
});

const createSaleSchema = z.object({
  clientId: z.string().nullable().optional(),
  paymentMethod: z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'DEBT']),
  items: z.array(saleItemSchema).min(1, 'La venta debe contener al menos un producto'),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    const { searchParams } = new URL(request.url);
    const exportAll = searchParams.get('all') === 'true';

    const sales = await db.sale.findMany({
      where: { tenantId },
      include: {
        client: { select: { name: true, cuitCuil: true } },
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      ...(exportAll ? {} : { take: 100 }),
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error GET /api/sales:', error);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
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
    const result = createSaleSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { clientId, paymentMethod, items } = result.data;

    if (paymentMethod === 'DEBT' && !clientId) {
      return NextResponse.json({ error: 'Para vender al fiado (cuenta corriente) se debe seleccionar un cliente' }, { status: 400 });
    }

    // Obtener detalles del negocio para impuestos y venta con stock negativo
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { taxPercentage: true, allowNegativeStock: true },
    });
    const taxRate = (tenant?.taxPercentage !== undefined ? tenant.taxPercentage : 21.0) / 100;

    // Ejecutar registro completo de venta en una transacción relacional
    const saleResult = await db.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsToCreate = [];
      const stockUpdates = [];
      const movementsToCreate = [];

      // Validar cada producto, stock e importes
      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado en tu inventario`);
        }

        if (!tenant?.allowNegativeStock && product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
        }

        const subtotal = product.salePrice * item.quantity;
        totalAmount += subtotal;

        // Estructura del ítem de venta
        saleItemsToCreate.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal,
        });

        // Preparar actualización de stock
        stockUpdates.push({
          productId: product.id,
          newStock: product.stock - item.quantity,
        });

        // Preparar registro de movimiento de stock tipo OUT
        movementsToCreate.push({
          tenantId,
          productId: product.id,
          userId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Venta registrada (POS)`,
        });
      }

      // Calcular impuesto incluido en el total (como en facturas tipo B/C en Argentina)
      // O calculado sobre el subtotal. Hagamos cálculo típico: Total = Neto + Impuesto
      // Si el precio de venta ya incluye el IVA (muy habitual en comercios minoristas):
      // Neto = Total / (1 + taxRate)
      // Impuesto = Total - Neto
      const taxAmount = totalAmount - (totalAmount / (1 + taxRate));

      // 1. Crear el registro de la venta principal
      const sale = await tx.sale.create({
        data: {
          tenantId,
          clientId: clientId || null,
          userId,
          totalAmount,
          taxAmount,
          paymentMethod,
        },
      });

      // Registrar deuda en cuenta corriente si el pago es al fiado
      if (paymentMethod === 'DEBT' && clientId) {
        await tx.accountMovement.create({
          data: {
            tenantId,
            clientId,
            type: 'DEBT',
            amount: totalAmount,
            saleId: sale.id,
            note: `Venta POS #${sale.id.substring(0, 8).toUpperCase()}`,
          },
        });
      }

      // 2. Crear todos los ítems de venta vinculados a la venta creada
      for (const saleItem of saleItemsToCreate) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: saleItem.productId,
            quantity: saleItem.quantity,
            unitPrice: saleItem.unitPrice,
            subtotal: saleItem.subtotal,
          },
        });
      }

      // 3. Actualizar los stocks de los productos vendidos
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.newStock },
        });
      }

      // 4. Crear los movimientos de stock
      for (const movement of movementsToCreate) {
        // Enlazar la venta en el motivo
        await tx.stockMovement.create({
          data: {
            ...movement,
            reason: `Venta POS #${sale.id.substring(0, 8)}`,
          },
        });
      }

      return sale;
    });

    return NextResponse.json({ success: true, sale: saleResult }, { status: 201 });
  } catch (error: any) {
    console.error('Error POST /api/sales:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar la venta' }, { status: 500 });
  }
}
