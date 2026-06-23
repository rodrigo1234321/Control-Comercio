import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol Administrador.' }, { status: 403 });
    }
    const { tenantId } = authUser;

    // Obtener todos los datos vinculados al tenant
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const users = await db.user.findMany({ where: { tenantId } });
    const categories = await db.category.findMany({ where: { tenantId } });
    const products = await db.product.findMany({ where: { tenantId } });
    const stockMovements = await db.stockMovement.findMany({ where: { tenantId } });
    const clients = await db.client.findMany({ where: { tenantId } });
    const sales = await db.sale.findMany({
      where: { tenantId },
      include: { items: true }
    });
    const accountMovements = await db.accountMovement.findMany({ where: { tenantId } });

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenantId,
      tenant,
      users,
      categories,
      products,
      stockMovements,
      clients,
      sales,
      accountMovements
    };

    const fileName = `backup-${tenant?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error GET /api/backup:', error);
    return NextResponse.json({ error: 'Error al generar copia de seguridad' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol Administrador.' }, { status: 403 });
    }
    const { tenantId, userId } = authUser;

    const backupData = await request.json();

    // Validar estructura básica del backup
    if (!backupData || !backupData.products || !backupData.clients || !backupData.sales) {
      return NextResponse.json({ error: 'El archivo de respaldo no tiene un formato válido.' }, { status: 400 });
    }

    // Ejecutar la restauración completa en una transacción segura
    await db.$transaction(async (tx) => {
      // 1. Limpiar datos existentes en orden de dependencia (hijos primero)
      // Limpiar SaleItem e historiales vinculados a ventas del tenant
      await tx.saleItem.deleteMany({
        where: {
          sale: { tenantId }
        }
      });
      await tx.sale.deleteMany({ where: { tenantId } });
      await tx.accountMovement.deleteMany({ where: { tenantId } });
      await tx.stockMovement.deleteMany({ where: { tenantId } });
      await tx.product.deleteMany({ where: { tenantId } });
      await tx.category.deleteMany({ where: { tenantId } });
      await tx.client.deleteMany({ where: { tenantId } });
      
      // Eliminar usuarios del tenant excepto el usuario actual para evitar quedarse sin acceso
      await tx.user.deleteMany({
        where: {
          tenantId,
          id: { not: userId }
        }
      });

      // 2. Restaurar Categorías
      if (backupData.categories && backupData.categories.length > 0) {
        await tx.category.createMany({
          data: backupData.categories.map((c: any) => ({
            id: c.id,
            tenantId,
            name: c.name,
            description: c.description,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          }))
        });
      }

      // 3. Restaurar Clientes
      if (backupData.clients && backupData.clients.length > 0) {
        await tx.client.createMany({
          data: backupData.clients.map((c: any) => ({
            id: c.id,
            tenantId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            cuitCuil: c.cuitCuil,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          }))
        });
      }

      // 4. Restaurar Productos
      if (backupData.products && backupData.products.length > 0) {
        await tx.product.createMany({
          data: backupData.products.map((p: any) => ({
            id: p.id,
            tenantId,
            categoryId: p.categoryId,
            code: p.code,
            name: p.name,
            description: p.description,
            purchasePrice: p.purchasePrice,
            salePrice: p.salePrice,
            stock: p.stock,
            minStock: p.minStock,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          }))
        });
      }

      // 5. Restaurar Usuarios auxiliares
      if (backupData.users && backupData.users.length > 0) {
        const otherUsers = backupData.users.filter((u: any) => u.id !== userId);
        if (otherUsers.length > 0) {
          await tx.user.createMany({
            data: otherUsers.map((u: any) => ({
              id: u.id,
              tenantId,
              name: u.name,
              email: u.email,
              passwordHash: u.passwordHash,
              role: u.role,
              isActive: u.isActive ?? true,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
            }))
          });
        }
      }

      // 6. Restaurar Ventas y sus Ítems de venta
      if (backupData.sales && backupData.sales.length > 0) {
        for (const s of backupData.sales) {
          await tx.sale.create({
            data: {
              id: s.id,
              tenantId,
              clientId: s.clientId,
              userId: s.userId === userId ? userId : (backupData.users?.some((u: any) => u.id === s.userId) ? s.userId : userId),
              totalAmount: s.totalAmount,
              taxAmount: s.taxAmount,
              paymentMethod: s.paymentMethod,
              createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
              items: {
                create: s.items?.map((item: any) => ({
                  id: item.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.subtotal
                })) || []
              }
            }
          });
        }
      }

      // 7. Restaurar Movimientos de Stock
      if (backupData.stockMovements && backupData.stockMovements.length > 0) {
        await tx.stockMovement.createMany({
          data: backupData.stockMovements.map((sm: any) => ({
            id: sm.id,
            tenantId,
            productId: sm.productId,
            userId: sm.userId === userId ? userId : (backupData.users?.some((u: any) => u.id === sm.userId) ? sm.userId : userId),
            type: sm.type,
            quantity: sm.quantity,
            reason: sm.reason,
            createdAt: sm.createdAt ? new Date(sm.createdAt) : new Date(),
          }))
        });
      }

      // 8. Restaurar Cuentas Corrientes
      if (backupData.accountMovements && backupData.accountMovements.length > 0) {
        await tx.accountMovement.createMany({
          data: backupData.accountMovements.map((am: any) => ({
            id: am.id,
            tenantId,
            clientId: am.clientId,
            type: am.type,
            amount: am.amount,
            note: am.note,
            saleId: am.saleId,
            createdAt: am.createdAt ? new Date(am.createdAt) : new Date(),
            updatedAt: am.updatedAt ? new Date(am.updatedAt) : new Date(),
          }))
        });
      }

      // 9. Actualizar Configuración del Tenant si viene en el backup
      if (backupData.tenant) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            name: backupData.tenant.name || undefined,
            logoUrl: backupData.tenant.logoUrl || undefined,
            currency: backupData.tenant.currency || undefined,
            taxPercentage: backupData.tenant.taxPercentage || undefined,
            cuit: backupData.tenant.cuit || undefined,
          }
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Copia de seguridad restaurada con éxito.' });
  } catch (error: any) {
    console.error('Error POST /api/backup:', error);
    return NextResponse.json({ error: error.message || 'Error al restaurar copia de seguridad' }, { status: 500 });
  }
}
