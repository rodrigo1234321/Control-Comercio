import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const employeeSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { tenantId } = authUser;

    // Listar todos los usuarios empleados del tenant
    const employees = await db.user.findMany({
      where: {
        tenantId,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error GET /api/auth/employee:', error);
    return NextResponse.json({ error: 'Error al obtener empleados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado: Se requiere rol de Administrador' }, { status: 403 });
    }

    const { tenantId } = authUser;

    const body = await request.json();
    const result = employeeSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { name, email, password } = result.data;

    // Verificar si el correo ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado por otro usuario' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Crear el usuario empleado asociado al mismo tenant
    const employee = await db.user.create({
      data: {
        tenantId,
        name,
        email,
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/auth/employee:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear empleado' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = getAuthUser();

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { tenantId } = authUser;
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del empleado es requerido' }, { status: 400 });
    }

    // Verificar que pertenezca al tenant y tenga rol EMPLOYEE
    const employee = await db.user.findFirst({
      where: { id, tenantId, role: 'EMPLOYEE' }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const updatedEmployee = await db.user.update({
      where: { id },
      data: { isActive: !!isActive }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        isActive: updatedEmployee.isActive
      }
    });
  } catch (error) {
    console.error('Error PUT /api/auth/employee:', error);
    return NextResponse.json({ error: 'Error al cambiar estado del empleado' }, { status: 500 });
  }
}
