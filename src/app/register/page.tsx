'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, name, email, password }),
      });

      const data = await res.ok ? await res.json() : null;

      if (res.ok && data?.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const errorData = !res.ok ? await res.json() : {};
        setError(errorData.error || 'Ocurrió un error al registrar el negocio');
      }
    } catch (err) {
      setError('Ocurrió un error de red. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.logo}>C</div>
            <span className={styles.brandName}>ControlComercio</span>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Creá tu negocio</h1>
            <p className={styles.subtitle}>Comenzá tu prueba gratuita de 14 días en el plan Pro</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="businessName">Nombre del comercio / negocio</label>
              <input
                id="businessName"
                type="text"
                className="form-input"
                placeholder="Ferretería El Tornillo / Kiosco Pepito"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Nombre completo del administrador</label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Juan Pérez"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electrónico administrador</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@comercio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña (Mínimo 6 caracteres)</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Creando negocio...' : 'Crear Cuenta y Empezar'}
            </button>
          </form>

          <div className={styles.footer}>
            ¿Ya tenés un comercio registrado?{' '}
            <Link href="/login" className={styles.linkText}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
