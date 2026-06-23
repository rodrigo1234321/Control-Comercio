'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.ok ? await res.json() : null;

      if (res.ok && data?.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const errorData = !res.ok ? await res.json() : {};
        setError(errorData.error || 'Correo o contraseña incorrectos');
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
            <h1 className={styles.title}>¡Hola de nuevo!</h1>
            <p className={styles.subtitle}>Iniciá sesión para administrar tu negocio</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="ejemplo@comercio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
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
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>

          <div className={styles.footer}>
            ¿No tenés una cuenta?{' '}
            <Link href="/register" className={styles.linkText}>
              Crear cuenta de negocio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
