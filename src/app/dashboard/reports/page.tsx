'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import styles from './reports.module.css';
import { exportToExcel } from '@/lib/excel';

interface ReportData {
  summary: {
    revenue30Days: number;
    cost30Days: number;
    estimatedProfit30Days: number;
    monthSales: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    revenue: number;
    cost: number;
  }>;
  slowProducts: Array<{
    id: string;
    name: string;
    code: string;
    stock: number;
    quantitySold: number;
  }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportSales = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/sales?all=true');
      if (res.ok) {
        const data = await res.json();
        const sales = data.sales || [];
        const dataToExport = [];
        
        for (const sale of sales) {
          const paymentLabel = (method: string) => {
            switch (method) {
              case 'CASH': return 'Efectivo';
              case 'DEBIT': return 'Débito';
              case 'CREDIT': return 'Crédito';
              case 'TRANSFER': return 'Transf. / QR';
              case 'DEBT': return 'Fiado / Cta Cte';
              default: return method;
            }
          };

          for (const item of sale.items) {
            dataToExport.push({
              'Nro. Venta': `#${sale.id.substring(0, 8).toUpperCase()}`,
              'Fecha': new Date(sale.createdAt).toLocaleDateString('es-AR'),
              'Hora': new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              'Vendedor (Cajero)': sale.user?.name || '',
              'Cliente': sale.client?.name || 'Consumidor Final',
              'CUIT Cliente': sale.client?.cuitCuil || '',
              'Producto': item.product?.name || '',
              'Código SKU': item.product?.code || '',
              'Cantidad': item.quantity,
              'Precio Unitario': item.unitPrice,
              'Subtotal': item.subtotal,
              'Medio de Pago': paymentLabel(sale.paymentMethod),
              'Importe Total Ticket': sale.totalAmount,
            });
          }
        }
        exportToExcel(dataToExport, `ventas-${new Date().toISOString().split('T')[0]}`, 'Ventas');
      } else {
        alert('Error al obtener ventas para exportar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          setError('No tienes autorización o la sesión expiró.');
        }
      } catch (err) {
        setError('Error al comunicar con el servidor.');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando informes de administración...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.card} style={{ borderColor: 'hsl(var(--destructive))', padding: '2rem' }}>
        <h3 style={{ color: 'hsl(var(--destructive))' }}>Error de Acceso</h3>
        <p style={{ marginTop: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
          {error || 'No se pudieron generar los informes comerciales.'}
        </p>
      </div>
    );
  }

  const { summary, topProducts, slowProducts } = data;
  const rentabilidad = summary.revenue30Days > 0 
    ? (summary.estimatedProfit30Days / summary.revenue30Days) * 100 
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Informes de Ventas e Rentabilidad</h2>
        <button 
          onClick={handleExportSales} 
          className="btn btn-secondary"
          disabled={exporting}
        >
          {exporting ? 'Exportando...' : '📤 Exportar Ventas a Excel'}
        </button>
      </div>
      
      {/* Tarjetas Consolidadas de Finanzas */}
      <div className={styles.gridCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Ingresos Brutos (30d)</span>
          <h3 className={styles.cardValue} style={{ color: 'hsl(var(--foreground))' }}>
            {formatCurrency(summary.revenue30Days)}
          </h3>
          <p className={styles.cardSub}>Total facturado en el mostrador</p>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Costo de Mercadería (30d)</span>
          <h3 className={styles.cardValue} style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatCurrency(summary.cost30Days)}
          </h3>
          <p className={styles.cardSub}>Costo acumulado de adquisición</p>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Ganancias Estimadas (30d)</span>
          <h3 className={styles.cardValue} style={{ color: 'hsl(var(--success))' }}>
            {formatCurrency(summary.estimatedProfit30Days)}
          </h3>
          <p className={styles.cardSub} style={{ fontWeight: 600 }}>Rentabilidad neta comercial</p>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Margen de Ganancia Promedio</span>
          <h3 className={styles.cardValue} style={{ color: 'hsl(var(--primary))' }}>
            {rentabilidad.toFixed(1)}%
          </h3>
          <p className={styles.cardSub}>Margen sobre facturación</p>
        </div>
      </div>

      <div className={styles.gridTables}>
        {/* Tabla de Productos Más Vendidos */}
        <div className={styles.tableCard}>
          <h3 className={styles.tableTitle}>⭐ Ranking de Productos con Mayor Facturación (Top 5)</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th style={{ textAlign: 'right' }}>Uds. Vendidas</th>
                <th style={{ textAlign: 'right' }}>Total Facturado</th>
                <th style={{ textAlign: 'right' }}>Ganancia Neta</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay ventas en este período.</td>
                </tr>
              ) : (
                topProducts.map((p) => {
                  const gain = p.revenue - p.cost;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.code}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.quantity} uds</td>
                      <td style={{ textAlign: 'right', color: 'hsl(var(--primary))', fontWeight: 700 }}>{formatCurrency(p.revenue)}</td>
                      <td style={{ textAlign: 'right', color: 'hsl(var(--success))', fontWeight: 700 }}>{formatCurrency(gain)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tabla de Productos con Menor Rotación */}
        <div className={styles.tableCard}>
          <h3 className={styles.tableTitle} style={{ color: 'hsl(var(--warning))' }}>📉 Productos con Menor Rotación (Menos Vendidos 30d)</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th style={{ textAlign: 'right' }}>Stock Actual</th>
                <th style={{ textAlign: 'right' }}>Uds. Vendidas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {slowProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay catálogo cargado.</td>
                </tr>
              ) : (
                slowProducts.map((p) => {
                  const isZero = p.quantitySold === 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.code}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.stock} uds</td>
                      <td style={{ textAlign: 'right', color: isZero ? 'hsl(var(--destructive))' : 'inherit' }}>{p.quantitySold} uds</td>
                      <td>
                        <span 
                          style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: isZero ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--warning) / 0.1)',
                            color: isZero ? 'hsl(var(--destructive))' : 'hsl(var(--warning))'
                          }}
                        >
                          {isZero ? 'Sin ventas' : 'Baja rotación'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
