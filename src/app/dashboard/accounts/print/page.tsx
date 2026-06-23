'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cuitCuil: string | null;
}

interface Movement {
  id: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  note: string | null;
  createdAt: string;
}

function PrintAccountContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  
  const [client, setClient] = useState<Client | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [balance, setBalance] = useState(0);
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    async function loadPrintData() {
      try {
        // 1. Configuración de negocio
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          setTenantConfig(configData.tenant);
        }

        // 2. Todos los clientes (para buscar el activo)
        const clientsRes = await fetch('/api/clients');
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const activeCli = clientsData.clients?.find((c: any) => c.id === clientId);
          setClient(activeCli || null);
        }

        // 3. Movimientos y saldo
        const movementsRes = await fetch(`/api/account-movements?clientId=${clientId}`);
        if (movementsRes.ok) {
          const movementsData = await movementsRes.json();
          setMovements(movementsData.movements || []);
          setBalance(movementsData.balance || 0);
        }
      } catch (err) {
        console.error('Error cargando datos de impresión', err);
      } finally {
        setLoading(false);
      }
    }

    loadPrintData();
  }, [clientId]);

  useEffect(() => {
    if (!loading && client) {
      // Pequeño delay para asegurar que el DOM terminó de renderizar antes del diálogo de impresión
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, client]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Generando vista de impresión...</div>;
  }

  if (!client) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>Cliente no encontrado.</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: '#000', backgroundColor: '#fff', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Cabecera del Comercio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '15px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold' }}>{tenantConfig?.name || 'ControlComercio'}</h1>
          <p style={{ margin: '2px 0', fontSize: '12px' }}>{tenantConfig?.cuit ? `CUIT: ${tenantConfig.cuit}` : 'Monotributista / Consumidor Final'}</p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>Estado de Cuenta Corriente</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#333' }}>ESTADO DE CUENTA</h2>
          <p style={{ margin: '2px 0', fontSize: '12px' }}>Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      {/* Información del Cliente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', border: '1px solid #ddd' }}>
        <div>
          <span style={{ fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>DATOS DEL CLIENTE</span>
          <p style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>{client.name}</p>
          {client.cuitCuil && <p style={{ margin: '2px 0' }}>CUIT/CUIL: {client.cuitCuil}</p>}
          {client.phone && <p style={{ margin: '2px 0' }}>Teléfono: {client.phone}</p>}
          {client.email && <p style={{ margin: '2px 0' }}>Email: {client.email}</p>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#555', display: 'block' }}>SALDO CONSOLIDADO</span>
          <h2 style={{ margin: '5px 0 0 0', fontSize: '22px', color: balance > 0 ? '#b91c1c' : balance < 0 ? '#15803d' : '#000', fontWeight: 'bold' }}>
            {balance > 0 ? `${formatCurrency(balance)} (Debe)` : balance < 0 ? `${formatCurrency(Math.abs(balance))} (A favor)` : formatCurrency(0)}
          </h2>
        </div>
      </div>

      {/* Detalle de Movimientos */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#eee' }}>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Fecha</th>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Concepto / Detalle</th>
            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Debe (+)</th>
            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Haber (-)</th>
            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Saldo Acum.</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No registra movimientos.</td>
            </tr>
          ) : (
            (() => {
              let runningBalance = 0;
              return movements.map((m) => {
                if (m.type === 'DEBT') runningBalance += m.amount;
                else if (m.type === 'PAYMENT') runningBalance -= m.amount;

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{formatDate(m.createdAt).split(' ')[0]}</td>
                    <td style={{ padding: '8px' }}>{m.note}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: m.type === 'DEBT' ? '#b91c1c' : '#000' }}>
                      {m.type === 'DEBT' ? formatCurrency(m.amount) : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: m.type === 'PAYMENT' ? '#15803d' : '#000' }}>
                      {m.type === 'PAYMENT' ? formatCurrency(m.amount) : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(runningBalance)}
                    </td>
                  </tr>
                );
              });
            })()
          )}
        </tbody>
      </table>

      {/* Pie del Documento */}
      <div style={{ marginTop: '50px', paddingTop: '15px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '11px', color: '#666' }}>
        <p style={{ margin: '2px 0' }}>Este documento es un estado de cuenta interno emitido para información del cliente.</p>
        <p style={{ margin: '2px 0' }}>ControlComercio - Software de Gestión de Comercios</p>
      </div>

    </div>
  );
}

export default function PrintAccountPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Generando vista de impresión...</div>}>
      <PrintAccountContent />
    </Suspense>
  );
}
