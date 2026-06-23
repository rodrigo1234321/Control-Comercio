import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ControlComercio - Gestión de Stock y Ventas para PyMEs',
  description: 'ControlComercio es la solución definitiva para pequeños y medianos comercios de Argentina. Administrá stock, realizá ventas, gestioná clientes y visualizá reportes en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
