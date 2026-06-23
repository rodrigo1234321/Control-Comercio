import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  businessName: z.string().min(2, 'El nombre del negocio debe tener al menos 2 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  inviteCode: z.string().min(1, 'El código de invitación es obligatorio'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar los datos de entrada
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { businessName, name, email, password, inviteCode } = result.data;

    // Verificar que el código de invitación existe y no fue usado
    const invite = await db.inviteCode.findUnique({
      where: { code: inviteCode.trim().toUpperCase() },
    });

    if (!invite) {
      return NextResponse.json({ error: 'El código de invitación no es válido' }, { status: 400 });
    }

    if (invite.isUsed) {
      return NextResponse.json({ error: 'Este código de invitación ya fue utilizado' }, { status: 400 });
    }

    // Verificar si el correo ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Crear Tenant, Usuario y marcar código como usado en una transacción
    const { user, tenant } = await db.$transaction(async (tx) => {
      // 1. Crear el negocio (Tenant)
      const newTenant = await tx.tenant.create({
        data: {
          name: businessName,
          currency: 'ARS',
          taxPercentage: 21.0,
          subscriptionStatus: 'active',
          planType: invite.planType, // Usa el plan del código de invitación
        },
      });

      // 2. Crear el usuario administrador
      const newUser = await tx.user.create({
        data: {
          tenantId: newTenant.id,
          name,
          email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      // 3. Crear categorías básicas por defecto
      await tx.category.createMany({
        data: [
          { tenantId: newTenant.id, name: 'General', description: 'Categoría por defecto' },
          { tenantId: newTenant.id, name: 'Bebidas', description: 'Gaseosas, aguas, jugos' },
          { tenantId: newTenant.id, name: 'Almacén', description: 'Comestibles secos y enlatados' },
        ],
      });

      // 4. Marcar el código de invitación como usado
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          isUsed: true,
          usedBy: email,
          usedAt: new Date(),
        },
      });

      return { user: newUser, tenant: newTenant };
    });

    // Firmar JWT
    const token = signToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    // Configurar respuesta con cookie HttpOnly
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      }
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en registro SaaS:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor al crear la cuenta' }, { status: 500 });
  }
}

