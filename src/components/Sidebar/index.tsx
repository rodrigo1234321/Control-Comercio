'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

interface UserInfo {
  name: string;
  email: string;
  role: string;
  tenantName: string;
}

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Obtener información del usuario autenticado
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error fetching user info', err);
      }
    }
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error logging out', err);
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}>
        <div className={styles.logo}>C</div>
        <span className={styles.brandName}>ControlComercio</span>
      </div>

      {user && (
        <div className={styles.profileCard}>
          <span className={styles.profileBusiness}>{user.tenantName}</span>
          <span className={styles.profileName}>{user.name}</span>
          <span className={styles.profileRole}>{user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</span>
        </div>
      )}

      <nav className={styles.nav}>
        <Link 
          href="/dashboard" 
          onClick={onClose}
          className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
        >
          <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Inicio
        </Link>

        <Link 
          href="/dashboard/sales" 
          onClick={onClose}
          className={`${styles.navLink} ${isActive('/dashboard/sales') ? styles.active : ''}`}
        >
          <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Registrar Venta (POS)
        </Link>

        <Link 
          href="/dashboard/inventory" 
          onClick={onClose}
          className={`${styles.navLink} ${isActive('/dashboard/inventory') ? styles.active : ''}`}
        >
          <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Inventario y Stock
        </Link>

        <Link 
          href="/dashboard/clients" 
          onClick={onClose}
          className={`${styles.navLink} ${isActive('/dashboard/clients') ? styles.active : ''}`}
        >
          <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Clientes
        </Link>

        <Link 
          href="/dashboard/accounts" 
          onClick={onClose}
          className={`${styles.navLink} ${isActive('/dashboard/accounts') ? styles.active : ''}`}
        >
          <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cuentas Corrientes
        </Link>

        {user && user.role === 'ADMIN' && (
          <>
            <Link 
              href="/dashboard/reports" 
              onClick={onClose}
              className={`${styles.navLink} ${isActive('/dashboard/reports') ? styles.active : ''}`}
            >
              <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Reportes e Informes
            </Link>

            <Link 
              href="/dashboard/settings" 
              onClick={onClose}
              className={`${styles.navLink} ${isActive('/dashboard/settings') ? styles.active : ''}`}
            >
              <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración
            </Link>
          </>
        )}
      </nav>

      <button onClick={handleLogout} className={styles.logoutBtn}>
        <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Cerrar Sesión
      </button>
    </aside>
  );
}
