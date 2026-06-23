import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos de desarrollo...');

  // Encriptar contraseñas para los usuarios de prueba
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const employeePasswordHash = await bcrypt.hash('empleado123', 10);

  // 1. Crear el Tenant (Comercio de prueba)
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Kiosco San Martín',
      currency: 'ARS',
      taxPercentage: 21.0,
      cuit: '30-71888222-9',
      subscriptionStatus: 'active',
      planType: 'pro',
    },
  });

  // 2. Crear Usuarios (Administrador y Empleado)
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Jorge Administrador',
      email: 'admin@comercio.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const employee = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Sofía Cajera',
      email: 'empleado@comercio.com',
      passwordHash: employeePasswordHash,
      role: 'EMPLOYEE',
      isActive: true,
    },
  });

  // 3. Crear Categorías
  const catBebidas = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Bebidas', description: 'Gaseosas, aguas, cervezas' },
  });

  const catGolosinas = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Golosinas', description: 'Chocolates, caramelos, alfajores' },
  });

  const catAlmacen = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Almacén', description: 'Galletitas, conservas, panificados' },
  });

  // 4. Crear Productos
  const prod1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      code: '7790895000430',
      name: 'Coca-Cola 500ml',
      description: 'Gaseosa sabor original botella de plástico',
      purchasePrice: 650.0,
      salePrice: 1200.0,
      stock: 45,
      minStock: 10,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catGolosinas.id,
      code: '7790580120000',
      name: 'Alfajor Jorgito Chocolate',
      description: 'Alfajor Jorgito relleno de dulce de leche bañado en chocolate',
      purchasePrice: 350.0,
      salePrice: 700.0,
      stock: 12, // Cerca del stock mínimo
      minStock: 15,
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catAlmacen.id,
      code: '7790040103900',
      name: 'Galletitas Criollitas 100g',
      description: 'Galletitas de agua clásicas Criollitas',
      purchasePrice: 280.0,
      salePrice: 500.0,
      stock: 60,
      minStock: 20,
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      code: '7790895648500',
      name: 'Cerveza Quilmes Lata 473ml',
      description: 'Cerveza Quilmes Clásica lata rubia',
      purchasePrice: 800.0,
      salePrice: 1500.0,
      stock: 4, // Bajo stock crítico
      minStock: 10,
    },
  });

  // 5. Cargar movimientos de carga inicial de stock
  const prods = [prod1, prod2, prod3, prod4];
  for (const p of prods) {
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: p.id,
        userId: admin.id,
        type: 'IN',
        quantity: p.stock + 10, // Simular carga inicial mayor
        reason: 'Carga masiva de inventario inicial',
      },
    });
  }

  // 6. Crear Clientes
  const cliente1 = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: 'Carlos Alberto Spinetta',
      email: 'luis@spinettaland.com',
      phone: '11-4567-8910',
      cuitCuil: '20-08123456-9',
    },
  });

  const cliente2 = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: 'Mercedes Sosa',
      email: 'la_negra@sosa.org',
      phone: '381-4321-0987',
      cuitCuil: '27-03456789-2',
    },
  });

  // 7. Generar Historial de Ventas de los últimos 7 días
  // Esto asegura que los gráficos y métricas del dashboard se muestren llenos al ingresar.
  const now = new Date();
  
  // Ventas pasadas (últimos 6 días)
  const salesAmounts = [24000, 31000, 18500, 42000, 27500, 38000];
  
  for (let i = 6; i > 0; i--) {
    const saleDate = new Date();
    saleDate.setDate(now.getDate() - i);
    saleDate.setHours(12 + i, 30, 0, 0); // Esparcir horas

    const totalAmount = salesAmounts[6 - i];
    const taxAmount = totalAmount - (totalAmount / 1.21);

    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        clientId: i % 2 === 0 ? cliente1.id : cliente2.id,
        userId: employee.id,
        totalAmount,
        taxAmount,
        paymentMethod: i % 3 === 0 ? 'TRANSFER' : (i % 2 === 0 ? 'DEBIT' : 'CASH'),
        createdAt: saleDate,
      },
    });

    // Añadir items a la venta simulando Coca-Cola (prod1) y Galletitas (prod3)
    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: prod1.id,
        quantity: Math.floor(totalAmount / 2400),
        unitPrice: prod1.salePrice,
        subtotal: totalAmount * 0.6,
      },
    });
    
    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: prod3.id,
        quantity: Math.floor((totalAmount * 0.4) / prod3.salePrice),
        unitPrice: prod3.salePrice,
        subtotal: totalAmount * 0.4,
      },
    });
  }

  // Ventas de hoy (Today Sales)
  // Venta 1
  const todaySale1 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      clientId: cliente1.id,
      userId: employee.id,
      totalAmount: 3600.0,
      taxAmount: 3600.0 - (3600.0 / 1.21),
      paymentMethod: 'CASH',
      createdAt: now,
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: todaySale1.id,
      productId: prod1.id,
      quantity: 3, // 3 cocas
      unitPrice: prod1.salePrice,
      subtotal: 3600.0,
    },
  });

  // Venta 2
  const todaySale2 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      clientId: null, // Consumidor final
      userId: employee.id,
      totalAmount: 1400.0,
      taxAmount: 1400.0 - (1400.0 / 1.21),
      paymentMethod: 'TRANSFER',
      createdAt: now,
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: todaySale2.id,
      productId: prod2.id,
      quantity: 2, // 2 alfajores
      unitPrice: prod2.salePrice,
      subtotal: 1400.0,
    },
  });

  console.log('¡Sembrado de base de datos finalizado con éxito!');
  console.log('Credenciales de Acceso:');
  console.log('Administrador: email: admin@comercio.com / clave: admin123');
  console.log('Empleado:      email: empleado@comercio.com / clave: empleado123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
