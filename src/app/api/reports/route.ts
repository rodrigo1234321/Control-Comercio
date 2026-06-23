import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId, role } = authUser;

    // El reporte avanzado requiere rol ADMIN. El empleado solo puede ver datos agregados del dashboard
    const { searchParams } = new URL(request.url);
    const dashboardOnly = searchParams.get('dashboard') === 'true';

    if (!dashboardOnly && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }


    const now = new Date();
    
    // Inicio del día actual (00:00:00 local del servidor)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Inicio del mes actual (1er día del mes a las 00:00:00)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Inicio de los últimos 30 días
    const startOfLast30Days = new Date();
    startOfLast30Days.setDate(now.getDate() - 30);

    // 1. Ventas del día (Total facturado hoy)
    const todaySalesData = await db.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfToday },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      }
    });
    const todaySales = todaySalesData._sum.totalAmount || 0;
    const todaySalesCount = todaySalesData._count.id || 0;

    // Calcular ganancia estimada de hoy
    const saleItemsToday = await db.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: { gte: startOfToday },
        }
      },
      include: {
        product: {
          select: { purchasePrice: true }
        }
      }
    });
    let todayCost = 0;
    saleItemsToday.forEach(item => {
      if (item.product) {
        todayCost += (item.product.purchasePrice * item.quantity);
      }
    });
    const todayProfit = todaySales - todayCost;

    // 1.b Ventas de la semana (últimos 7 días)
    const startOfLast7Days = new Date();
    startOfLast7Days.setDate(now.getDate() - 7);
    startOfLast7Days.setHours(0, 0, 0, 0);

    const weekSalesData = await db.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfLast7Days },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      }
    });
    const weekSales = weekSalesData._sum.totalAmount || 0;
    const weekSalesCount = weekSalesData._count.id || 0;

    // Calcular ganancia de la semana
    const saleItemsWeek = await db.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: { gte: startOfLast7Days },
        }
      },
      include: {
        product: {
          select: { purchasePrice: true }
        }
      }
    });
    let weekCost = 0;
    saleItemsWeek.forEach(item => {
      if (item.product) {
        weekCost += (item.product.purchasePrice * item.quantity);
      }
    });
    const weekProfit = weekSales - weekCost;

    // 2. Ventas del mes (Total facturado en el mes)
    const monthSalesData = await db.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        totalAmount: true,
      },
    });
    const monthSales = monthSalesData._sum.totalAmount || 0;

    // 3. Productos con bajo stock (stock <= minStock)
    const products = await db.product.findMany({
      where: { tenantId },
      select: { id: true, stock: true, minStock: true, name: true, code: true },
    });
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    const lowStockCount = lowStockProducts.length;

    // 4. Productos más vendidos (Top 5 en los últimos 30 días)
    const saleItemsLast30 = await db.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: { gte: startOfLast30Days },
        }
      },
      include: {
        product: {
          select: { name: true, code: true, purchasePrice: true }
        }
      }
    });

    // Agrupar ventas por producto
    const productSalesMap: Record<string, { id: string; name: string; code: string; quantity: number; revenue: number; cost: number }> = {};
    
    saleItemsLast30.forEach((item) => {
      if (!item.product) return;
      
      const pId = item.productId;
      if (!productSalesMap[pId]) {
        productSalesMap[pId] = {
          id: pId,
          name: item.product.name,
          code: item.product.code,
          quantity: 0,
          revenue: 0,
          cost: 0,
        };
      }
      
      productSalesMap[pId].quantity += item.quantity;
      productSalesMap[pId].revenue += item.subtotal;
      productSalesMap[pId].cost += (item.product.purchasePrice * item.quantity);
    });

    const productSalesList = Object.values(productSalesMap);
    
    // Ordenar y tomar los 5 más vendidos
    const topProducts = [...productSalesList]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 5. Productos con menor rotación (Menos vendidos en los últimos 30 días)
    // Incluir productos cargados que tienen 0 ventas en el período
    const allProductsInTenant = await db.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, stock: true }
    });

    const slowProducts = allProductsInTenant.map(p => {
      const sold = productSalesMap[p.id]?.quantity || 0;
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        stock: p.stock,
        quantitySold: sold,
      };
    })
    .sort((a, b) => a.quantitySold - b.quantitySold)
    .slice(0, 5);

    // 6. Ganancias Estimadas y Reporte de Ventas en los últimos 30 días
    // Ganancia = Suma(ventaItem.subtotal - costodecompra * cantidad)
    let totalRevenue30Days = 0;
    let totalCost30Days = 0;

    saleItemsLast30.forEach(item => {
      if (item.product) {
        totalRevenue30Days += item.subtotal;
        totalCost30Days += (item.product.purchasePrice * item.quantity);
      }
    });

    const estimatedProfit30Days = totalRevenue30Days - totalCost30Days;

    // 7. Historial de ventas de los últimos 7 días (para gráfico del Dashboard)
    const sales7Days = await db.sale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfLast7Days },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar ventas de los últimos 7 días por fecha
    const dailySalesMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      dailySalesMap[dateStr] = 0;
    }

    sales7Days.forEach(sale => {
      const dateStr = sale.createdAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      if (dailySalesMap[dateStr] !== undefined) {
        dailySalesMap[dateStr] += sale.totalAmount;
      }
    });

    const salesHistory = Object.entries(dailySalesMap).map(([date, total]) => ({
      date,
      total,
    }));

    return NextResponse.json({
      summary: {
        todaySales,
        todaySalesCount,
        weekSales,
        weekSalesCount,
        monthSales,
        lowStockCount,
        todayProfit,
        weekProfit,
        estimatedProfit30Days,
        revenue30Days: totalRevenue30Days,
        cost30Days: totalCost30Days,
      },
      topProducts,
      slowProducts,
      lowStockProducts: lowStockProducts.slice(0, 10), // Detalle de hasta 10 con bajo stock
      salesHistory,
    });
  } catch (error) {
    console.error('Error GET /api/reports:', error);
    return NextResponse.json({ error: 'Error al generar informes' }, { status: 500 });
  }
}
