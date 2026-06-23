import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at 10% 20%, hsl(262, 83%, 58%, 0.08) 0%, transparent 40%), hsl(222, 47%, 11%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header / Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#7c3aed',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>C</div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>ControlComercio</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'background 0.2s',
            color: 'rgba(255, 255, 255, 0.8)'
          }}
          className="hover-btn"
          >
            Ingresar
          </Link>
          <Link href="/register" style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            backgroundColor: '#7c3aed',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            transition: 'transform 0.2s'
          }}>
            Probar Gratis
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: 'rgba(124, 58, 237, 0.15)',
          color: '#a78bfa',
          padding: '0.35rem 1rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          SaaS para comercios de Argentina
        </div>
        
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.15,
          marginBottom: '1.5rem',
          background: 'linear-gradient(to right, #ffffff, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          El control total de tu negocio en una sola pantalla
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: '#9ca3af',
          maxWidth: '650px',
          lineHeight: 1.6,
          marginBottom: '2.5rem'
        }}>
          Diseñado para kioscos, almacenes, ferreterías y dietéticas. Controlá tu stock en tiempo real, registrá ventas al instante y obtené reportes mensuales automáticos. Simple, rápido y sin vueltas.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register" style={{
            fontSize: '1rem',
            fontWeight: 700,
            backgroundColor: '#7c3aed',
            color: 'white',
            padding: '0.85rem 2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
            transition: 'all 0.2s'
          }}>
            Crear Mi Cuenta Pro
          </Link>
          <Link href="/login" style={{
            fontSize: '1rem',
            fontWeight: 700,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e5e7eb',
            padding: '0.85rem 2rem',
            borderRadius: '12px',
            transition: 'all 0.2s'
          }}>
            Iniciar Sesión
          </Link>
        </div>

        {/* Feature Grid */}
        <section style={{
          marginTop: '6rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2rem',
          width: '100%',
          textAlign: 'left'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.2s'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#a78bfa' }}>📦 Control de Stock</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Entradas y salidas de mercadería automáticas al vender. Alertas instantáneas cuando te quedes con poco producto.
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.2s'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#a78bfa' }}>⚡ Punto de Venta (POS)</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Registrá ventas con múltiples productos en segundos. Admite efectivo, tarjetas y MercadoPago/Transferencias.
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.2s'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#a78bfa' }}>📊 Reportes de Ganancias</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Conocé tus ventas del día, del mes y tus ganancias reales netas en base a tus precios de costo.
            </p>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        fontSize: '0.8rem',
        color: '#6b7280',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        © 2026 ControlComercio SaaS. Todos los derechos reservados. Desarrollado para comercios en Argentina.
      </footer>
    </div>
  );
}
