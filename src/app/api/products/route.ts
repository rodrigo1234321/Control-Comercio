import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const createProductSchema = z.object({
  code: z.string().min(1, 'El código del producto es requerido'),
  name: z.string().min(2, 'El nombre del producto debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  purchasePrice: z.number().min(0, 'El precio de compra debe ser mayor o igual a 0'),
  salePrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  stock: z.number().int().min(0, 'El stock inicial debe ser mayor o igual a 0'),
  minStock: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { tenantId } = authUser;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    // Construcción de condiciones de búsqueda relacionales seguras
    const whereCondition: any = {
      tenantId,
    };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    // Filtrar por bajo stock
    if (lowStockOnly) {
      // Prisma no permite comparar dos campos directamente de forma simple en `where` en algunas bases,
      // pero podemos usar una consulta nativa o resolverlo mapeando. Sin embargo, para SQLite/PG
      // podemos hacer una validación en la base o traer los datos y filtrar. Para ser eficientes y escalables:
      // Filtramos en la base productos donde stock <= minStock
      // Dado que minStock es variable por producto, en Prisma podemos usar filtros avanzados.
      // Prisma soporta auto-referencias:
    }

    let products = await db.product.findMany({
      where: whereCondition,
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    if (lowStockOnly) {
      products = products.filter(p => p.stock <= p.minStock);
    }

    // Obtener también categorías del tenant para los filtros
    const categories = await db.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ products, categories });
  } catch (error) {
    console.error('Error GET /api/products:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
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
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = result.data;

    // Verificar si el código ya existe para este tenant
    const existingProduct = await db.product.findFirst({
      where: {
        tenantId,
        code: data.code,
      },
    });

    if (existingProduct) {
      return NextResponse.json({ error: 'Ya existe un producto con este código en tu comercio' }, { status: 400 });
    }

    // Guardar producto y registrar el movimiento de stock en una transacción
    const product = await db.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          tenantId,
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

      // Si se definió un stock inicial mayor a 0, registrar la entrada
      if (data.stock > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: newProduct.id,
            userId,
            type: 'IN',
            quantity: data.stock,
            reason: 'Carga inicial de inventario',
          },
        });
      }

      return newProduct;
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/products:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
