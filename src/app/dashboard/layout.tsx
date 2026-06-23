'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      {/* Sidebar de navegación */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Fondo opaco para cerrar el sidebar en móviles */}
      {sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className={styles.menuBtn}
              aria-label="Abrir menú"
            >
              <svg className={styles.menuIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className={styles.businessName}>Panel de Control</span>
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle />
          </div>
        </header>

        <main className={styles.pageBody}>
          {children}
        </main>
      </div>
    </div>
  );
}
