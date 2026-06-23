'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, normalizeText } from '@/lib/utils';
import styles from '../inventory/inventory.module.css';

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
  saleId: string | null;
}

export default function AccountsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  // Modales
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Cliente Seleccionado
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  
  // Datos del historial
  const [movements, setMovements] = useState<Movement[]>([]);
  const [clientBalance, setClientBalance] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Formulario Pago
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Cargar todos los clientes
      const clientsRes = await fetch('/api/clients');
      if (!clientsRes.ok) throw new Error('Error al cargar clientes');
      const clientsData = await clientsRes.json();
      setClients(clientsData.clients || []);

      // 2. Cargar balances consolidados
      const balancesRes = await fetch('/api/account-movements');
      if (!balancesRes.ok) throw new Error('Error al cargar balances');
      const balancesData = await balancesRes.json();
      setBalances(balancesData.balances || {});
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openHistory = async (client: Client) => {
    setActiveClient(client);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/account-movements?clientId=${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setClientBalance(data.balance || 0);
      }
    } catch (err) {
      console.error('Error cargando historial de cuenta', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openPayment = (client: Client) => {
    setActiveClient(client);
    setPayAmount('');
    setPayNote('Pago a cuenta');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    
    setAlert(null);
    setSavingPayment(true);

    try {
      const res = await fetch('/api/account-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeClient.id,
          type: 'PAYMENT',
          amount: Number(payAmount),
          note: payNote,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: `Pago de ${formatCurrency(Number(payAmount))} registrado para ${activeClient.name}` });
        setPaymentModalOpen(false);
        loadData();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al registrar pago' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de red' });
    } finally {
      setSavingPayment(false);
    }
  };

  // Filtrado de clientes
  const filteredClients = clients.filter((c) => {
    const nameMatch = normalizeText(c.name).includes(normalizeText(search));
    const balance = balances[c.id] || 0;
    const isDebtor = balance > 0;
    
    if (onlyDebtors) {
      return nameMatch && isDebtor;
    }
    return nameMatch;
  });

  const handlePrint = (clientId: string) => {
    // Abrir una ventana limpia optimizada para impresión
    window.open(`/dashboard/accounts/print?clientId=${clientId}`, '_blank');
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Cuentas Corrientes y Fiado</h2>

      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.msg} 
          onClose={() => setAlert(null)} 
        />
      )}

      {/* Barra de Acciones */}
      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar cliente por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'white' }}>
            <input 
              type="checkbox" 
              checked={onlyDebtors} 
              onChange={(e) => setOnlyDebtors(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Solo clientes con deuda activa
          </label>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando saldos...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>{error}</div>
      ) : filteredClients.length === 0 ? (
        <div className={styles.tableWrapper} style={{ padding: '3rem', textAlign: 'center', color: 'white' }}>
          No se encontraron clientes con los filtros aplicados.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CUIT / CUIL</th>
                <th>Teléfono</th>
                <th>Saldo de Cuenta</th>
                <th style={{ textAlign: 'center' }}>Acciones de Cobro</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => {
                const balance = balances[c.id] || 0;
                let balanceColor = 'inherit';
                let balanceText = formatCurrency(0);

                if (balance > 0) {
                  balanceColor = 'hsl(var(--destructive))';
                  balanceText = `${formatCurrency(balance)} (Debe)`;
                } else if (balance < 0) {
                  balanceColor = 'hsl(var(--success))';
                  balanceText = `${formatCurrency(Math.abs(balance))} (A favor)`;
                }

                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.cuitCuil || 'Consumidor Final'}</td>
                    <td>{c.phone || '-'}</td>
                    <td style={{ fontWeight: 700, color: balanceColor }}>
                      {balanceText}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => openPayment(c)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          💸 Recibir Pago
                        </button>
                        <button 
                          onClick={() => openHistory(c)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          📊 Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Historial / Estado de Cuenta */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={activeClient ? `Estado de Cuenta - ${activeClient.name}` : 'Historial de Cuenta'}
      >
        {loadingHistory ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial de movimientos...</div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Saldo Neto Actual:</span>
                <h3 style={{ color: clientBalance > 0 ? 'hsl(var(--destructive))' : clientBalance < 0 ? 'hsl(var(--success))' : 'white', fontWeight: 800 }}>
                  {clientBalance > 0 ? `${formatCurrency(clientBalance)} (Debe)` : clientBalance < 0 ? `${formatCurrency(Math.abs(clientBalance))} (A favor)` : formatCurrency(0)}
                </h3>
              </div>
              <button 
                onClick={() => activeClient && handlePrint(activeClient.id)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                🖨️ Imprimir Estado
              </button>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid hsl(var(--border))' }}>
                    <th style={{ padding: '0.75rem' }}>Fecha</th>
                    <th style={{ padding: '0.75rem' }}>Detalle</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Debe (+)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Haber (-)</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                        No hay movimientos registrados para este cliente.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>{formatDate(m.createdAt).split(' ')[0]}</td>
                        <td style={{ padding: '0.75rem' }}>{m.note}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: m.type === 'DEBT' ? 'hsl(var(--destructive))' : 'inherit' }}>
                          {m.type === 'DEBT' ? formatCurrency(m.amount) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: m.type === 'PAYMENT' ? 'hsl(var(--success))' : 'inherit' }}>
                          {m.type === 'PAYMENT' ? formatCurrency(m.amount) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setHistoryModalOpen(false)} className="btn btn-secondary" style={{ width: '100%' }}>
              Cerrar Ventana
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Pago */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={activeClient ? `Registrar Pago a Cuenta - ${activeClient.name}` : 'Registrar Pago'}
      >
        <form onSubmit={handlePaymentSubmit}>
          <div className="form-group">
            <label htmlFor="payMonto">Monto a Cobrar ($)</label>
            <input
              id="payMonto"
              type="number"
              className="form-input"
              step="0.01"
              required
              min="0.01"
              placeholder="Ej. 1500"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              disabled={savingPayment}
            />
          </div>

          <div className="form-group">
            <label htmlFor="payDetalle">Comentario / Detalle de Pago</label>
            <input
              id="payDetalle"
              type="text"
              className="form-input"
              required
              placeholder="Ej. Pago efectivo en mostrador"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              disabled={savingPayment}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              type="button" 
              onClick={() => setPaymentModalOpen(false)} 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              disabled={savingPayment}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={savingPayment}
            >
              {savingPayment ? 'Registrando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
