'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, normalizeText } from '@/lib/utils';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import styles from './sales.module.css';
import { generateTicketPDF } from '@/lib/pdf';

interface Product {
  id: string;
  code: string;
  name: string;
  salePrice: number;
  stock: number;
}

interface Client {
  id: string;
  name: string;
  cuitCuil: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface RecentSale {
  id: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  client?: { name: string } | null;
  user: { name: string };
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);

  // Configuración de negocio y ticketera
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // Carro y Venta
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'DEBT'>('CASH');

  // Buscador de productos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  // Modal rápido Cliente
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCuit, setNewClientCuit] = useState('');

  const loadData = async () => {
    try {
      // 1. Cargar productos
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }

      // 2. Cargar clientes
      const clientRes = await fetch('/api/clients');
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClients(clientData.clients || []);
      }

      // 3. Cargar ventas recientes
      const salesRes = await fetch('/api/sales');
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setRecentSales(salesData.sales || []);
      }

      // 4. Cargar configuración de negocio
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setTenantConfig(configData.tenant);
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión al cargar catálogos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Buscador reactivo
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = normalizeText(searchQuery);
    const filtered = products.filter(
      (p) => normalizeText(p.name).includes(query) || normalizeText(p.code).includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, products]);

  // Agregar al carro por código directo (Ej: Pistola lectora de códigos)
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const match = products.find(p => normalizeText(p.code) === normalizeText(searchQuery.trim()));
      if (match) {
        addToCart(match);
        setSearchQuery('');
      } else if (searchResults.length > 0) {
        addToCart(searchResults[0]);
        setSearchQuery('');
      } else {
        setAlert({ type: 'warning', msg: `No se encontró ningún producto con el código "${searchQuery}"` });
      }
    }
  };

  const addToCart = (product: Product) => {
    setAlert(null);
    const allowNegative = tenantConfig?.allowNegativeStock === true;

    if (product.stock <= 0) {
      if (!allowNegative) {
        setAlert({ type: 'warning', msg: `"${product.name}" no tiene stock disponible.` });
        return;
      } else {
        setAlert({ type: 'warning', msg: `"${product.name}" no tiene stock disponible (venta con stock negativo).` });
      }
    }

    const existingIdx = cart.findIndex((item) => item.product.id === product.id);

    if (existingIdx !== -1) {
      const newQty = cart[existingIdx].quantity + 1;
      if (newQty > product.stock) {
        if (!allowNegative) {
          setAlert({ type: 'warning', msg: `Stock insuficiente. Límite alcanzado (${product.stock} uds).` });
          return;
        } else {
          setAlert({ type: 'warning', msg: `Venta supera el stock disponible (${product.stock} uds).` });
        }
      }
      const newCart = [...cart];
      newCart[existingIdx].quantity = newQty;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const updateQuantity = (productId: string, increment: boolean) => {
    setAlert(null);
    const idx = cart.findIndex((item) => item.product.id === productId);
    if (idx === -1) return;

    const currentQty = cart[idx].quantity;
    const stock = cart[idx].product.stock;
    const allowNegative = tenantConfig?.allowNegativeStock === true;

    if (increment) {
      if (currentQty + 1 > stock) {
        if (!allowNegative) {
          setAlert({ type: 'warning', msg: `Stock máximo alcanzado (${stock} uds).` });
          return;
        } else {
          setAlert({ type: 'warning', msg: `Venta supera el stock disponible (${stock} uds).` });
        }
      }
      const newCart = [...cart];
      newCart[idx].quantity += 1;
      setCart(newCart);
    } else {
      if (currentQty - 1 <= 0) {
        removeFromCart(productId);
      } else {
        const newCart = [...cart];
        newCart[idx].quantity -= 1;
        setCart(newCart);
      }
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Cálculos de importes
  const subtotal = cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  const total = subtotal;
  const taxRate = (tenantConfig?.taxPercentage !== undefined ? tenantConfig.taxPercentage : 21.0) / 100;
  const tax = total - (total / (1 + taxRate));

  const handleRegisterSale = async () => {
    if (cart.length === 0) {
      setAlert({ type: 'warning', msg: 'Agregá al menos un producto al ticket' });
      return;
    }

    if (paymentMethod === 'DEBT' && !selectedClientId) {
      setAlert({ type: 'warning', msg: 'Debe seleccionar un cliente registrado para realizar una venta al fiado (cuenta corriente).' });
      return;
    }

    setAlert(null);

    const payload = {
      clientId: selectedClientId || null,
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        // Enlazar datos de productos y clientes completos para el Ticket PDF local
        const fullClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
        const fullItems = cart.map(item => ({
          product: { name: item.product.name, code: item.product.code },
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
          subtotal: item.product.salePrice * item.quantity
        }));

        setLastSaleData({
          ...data.sale,
          client: fullClient,
          items: fullItems
        });
        setSuccessModalOpen(true);
        setCart([]);
        setSelectedClientId('');
        setPaymentMethod('CASH');
        loadData(); // Recargar stock y ventas
      } else {
        setAlert({ type: 'error', msg: data.error || 'Ocurrió un error al registrar la venta' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de red al registrar venta' });
    }
  };

  // Crear cliente rápido desde el mostrador
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingClient) return;
    setSubmittingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
          cuitCuil: newClientCuit,
        }),
      });

      const data = await res.json();

      if (res.ok && data.client) {
        setClients([...clients, data.client]);
        setSelectedClientId(data.client.id);
        setClientModalOpen(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientCuit('');
        setAlert({ type: 'success', msg: 'Cliente creado y seleccionado' });
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al crear cliente' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al conectar' });
    } finally {
      setSubmittingClient(false);
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'CASH': return '💵 Efectivo';
      case 'DEBIT': return '💳 Débito';
      case 'CREDIT': return '💳 Crédito';
      case 'TRANSFER': return '📲 Transf. / QR';
      case 'DEBT': return '🤝 Fiado / Cta. Corriente';
      default: return method;
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Punto de Venta Mostrador (POS)</h2>

      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.msg} 
          onClose={() => setAlert(null)} 
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando terminal POS...</div>
      ) : (
        <div className={styles.posContainer}>
          {/* Columna Izquierda: Ticket y Productos */}
          <div className={styles.ticketCard}>
            <div className={styles.searchSection}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.35rem' }}>
                🔍 Buscar producto o escanear código de barras (Enter para agregar)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Escribí nombre del producto, marca o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
              
              {/* Resultados flotantes */}
              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((p) => (
                    <div key={p.id} onClick={() => addToCart(p)} className={styles.searchResultItem}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>SKU: {p.code}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{formatCurrency(p.salePrice)}</div>
                        <div style={{ fontSize: '0.75rem', color: p.stock <= 3 ? 'red' : 'green' }}>Stock: {p.stock} uds</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listado de ítems agregados */}
            <div className={styles.cartList}>
              <h4 style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                Ticket de Venta ({cart.length} productos)
              </h4>
              {cart.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'hsl(var(--muted-foreground))', padding: '3rem 0' }}>
                  <span style={{ fontSize: '2rem' }}>🛒</span>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Buscá o escaneá productos para vender.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <span className={styles.cartItemName}>{item.product.name}</span>
                      <span className={styles.cartItemPrice}>Unit: {formatCurrency(item.product.salePrice)}</span>
                    </div>

                    <div className={styles.cartItemActions}>
                      <button onClick={() => updateQuantity(item.product.id, false)} className={styles.qtyBtn}>-</button>
                      <span className={styles.qtyValue}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, true)} className={styles.qtyBtn}>+</button>
                      
                      <span style={{ fontWeight: 700, minWidth: '80px', textAlign: 'right', fontSize: '0.875rem' }}>
                        {formatCurrency(item.product.salePrice * item.quantity)}
                      </span>

                      <button onClick={() => removeFromCart(item.product.id)} className={styles.removeBtn} title="Remover">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selección de Cliente */}
            <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>Cliente Asociado (Opcional)</label>
                <select
                  className="form-input"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Consumidor Final (Sin nombre)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.cuitCuil ? `(${c.cuitCuil})` : ''}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setClientModalOpen(true)} 
                className="btn btn-secondary" 
                style={{ padding: '0.7rem' }}
                title="Crear cliente rápido"
              >
                + Cliente
              </button>
            </div>
          </div>

          {/* Columna Derecha: Resumen de cobro y Ventas recientes */}
          <div>
            <div className={styles.checkoutPanel}>
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 800 }}>Resumen del Pago</h3>
              
              <div className={styles.summaryRow}>
                <span>Subtotal Neto</span>
                <span>{formatCurrency(total - tax)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>
                  {tenantConfig?.taxPercentage === 0
                    ? 'Sin Impuestos (IVA 0% incl.)'
                    : `Impuesto (IVA ${tenantConfig?.taxPercentage !== undefined ? tenantConfig.taxPercentage : 21.0}% incl.)`}
                </span>
                <span>{formatCurrency(tax)}</span>
              </div>
              
              <div className={styles.summaryTotal}>
                <span>Total a Cobrar</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
                Método de Pago
              </h4>
              
              <div className={styles.paymentGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                <div 
                  onClick={() => setPaymentMethod('CASH')}
                  className={`${styles.paymentOption} ${paymentMethod === 'CASH' ? styles.paymentActive : ''}`}
                >
                  <span className={styles.paymentIcon}>💵</span>
                  <span>Efectivo</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('DEBIT')}
                  className={`${styles.paymentOption} ${paymentMethod === 'DEBIT' ? styles.paymentActive : ''}`}
                >
                  <span className={styles.paymentIcon}>💳</span>
                  <span>Débito</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`${styles.paymentOption} ${paymentMethod === 'CREDIT' ? styles.paymentActive : ''}`}
                >
                  <span className={styles.paymentIcon}>💳</span>
                  <span>Crédito</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`${styles.paymentOption} ${paymentMethod === 'TRANSFER' ? styles.paymentActive : ''}`}
                >
                  <span className={styles.paymentIcon}>📲</span>
                  <span>QR / Transf.</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('DEBT')}
                  className={`${styles.paymentOption} ${paymentMethod === 'DEBT' ? styles.paymentActive : ''}`}
                >
                  <span className={styles.paymentIcon}>🤝</span>
                  <span>Fiado / Cta Cte</span>
                </div>
              </div>

              <button 
                onClick={handleRegisterSale} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                disabled={cart.length === 0}
              >
                💸 Registrar y Finalizar Venta
              </button>
            </div>

            {/* Ultimas Ventas de Caja */}
            <div className={styles.checkoutPanel} style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Últimos Tickets de Caja</h4>
              <div className={styles.recentSalesList}>
                {recentSales.length === 0 ? (
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>No hay ventas previas.</div>
                ) : (
                  recentSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className={styles.recentSaleItem}>
                      <div>
                        <div style={{ fontWeight: 700 }}>Ticket #{sale.id.substring(0, 8).toUpperCase()}</div>
                        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem' }}>
                          Por: {sale.user.name} • {new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {sale.client && (
                          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))' }}>Cliente: {sale.client.name}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{formatCurrency(sale.totalAmount)}</div>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{getPaymentLabel(sale.paymentMethod)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Cliente Rápido */}
      <Modal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title="Agregar Cliente Rápido"
      >
        <form onSubmit={handleQuickClientSubmit}>
          <div className="form-group">
            <label htmlFor="cliName">Nombre del Cliente</label>
            <input
              id="cliName"
              type="text"
              className="form-input"
              required
              placeholder="Ej. María González"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cliPhone">Teléfono de contacto</label>
            <input
              id="cliPhone"
              type="text"
              className="form-input"
              placeholder="Ej. 11 5422 1234"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cliCuit">CUIT o CUIL (Opcional)</label>
            <input
              id="cliCuit"
              type="text"
              className="form-input"
              placeholder="Ej. 27-32987123-4"
              value={newClientCuit}
              onChange={(e) => setNewClientCuit(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setClientModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={submittingClient}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingClient}>
              {submittingClient ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Venta Exitosa y Ticket */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="🎉 ¡Venta Registrada con Éxito!"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>
            La venta se ha guardado correctamente en la caja del comercio.
          </p>
          {lastSaleData && (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Nro. Venta:</span>
                <span style={{ fontWeight: 'bold' }}>#{lastSaleData.id?.substring(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Total:</span>
                <span style={{ fontWeight: 'bold', color: 'hsl(var(--success))' }}>{formatCurrency(lastSaleData.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Medio de Pago:</span>
                <span style={{ fontWeight: 'bold' }}>{getPaymentLabel(lastSaleData.paymentMethod)}</span>
              </div>
              {lastSaleData.client && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Cliente:</span>
                  <span style={{ fontWeight: 'bold' }}>{lastSaleData.client.name}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => {
                if (lastSaleData) {
                  generateTicketPDF(lastSaleData, tenantConfig);
                }
              }} 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '0.75rem' }}
            >
              📄 Descargar Ticket PDF
            </button>
            <button 
              onClick={() => setSuccessModalOpen(false)} 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '0.75rem' }}
            >
              Nueva Venta
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
