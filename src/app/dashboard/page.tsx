'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import styles from './dashboard.module.css';

interface DashboardData {
  summary: {
    todaySales: number;
    todaySalesCount: number;
    weekSales: number;
    weekSalesCount: number;
    monthSales: number;
    lowStockCount: number;
    todayProfit: number;
    weekProfit: number;
    estimatedProfit30Days: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    code: string;
    stock: number;
    minStock: number;
  }>;
  salesHistory: Array<{
    date: string;
    total: number;
  }>;
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/reports?dashboard=true');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching dashboard reports', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
          Cargando panel de control...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.sectionCard}>
        <h3>Ocurrió un problema al cargar los datos del dashboard.</h3>
      </div>
    );
  }

  const { summary, topProducts, lowStockProducts, salesHistory } = data;

  // Renderizador de Gráfico SVG Dinámico
  const renderSvgChart = () => {
    if (!salesHistory || salesHistory.length === 0) return null;

    const width = 500;
    const height = 200;
    const padding = 30;
    
    const maxVal = Math.max(...salesHistory.map(h => h.total), 1000) * 1.15; // 15% margen superior
    
    // Generar coordenadas X e Y para cada punto
    const points = salesHistory.map((item, idx) => {
      const x = padding + (idx * (width - padding * 2) / (salesHistory.length - 1));
      const y = height - padding - (item.total * (height - padding * 2) / maxVal);
      return { x, y, label: item.date, val: item.total };
    });

    // Crear string de ruta para la línea principal
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Crear string de ruta para el área sombreada bajo la línea
    const areaPath = `
      ${linePath} 
      L ${points[points.length - 1].x} ${height - padding} 
      L ${points[0].x} ${height - padding} 
      Z
    `;

    return (
      <svg className={styles.svgChart} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Líneas de cuadrícula horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * (height - padding * 2);
          const val = maxVal * (1 - ratio);
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={y} 
                x2={width - padding} 
                y2={y} 
                stroke="hsl(var(--border))" 
                strokeWidth="1" 
                strokeDasharray="4,4" 
              />
              <text 
                x={padding - 5} 
                y={y + 4} 
                textAnchor="end" 
                fontSize="8" 
                fill="hsl(var(--muted-foreground))"
              >
                {formatCurrency(val).replace(',00', '')}
              </text>
            </g>
          );
        })}

        {/* Área rellena bajo la curva */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Línea de tendencia */}
        <path 
          d={linePath} 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="3" 
          strokeLinecap="round"
          strokeLinejoin="round" 
        />

        {/* Círculos para cada punto de datos */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="4" 
              fill="hsl(var(--card))" 
              stroke="hsl(var(--primary))" 
              strokeWidth="2.5" 
            />
            {/* Texto de fecha del eje X */}
            <text 
              x={p.x} 
              y={height - 10} 
              textAnchor="middle" 
              fontSize="9" 
              fontWeight="600"
              fill="hsl(var(--muted-foreground))"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Resumen del Comercio</h2>

      {/* Sección 1: Facturación y Alertas */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', opacity: 0.85 }}>📊 Facturación y Operaciones</h3>
      <div className={styles.gridMetrics} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ventas de Hoy</span>
            <span className={styles.metricIcon}>💰</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(summary.todaySales)}</div>
          <span className={styles.metricSubtext}>{summary.todaySalesCount} tickets emitidos hoy</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ventas de la Semana</span>
            <span className={styles.metricIcon}>📅</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(summary.weekSales)}</div>
          <span className={styles.metricSubtext}>{summary.weekSalesCount} ventas últimos 7 días</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ventas del Mes</span>
            <span className={styles.metricIcon}>📈</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(summary.monthSales)}</div>
          <span className={styles.metricSubtext}>Acumulado del mes actual</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Alertas de Reposición</span>
            <span className={styles.metricIcon}>⚠️</span>
          </div>
          <div className={styles.metricValue} style={{ color: summary.lowStockCount > 0 ? 'hsl(var(--destructive))' : 'inherit' }}>
            {summary.lowStockCount}
          </div>
          <span className={styles.metricSubtext}>Productos con bajo stock</span>
        </div>
      </div>

      {/* Sección 2: Ganancias Estimadas Netas */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', opacity: 0.85 }}>💵 Rentabilidad y Ganancia Estimada</h3>
      <div className={styles.gridMetrics} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <div className={styles.metricCard} style={{ borderLeft: '4px solid hsl(var(--success))' }}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ganancia de Hoy</span>
            <span className={styles.metricIcon}>💵</span>
          </div>
          <div className={styles.metricValue} style={{ color: 'hsl(var(--success))' }}>
            {formatCurrency(summary.todayProfit)}
          </div>
          <span className={styles.metricSubtext}>Neto estimado de hoy</span>
        </div>

        <div className={styles.metricCard} style={{ borderLeft: '4px solid hsl(var(--success))' }}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ganancia Semanal</span>
            <span className={styles.metricIcon}>💸</span>
          </div>
          <div className={styles.metricValue} style={{ color: 'hsl(var(--success))' }}>
            {formatCurrency(summary.weekProfit)}
          </div>
          <span className={styles.metricSubtext}>Neto últimos 7 días</span>
        </div>

        <div className={styles.metricCard} style={{ borderLeft: '4px solid hsl(var(--success))' }}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ganancia Mensual (30d)</span>
            <span className={styles.metricIcon}>🏛️</span>
          </div>
          <div className={styles.metricValue} style={{ color: 'hsl(var(--success))' }}>
            {formatCurrency(summary.estimatedProfit30Days)}
          </div>
          <span className={styles.metricSubtext}>Neto últimos 30 días</span>
        </div>
      </div>

      {/* Contenido Secundario */}
      <div className={styles.gridContent}>
        {/* Gráfico de Ventas de la Semana */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <span>📊</span> Ventas de los últimos 7 días
          </h3>
          <div className={styles.chartContainer}>
            {renderSvgChart()}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <span>⭐</span> Más Vendidos (30d)
          </h3>
          <div className={styles.list}>
            {topProducts.length === 0 ? (
              <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>No hay ventas registradas aún.</div>
            ) : (
              topProducts.map((p, i) => (
                <div key={p.id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemSub}>{p.code}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.itemName}>{p.quantity} uds.</div>
                    <div className={styles.itemSub}>{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fila de Alertas de Bajo Stock */}
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle} style={{ color: 'hsl(var(--destructive))' }}>
          <span>🚨</span> Alertas Automáticas de Stock
        </h3>
        {lowStockProducts.length === 0 ? (
          <div style={{ color: 'hsl(var(--success))', fontWeight: 600, fontSize: '0.875rem' }}>
            ✓ ¡Todo excelente! Todos los productos están por encima de su stock mínimo.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {lowStockProducts.map((p) => (
              <div key={p.id} className={styles.listItem} style={{ borderColor: 'hsl(var(--destructive) / 0.3)' }}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{p.name}</span>
                  <span className={styles.itemSub}>Código: {p.code}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`${styles.itemBadge} ${styles.badgeDanger}`}>
                    Stock: {p.stock}
                  </span>
                  <div className={styles.itemSub} style={{ marginTop: '0.2rem' }}>Min: {p.minStock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
