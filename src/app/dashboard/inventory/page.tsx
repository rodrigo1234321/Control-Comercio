'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import styles from './inventory.module.css';
import { exportToExcel } from '@/lib/excel';

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  category?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  createdAt: string;
  product: { name: string; code: string };
  user: { name: string };
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Rol del usuario
  const [userRole, setUserRole] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modales
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  // Formulario Producto
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodCost, setProdCost] = useState(0);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodMin, setProdMin] = useState(5);

  // Formulario Movimiento de Stock
  const [moveProdId, setMoveProdId] = useState('');
  const [moveType, setMoveType] = useState<'IN' | 'OUT'>('IN');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');

  // Historial de movimientos
  const [movementsHistory, setMovementsHistory] = useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Formulario Nueva Categoría
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Carga Masiva (Excel)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Código': '7791234567890',
        'Nombre': 'Gaseosa Cola 1.5L',
        'Descripción': 'Bebida azucarada envase no retornable',
        'Categoría': 'Bebidas',
        'Precio Compra': 800,
        'Precio Venta': 1200,
        'Stock': 24,
        'Stock Mínimo': 6
      },
      {
        'Código': '7790987654321',
        'Nombre': 'Tornillo Cab. Madera 2 Pulgadas',
        'Descripción': 'Paquete por 50 unidades',
        'Categoría': 'Ferretería',
        'Precio Compra': 1500,
        'Precio Venta': 2200,
        'Stock': 10,
        'Stock Mínimo': 2
      }
    ];
    exportToExcel(templateData, 'plantilla-productos-controlcomercio', 'Plantilla');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setAlert(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          setAlert({ type: 'error', msg: 'El archivo Excel está vacío o es inválido.' });
          setImporting(false);
          return;
        }

        const mappedProducts = json.map((row) => {
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(
                (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
              );
              if (foundKey) return row[foundKey];
            }
            return null;
          };

          const code = String(getVal(['código', 'codigo', 'sku', 'código de barras', 'barcode', 'code', 'SKU/Código']) || '').trim();
          const name = String(getVal(['nombre', 'producto', 'name', 'articulo', 'artículo']) || '').trim();
          const description = getVal(['descripción', 'descripcion', 'description', 'detalle']) ? String(getVal(['descripción', 'descripcion', 'description', 'detalle'])) : null;
          const categoryName = getVal(['categoría', 'categoria', 'category']) ? String(getVal(['categoría', 'categoria', 'category'])) : null;
          const purchasePrice = Number(getVal(['costo', 'compra', 'precio compra', 'precio de compra', 'purchaseprice', 'purchase price', 'Precio Compra']) || 0);
          const salePrice = Number(getVal(['precio', 'venta', 'precio venta', 'precio de venta', 'saleprice', 'sale price', 'Precio Venta']) || 0);
          const stock = Number(getVal(['stock', 'cantidad', 'stock actual', 'qty', 'quantity', 'Stock']) || 0);
          const minStock = Number(getVal(['stock mínimo', 'minimo', 'min stock', 'stock minimo', 'Stock Mínimo']) || 5);

          return { code, name, description, categoryName, purchasePrice, salePrice, stock, minStock };
        });

        const invalidRows = mappedProducts.filter(p => !p.code || !p.name);
        if (invalidRows.length > 0) {
          setAlert({ type: 'error', msg: 'Error: El Excel contiene filas que no tienen "Código" o "Nombre" válidos.' });
          setImporting(false);
          return;
        }

        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedProducts),
        });

        const data = await res.json();

        if (res.ok) {
          setAlert({ type: 'success', msg: data.message || 'Productos importados con éxito.' });
          setImportModalOpen(false);
          fetchInventory();
        } else {
          setAlert({ type: 'error', msg: data.error || 'Error al procesar la importación masiva.' });
        }
      } catch (err) {
        console.error(err);
        setAlert({ type: 'error', msg: 'Error al procesar la importación del Excel. Verifica su formato.' });
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    // Obtener rol del usuario desde /api/auth/me
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUserRole(data?.role || null))
      .catch(() => setUserRole(null));
  }, []);

  const handleExportExcel = () => {
    const dataToExport = products.map((p) => ({
      'Código de Barras / SKU': p.code,
      'Nombre del Producto': p.name,
      'Categoría': p.category?.name || 'Sin Categoría',
      'Precio Compra (Costo)': p.purchasePrice,
      'Precio Venta': p.salePrice,
      'Stock Actual': p.stock,
      'Stock Mínimo': p.minStock,
      'Descripción': p.description || '',
    }));
    exportToExcel(dataToExport, `inventario-${new Date().toISOString().split('T')[0]}`, 'Inventario');
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}&categoryId=${categoryFilter}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      } else {
        setError('Error al cargar inventario');
      }
    } catch (err) {
      setError('Error al comunicar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search, categoryFilter]);

  const openAddProduct = () => {
    setSelectedProd(null);
    setProdCode('');
    setProdName('');
    setProdDesc('');
    setProdCat(categories[0]?.id || '');
    setProdCost(0);
    setProdPrice(0);
    setProdStock(0);
    setProdMin(5);
    setProdModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setSelectedProd(p);
    setProdCode(p.code);
    setProdName(p.name);
    setProdDesc(p.description || '');
    setProdCat(p.categoryId || '');
    setProdCost(p.purchasePrice);
    setProdPrice(p.salePrice);
    setProdStock(p.stock);
    setProdMin(p.minStock);
    setProdModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const isEdit = !!selectedProd;
    const url = isEdit ? `/api/products/${selectedProd.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      code: prodCode,
      name: prodName,
      description: prodDesc,
      categoryId: prodCat || null,
      purchasePrice: Number(prodCost),
      salePrice: Number(prodPrice),
      stock: Number(prodStock),
      minStock: Number(prodMin),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: isEdit ? 'Producto modificado con éxito' : 'Producto creado con éxito' });
        setProdModalOpen(false);
        fetchInventory();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Ocurrió un error al guardar' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    setAlert(null);

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: 'Producto eliminado con éxito' });
        fetchInventory();
      } else {
        setAlert({ type: 'error', msg: data.error || 'No se pudo eliminar el producto' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al conectar' });
    }
  };

  const openStockAdjustment = (p?: Product) => {
    setMoveProdId(p?.id || products[0]?.id || '');
    setMoveType('IN');
    setMoveQty(1);
    setMoveReason('');
    setStockModalOpen(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const payload = {
      productId: moveProdId,
      type: moveType,
      quantity: Number(moveQty),
      reason: moveReason,
    };

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: 'Ajuste de stock registrado' });
        setStockModalOpen(false);
        fetchInventory();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al ajustar stock' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al conectar' });
    }
  };

  const openHistory = async () => {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setMovementsHistory(data.movements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Gestión de Inventario y Stock</h2>

      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.msg} 
          onClose={() => setAlert(null)} 
        />
      )}

      {/* Barra de Acciones y Filtros */}
      <div className={styles.actionsBar}>
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.selectInput}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportExcel} className="btn btn-secondary">
            📤 Exportar Excel
          </button>
          {userRole === 'ADMIN' && (
            <button onClick={() => setImportModalOpen(true)} className="btn btn-secondary">
              📥 Importar Excel
            </button>
          )}
          <button onClick={openHistory} className="btn btn-secondary">
            📋 Ver Historial Stock
          </button>
          <button onClick={() => openStockAdjustment()} className="btn btn-secondary">
            🔄 Entrada/Salida
          </button>
          {userRole === 'ADMIN' && (
            <button onClick={() => { setCatName(''); setCatDesc(''); setCatModalOpen(true); }} className="btn btn-secondary">
              🏷️ + Categoría
            </button>
          )}
          <button onClick={openAddProduct} className="btn btn-primary">
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tabla de Productos */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando inventario...</div>
      ) : products.length === 0 ? (
        <div className={styles.tableWrapper} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
          No se encontraron productos en el inventario.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio Compra</th>
                <th>Precio Venta</th>
                <th>Stock</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.codeBadge}>{p.code}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category?.name || 'Sin Categoría'}</td>
                    <td>{formatCurrency(p.purchasePrice)}</td>
                    <td style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>
                      {formatCurrency(p.salePrice)}
                    </td>
                    <td>
                      <span className={`${styles.stockBadge} ${isLow ? styles.stockLow : styles.stockOk}`}>
                        {p.stock} uds {isLow ? '(Bajo)' : ''}
                      </span>
                    </td>
                    <td style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className={styles.actionButtons}>
                        <button 
                          onClick={() => openStockAdjustment(p)} 
                          className={`${styles.iconBtn} ${styles.stockLogBtn}`} 
                          title="Ajustar Stock"
                        >
                          🔄
                        </button>
                        <button 
                          onClick={() => openEditProduct(p)} 
                          className={`${styles.iconBtn} ${styles.editBtn}`} 
                          title="Editar Producto"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)} 
                          className={`${styles.iconBtn} ${styles.deleteBtn}`} 
                          title="Eliminar Producto"
                        >
                          🗑️
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

      {/* Modal Agregar / Editar Producto */}
      <Modal
        isOpen={prodModalOpen}
        onClose={() => setProdModalOpen(false)}
        title={selectedProd ? 'Modificar Producto' : 'Crear Nuevo Producto'}
      >
        <form onSubmit={handleProductSubmit}>
          <div className="form-group">
            <label htmlFor="code">Código de Barras / SKU</label>
            <input
              id="code"
              type="text"
              className="form-input"
              required
              value={prodCode}
              onChange={(e) => setProdCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre del Producto</label>
            <input
              id="name"
              type="text"
              className="form-input"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="desc">Descripción (Opcional)</label>
            <textarea
              id="desc"
              className="form-input"
              rows={2}
              style={{ resize: 'none' }}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              className="form-input"
              value={prodCat}
              onChange={(e) => setProdCat(e.target.value)}
            >
              <option value="">Seleccione Categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="cost">Precio Compra (Costo)</label>
              <input
                id="cost"
                type="number"
                step="0.01"
                className="form-input"
                required
                value={prodCost}
                onChange={(e) => setProdCost(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="price">Precio Venta (Público)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                className="form-input"
                required
                value={prodPrice}
                onChange={(e) => setProdPrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="stock">Stock Actual</label>
              <input
                id="stock"
                type="number"
                className="form-input"
                required
                disabled={!!selectedProd} // Deshabilitar stock en edición para forzar entrada/salida de stock
                value={prodStock}
                onChange={(e) => setProdStock(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="minStock">Stock Mínimo Alerta</label>
              <input
                id="minStock"
                type="number"
                className="form-input"
                required
                value={prodMin}
                onChange={(e) => setProdMin(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setProdModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {selectedProd ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Entrada / Salida Stock */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Ajuste de Stock Manual"
      >
        <form onSubmit={handleStockSubmit}>
          <div className="form-group">
            <label htmlFor="stockProd">Producto</label>
            <select
              id="stockProd"
              className="form-input"
              value={moveProdId}
              onChange={(e) => setMoveProdId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="moveType">Tipo de Movimiento</label>
            <select
              id="moveType"
              className="form-input"
              value={moveType}
              onChange={(e) => setMoveType(e.target.value as 'IN' | 'OUT')}
            >
              <option value="IN">Entrada (+) Ingreso mercadería</option>
              <option value="OUT">Salida (-) Retiro / Pérdida</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="moveQty">Cantidad</label>
            <input
              id="moveQty"
              type="number"
              min="1"
              className="form-input"
              required
              value={moveQty}
              onChange={(e) => setMoveQty(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="moveReason">Motivo / Explicación</label>
            <input
              id="moveReason"
              type="text"
              className="form-input"
              placeholder="Ej. Compra a proveedor, mercadería vencida, rotura"
              required
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setStockModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Registrar Movimiento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial de Movimientos de Stock */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Historial de Auditoría de Stock"
      >
        {loadingHistory ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando auditoría...</div>
        ) : movementsHistory.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
            No hay movimientos registrados.
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {movementsHistory.map((m) => {
              const isEntry = m.type === 'IN';
              return (
                <div 
                  key={m.id} 
                  style={{
                    padding: '0.85rem',
                    borderBottom: '1px solid hsl(var(--border))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.product?.name || 'Producto Eliminado'}</div>
                    <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
                      Cód: {m.product?.code} • {m.reason}
                    </div>
                    <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Por: {m.user?.name || 'Sistema'} el {new Date(m.createdAt).toLocaleString('es-AR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span 
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 800,
                        backgroundColor: isEntry ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
                        color: isEntry ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                      }}
                    >
                      {isEntry ? '+' : '-'}{m.quantity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button 
          onClick={() => setHistoryModalOpen(false)} 
          className="btn btn-secondary" 
          style={{ width: '100%', marginTop: '1.5rem' }}
        >
          Cerrar Historial
        </button>
      </Modal>

      {/* Modal Nueva Categoría — Solo Admins */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="🏷️ Nueva Categoría de Productos"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          setAlert(null);
          setSavingCat(true);
          try {
            const res = await fetch('/api/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: catName, description: catDesc }),
            });
            const data = await res.json();
            if (res.ok) {
              setAlert({ type: 'success', msg: `Categoría "${catName}" creada correctamente.` });
              setCatModalOpen(false);
              fetchInventory(); // Recargar para que aparezca en los filtros
            } else {
              setAlert({ type: 'error', msg: data.error || 'Error al crear la categoría' });
            }
          } catch (err) {
            setAlert({ type: 'error', msg: 'Error de conexión' });
          } finally {
            setSavingCat(false);
          }
        }}>
          <div className="form-group">
            <label htmlFor="catName">Nombre de la Categoría *</label>
            <input
              id="catName"
              type="text"
              className="form-input"
              required
              placeholder="Ej. Bebidas, Golosinas, Limpieza..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              disabled={savingCat}
            />
          </div>

          <div className="form-group">
            <label htmlFor="catDesc">Descripción (Opcional)</label>
            <input
              id="catDesc"
              type="text"
              className="form-input"
              placeholder="Ej. Productos de limpieza del hogar"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              disabled={savingCat}
            />
          </div>

          {/* Lista de categorías existentes */}
          {categories.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                Categorías existentes:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {categories.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))',
                      border: '1px solid hsl(var(--primary) / 0.3)',
                    }}
                  >
                    {c.name}
                    <button
                      type="button"
                      title={`Eliminar categoría ${c.name}`}
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la categoría "${c.name}"? Los productos de esa categoría quedarán sin categoría.`)) return;
                        try {
                          const res = await fetch(`/api/categories?id=${c.id}`, { method: 'DELETE' });
                          const data = await res.json();
                          if (res.ok) {
                            setAlert({ type: 'success', msg: `Categoría "${c.name}" eliminada.` });
                            fetchInventory();
                          } else {
                            setAlert({ type: 'error', msg: data.error || 'Error al eliminar' });
                          }
                        } catch {
                          setAlert({ type: 'error', msg: 'Error de conexión' });
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--destructive))',
                        fontSize: '0.8rem',
                        lineHeight: 1,
                        padding: '0',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setCatModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={savingCat}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingCat}>
              {savingCat ? 'Guardando...' : '🏷️ Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Importación Masiva (Excel) */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="📥 Carga Masiva de Productos (Importar Excel)"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.25rem' }}>
            Puedes cargar o actualizar miles de productos en segundos subiendo un archivo Excel (.xlsx, .xls) o CSV. Si un código ya existe, actualizaremos sus precios y sumaremos el nuevo stock.
          </p>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'white' }}>Columnas que debe tener el archivo (no importa el orden):</span>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.5, color: 'hsl(var(--muted-foreground))' }}>
              <li><strong>Código</strong> / <strong>SKU</strong> (Requerido: Código de barras o SKU único)</li>
              <li><strong>Nombre</strong> / <strong>Producto</strong> (Requerido: Nombre del artículo)</li>
              <li><strong>Categoría</strong> (Opcional: Si no existe, se creará automáticamente)</li>
              <li><strong>Precio Compra</strong> / <strong>Costo</strong> (Opcional)</li>
              <li><strong>Precio Venta</strong> / <strong>Precio</strong> (Opcional)</li>
              <li><strong>Stock</strong> (Opcional: Stock inicial a cargar)</li>
              <li><strong>Stock Mínimo</strong> (Opcional: Por defecto es 5)</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={downloadTemplate}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.6rem' }}
            >
              📥 Descargar Plantilla Excel de Ejemplo
            </button>

            <div style={{ width: '100%', border: '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '2rem 1rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)', position: 'relative' }}>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                id="excel-file-upload" 
                onChange={handleImportExcel}
                style={{ display: 'none' }}
                disabled={importing}
              />
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📊</span>
              <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                {importing ? 'Procesando archivo e importando...' : 'Selecciona tu archivo de Excel para comenzar'}
              </p>
              <button 
                onClick={() => document.getElementById('excel-file-upload')?.click()}
                className="btn btn-primary"
                disabled={importing}
              >
                {importing ? 'Importando Productos...' : '📁 Seleccionar Archivo'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
