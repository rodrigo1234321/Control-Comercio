import { NextResponse, NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';

// Rutas exclusivas para Administradores
const ADMIN_ONLY_ROUTES = [
  '/dashboard/reports',
  '/dashboard/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo interceptar rutas dentro del dashboard
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      // Si no hay token, redirigir al login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Decodificar el payload del JWT (segunda parte del string base64url)
      const payloadPart = token.split('.')[1];
      if (!payloadPart) throw new Error('Token inválido');
      
      // Decodificación segura en entorno Edge
      const decodedPayload = JSON.parse(
        Buffer.from(payloadPart, 'base64').toString('utf8')
      );

      const userRole = decodedPayload.role;

      // Verificar si el usuario intenta acceder a una ruta de administrador siendo empleado
      const isRouteAdminOnly = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
      if (isRouteAdminOnly && userRole !== 'ADMIN') {
        // Redirigir al dashboard general si no es administrador
        const homeDashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(homeDashboardUrl);
      }

      // Añadir encabezados personalizados para que las páginas y API conozcan al usuario
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decodedPayload.userId);
      requestHeaders.set('x-tenant-id', decodedPayload.tenantId);
      requestHeaders.set('x-user-role', decodedPayload.role);
      requestHeaders.set('x-user-email', decodedPayload.email);
      requestHeaders.set('x-user-name', decodedPayload.name);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // Token corrupto o inválido: borrar cookie y redirigir a login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }
  }

  // Si ya tiene sesión iniciada e intenta ir a login o registro, redirigir a dashboard
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (e) {
        // Ignorar y dejar continuar al login/registro
      }
    }
  }

  return NextResponse.next();
}

// Configuración de rutas a las que aplica el middleware
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/'],
};
