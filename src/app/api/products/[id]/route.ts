import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const updateProductSchema = z.object({
  code: z.string().min(1, 'El código del producto es requerido'),
  name: z.string().min(2, 'El nombre del producto debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  categoryId: z.string().nullable().optional(),
  purchasePrice: z.number().min(0, 'El precio de compra debe ser mayor o igual a 0'),
  salePrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  stock: z.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
  minStock: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
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

    const { tenantId, userId } = authUser;

    const body = await request.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = result.data;

    // Verificar existencia del producto y pertenencia al tenant
    const currentProduct = await db.product.findFirst({
      where: { id, tenantId },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar si el nuevo código colisiona con otro producto del mismo tenant
    if (data.code !== currentProduct.code) {
      const codeCollision = await db.product.findFirst({
        where: {
          tenantId,
          code: data.code,
          id: { not: id },
        },
      });
      if (codeCollision) {
        return NextResponse.json({ error: 'El código de barras ya pertenece a otro de tus productos' }, { status: 400 });
      }
    }

    // Calcular si hubo cambio de stock manual
    const stockDiff = data.stock - currentProduct.stock;

    const updatedProduct = await db.$transaction(async (tx) => {
      // 1. Modificar el producto
      const prod = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          purchasePrice: data.purchasePrice,
          salePrice: data.salePrice,
          stock: data.stock,
          minStock: data.minStock,
        },
      });

      // 2. Si hubo cambio de stock, registrar la entrada/salida como un ajuste
      if (stockDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: id,
            userId,
            type: stockDiff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(stockDiff),
            reason: `Ajuste manual de inventario (anterior: ${currentProduct.stock}, nuevo: ${data.stock})`,
          },
        });
      }

      return prod;
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error PUT /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
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

    // Verificar existencia del producto en el tenant
    const product = await db.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Borrar producto (Prisma borrará en cascada los movimientos y relaciones según el schema)
    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Producto eliminado con éxito' });
  } catch (error) {
    console.error('Error DELETE /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar producto. Puede tener ventas asociadas.' }, { status: 500 });
  }
}
