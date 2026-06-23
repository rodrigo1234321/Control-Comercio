'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import { formatDate, normalizeText } from '@/lib/utils';
import styles from '../inventory/inventory.module.css';
import { exportToExcel } from '@/lib/excel';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cuitCuil: string | null;
  createdAt: string;
  _count?: {
    sales: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');

  const handleExportExcel = () => {
    const dataToExport = clients.map((c) => ({
      'Nombre': c.name,
      'CUIT / CUIL': c.cuitCuil || 'Consumidor Final',
      'Teléfono': c.phone || '',
      'Correo Electrónico': c.email || '',
      'Ventas Realizadas': c._count?.sales || 0,
      'Fecha de Alta': new Date(c.createdAt).toLocaleDateString('es-AR'),
    }));
    exportToExcel(dataToExport, `clientes-${new Date().toISOString().split('T')[0]}`, 'Clientes');
  };

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      } else {
        setError('Error al obtener clientes');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openAddClient = () => {
    setSelectedClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setCuit('');
    setModalOpen(true);
  };

  const openEditClient = (c: Client) => {
    setSelectedClient(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setCuit(c.cuitCuil || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAlert(null);

    const isEdit = !!selectedClient;
    const url = isEdit ? `/api/clients/${selectedClient.id}` : '/api/clients';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, cuitCuil: cuit }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: isEdit ? 'Cliente actualizado con éxito' : 'Cliente registrado con éxito' });
        setModalOpen(false);
        fetchClients();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al guardar el cliente' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    setAlert(null);

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: 'Cliente eliminado con éxito' });
        fetchClients();
      } else {
        setAlert({ type: 'error', msg: data.error || 'No se pudo eliminar el cliente' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión' });
    }
  };

  // Filtrado reactivo en el frontend por rendimiento
  const filteredClients = clients.filter(c => {
    const term = normalizeText(search);
    return normalizeText(c.name).includes(term) || 
      (c.cuitCuil && normalizeText(c.cuitCuil).includes(term)) ||
      (c.phone && normalizeText(c.phone).includes(term));
  });

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Directorio de Clientes</h2>

      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.msg} 
          onClose={() => setAlert(null)} 
        />
      )}

      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, teléfono o CUIT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportExcel} className="btn btn-secondary">
            📤 Exportar Excel
          </button>
          <button onClick={openAddClient} className="btn btn-primary">
            + Agregar Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className={styles.tableWrapper} style={{ padding: '3rem', textAlign: 'center', color: 'white' }}>
          No se encontraron clientes registrados.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CUIT / CUIL</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Ventas Realizadas</th>
                <th>Fecha de Alta</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.cuitCuil || 'Consumidor Final'}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>
                    {c._count?.sales || 0} compras
                  </td>
                  <td>{formatDate(c.createdAt).split(' ')[0]}</td>
                  <td style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className={styles.actionButtons}>
                      <button 
                        onClick={() => openEditClient(c)} 
                        className={`${styles.iconBtn} ${styles.editBtn}`}
                        title="Editar Cliente"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)} 
                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                        title="Eliminar Cliente"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Agregar / Editar Cliente */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedClient ? 'Modificar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cliName">Nombre Completo / Razón Social</label>
            <input
              id="cliName"
              type="text"
              className="form-input"
              required
              placeholder="Ej. Juan Carlos Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cliCuit">CUIT o CUIL (Opcional)</label>
            <input
              id="cliCuit"
              type="text"
              className="form-input"
              placeholder="Ej. 20-25678123-9"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cliPhone">Teléfono de contacto</label>
            <input
              id="cliPhone"
              type="text"
              className="form-input"
              placeholder="Ej. 11 5432 9876"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cliEmail">Correo Electrónico (Opcional)</label>
            <input
              id="cliEmail"
              type="email"
              className="form-input"
              placeholder="cliente@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Guardando...' : (selectedClient ? 'Guardar Cambios' : 'Registrar Cliente')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
