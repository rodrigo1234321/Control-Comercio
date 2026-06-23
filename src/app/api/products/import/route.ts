import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';

const importItemSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'El precio de compra debe ser mayor o igual a 0'),
  salePrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  stock: z.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
  minStock: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
});

const importSchema = z.array(importItemSchema);

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol Administrador.' }, { status: 403 });
    }
    const { tenantId, userId } = authUser;

    const body = await request.json();
    const result = importSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => `Fila ${err.path[0]}: ${err.message}`).join(' | ');
      return NextResponse.json({ error: `Estructura inválida: ${errors.substring(0, 200)}...` }, { status: 400 });
    }

    const items = result.data;

    let createdCount = 0;
    let updatedCount = 0;

    await db.$transaction(async (tx) => {
      // 1. Obtener todas las categorías existentes del tenant
      const existingCategories = await tx.category.findMany({
        where: { tenantId }
      });
      const categoriesMap: Record<string, string> = {}; // nombre en minúsculas -> id
      existingCategories.forEach(c => {
        categoriesMap[c.name.toLowerCase().trim()] = c.id;
      });

      // 2. Procesar cada producto secuencialmente
      for (const item of items) {
        let categoryId: string | null = null;

        // Si se especificó categoría, buscarla o crearla dinámicamente
        if (item.categoryName && item.categoryName.trim()) {
          const normName = item.categoryName.toLowerCase().trim();
          if (categoriesMap[normName]) {
            categoryId = categoriesMap[normName];
          } else {
            // Crear nueva categoría dinámicamente
            const newCat = await tx.category.create({
              data: {
                tenantId,
                name: item.categoryName.trim(),
                description: 'Creada automáticamente por importación masiva.'
              }
            });
            categoriesMap[normName] = newCat.id;
            categoryId = newCat.id;
          }
        }

        // Buscar producto existente por código y tenant
        const existingProduct = await tx.product.findFirst({
          where: { tenantId, code: item.code }
        });

        if (existingProduct) {
          // Caso UPSERT: Actualizar datos y SUMAR stock
          const newStock = existingProduct.stock + item.stock;
          
          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              name: item.name,
              description: item.description || existingProduct.description,
              categoryId: categoryId || existingProduct.categoryId,
              purchasePrice: item.purchasePrice,
              salePrice: item.salePrice,
              stock: newStock,
              minStock: item.minStock,
            }
          });

          // Registrar movimiento de stock si vino cantidad positiva
          if (item.stock > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: existingProduct.id,
                userId,
                type: 'IN',
                quantity: item.stock,
                reason: `Importación masiva (Ajuste de stock)`,
              }
            });
          }

          updatedCount++;
        } else {
          // Caso NUEVO: Crear producto
          const newProduct = await tx.product.create({
            data: {
              tenantId,
              code: item.code,
              name: item.name,
              description: item.description,
              categoryId,
              purchasePrice: item.purchasePrice,
              salePrice: item.salePrice,
              stock: item.stock,
              minStock: item.minStock,
            }
          });

          // Registrar movimiento de stock si vino cantidad positiva
          if (item.stock > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: newProduct.id,
                userId,
                type: 'IN',
                quantity: item.stock,
                reason: `Carga inicial por importación masiva`,
              }
            });
          }

          createdCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Proceso completado. Se crearon ${createdCount} productos nuevos y se actualizaron ${updatedCount} productos existentes.`,
      createdCount,
      updatedCount
    });
  } catch (error: any) {
    console.error('Error POST /api/products/import:', error);
    return NextResponse.json({ error: error.message || 'Ocurrió un error al importar los productos.' }, { status: 500 });
  }
}
