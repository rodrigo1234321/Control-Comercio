# ControlComercio SaaS 🚀

**ControlComercio** es una plataforma SaaS (Software as a Service) multitenant diseñada específicamente para la administración de pequeños y medianos comercios de Argentina (kioscos, ferreterías, dietéticas, tiendas de tecnología, almacenes y minoristas en general). 

El sistema cuenta con aislamiento estricto de datos a nivel de fila (`tenantId`), autenticación robusta mediante cookies HttpOnly, control de roles (Administrador y Empleado), y un punto de venta (POS) optimizado para pantallas táctiles y lectores de código de barras.

---

## 🛠️ Tecnologías y Estructura

* **Framework**: [Next.js 14+ (App Router)](https://nextjs.org/) con TypeScript.
* **Estilos (UI)**: CSS Vanilla con **CSS Modules** (Diseño premium, responsive, modo claro y oscuro nativo con variables HSL).
* **ORM e Integración de Datos**: [Prisma ORM](https://www.prisma.io/).
* **Base de Datos**: Relacional. Configurada con **SQLite** para desarrollo local rápido y preparada para **PostgreSQL** en producción.
* **Seguridad**: Hashing con BcryptJS y tokens firmados con JWT.

---

## 🚀 Guía de Ejecución Local (Paso a Paso)

Sigue estos pasos para poner en marcha el proyecto en tu máquina local:

### 1. Requisitos Previos
Asegúrate de tener instalado en tu sistema:
* **Node.js** (versión 18 o superior). Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
* **Git** para control de versiones.

### 2. Clonar o Ubicar el Proyecto
Abre una terminal en la carpeta del proyecto `control-comercio`.

### 3. Instalar las Dependencias
Ejecuta el siguiente comando para descargar todos los paquetes necesarios del frontend y backend:
```bash
npm install
```

### 4. Configurar la Base de Datos Local
Genera el cliente de Prisma y aplica las tablas automáticamente en el archivo SQLite local de desarrollo:
```bash
npx prisma db push
```

### 5. Sembrar Datos de Prueba (Seeding)
Carga categorías básicas, productos con código de barras, clientes simulados e historial de ventas de los últimos 7 días ejecutando:
```bash
npm run db:seed
```

### 6. Iniciar Servidor de Desarrollo
Lanza la aplicación en modo desarrollo local:
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🔑 Credenciales de Acceso para Pruebas

El script de sembrado (`seed`) genera las siguientes cuentas listas para probar el sistema:

### Rol Administrador (Control Total, Reportes y Ajustes)
* **Correo**: `admin@comercio.com`
* **Contraseña**: `admin123`

### Rol Empleado (Solo POS, Clientes e Inventario básico)
* **Correo**: `empleado@comercio.com`
* **Contraseña**: `empleado123`

---

## ☁️ Guía de Despliegue en Producción

### 1. Base de Datos Cloud (PostgreSQL)
Para producción, utiliza un proveedor de base de datos PostgreSQL administrada (e.g., [Supabase](https://supabase.com/), [Neon](https://neon.tech/) o [Render](https://render.com/)).

1. Crea una base de datos PostgreSQL.
2. Copia la cadena de conexión (Connection String).
3. Modifica el archivo [prisma/schema.prisma](file:///C:/Users/rodri/.gemini/antigravity/scratch/control-comercio/prisma/schema.prisma) para apuntar a PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Define la variable `DATABASE_URL` en tu servidor de producción con la cadena de conexión de tu PostgreSQL.

### 2. Alojamiento de la Aplicación (SaaS)
La opción recomendada y optimizada para Next.js es **Vercel** o **Render**:

#### Opción A: Despliegue en Vercel (Recomendado)
1. Conecta tu repositorio de Git a Vercel.
2. Configura las siguientes variables de entorno en el panel de Vercel:
   * `DATABASE_URL`: Enlace a tu PostgreSQL en producción.
   * `JWT_SECRET`: Una clave secreta robusta generada al azar (e.g., usando `openssl rand -base64 32`).
   * `NEXT_PUBLIC_APP_URL`: URL pública de tu despliegue (ej. `https://tuapp.vercel.app`).
3. Vercel ejecutará automáticamente la compilación (`npm run build`), ejecutará la generación del cliente Prisma y desplegará la web en producción con servidores Edge ultra rápidos.

---

## 💼 Estrategia SaaS y Monetización PyME en Argentina

El sistema fue modelado para operar bajo un esquema mensual de suscripción.

### Estructura de Planes y Precios Sugeridos
1. **Plan Kiosco ($15.000 ARS / mes)**:
   * Diseñado para comercios pequeños de autoempleo.
   * Límite de 500 productos y 1 solo usuario de caja.
   * Registro básico de ventas.
2. **Plan Comercio Pro ($30.000 ARS / mes)**:
   * Diseñado para dietéticas, tiendas de tecnología y almacenes.
   * Productos ilimitados.
   * Hasta 5 usuarios con control de roles (Admin/Empleado).
   * Alertas automáticas de stock mínimo.
   * Reportes de ganancias netas estimados.
3. **Plan Franquicia / Multi-Sucursal ($55.000 ARS / mes)**:
   * Diseñado para comercios con varios locales.
   * Inventarios unificados y consolidados.

### 🚀 Futuras Funciones Premium (Venta Adicional / Upselling)
Para evolucionar esta base a un producto comercial de alta demanda en Argentina, se planifican los siguientes módulos:
* **Facturación Electrónica de AFIP (Factura A, B, C)**: Integración mediante Web Services de AFIP con la librería nativa para emitir comprobantes legales directamente al facturar.
* **Cobro por Código QR Dinámico (MercadoPago)**: Generar un QR en pantalla al cerrar la venta para cobrar en mostrador y validar la acreditación en tiempo real de forma automática.
* **Cuentas Corrientes y Fiado**: Módulo para registrar compras "al fiado" de clientes recurrentes del barrio, llevando un estado de deuda y control de pagos.
* **Carga Masiva de Listas de Proveedores**: Subir archivos Excel de distribuidores de ferretería o almacenes para actualizar precios de costo y venta de mil productos en un clic.
