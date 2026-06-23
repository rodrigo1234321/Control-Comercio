'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import styles from './settings.module.css';

interface TenantConfig {
  name: string;
  currency: string;
  taxPercentage: number;
  cuit: string | null;
  logoUrl: string | null;
  allowNegativeStock: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface InviteCode {
  id: string;
  code: string;
  planType: string;
  isUsed: boolean;
  usedBy: string | null;
  note: string | null;
  createdAt: string;
  usedAt: string | null;
}

export default function SettingsPage() {
  const [configLoading, setConfigLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Datos de Negocio
  const [bizName, setBizName] = useState('');
  const [bizCurrency, setBizCurrency] = useState('ARS');
  const [bizTax, setBizTax] = useState(21.0);
  const [bizCuit, setBizCuit] = useState('');
  const [bizLogo, setBizLogo] = useState('');
  const [bizAllowNegativeStock, setBizAllowNegativeStock] = useState(false);

  // Datos de Empleados
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [creatingEmp, setCreatingEmp] = useState(false);

  // Copias de seguridad
  const [restoring, setRestoring] = useState(false);

  // Códigos de invitación
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteNote, setInviteNote] = useState('');
  const [creatingCode, setCreatingCode] = useState(false);
  const [codesLoading, setCodesLoading] = useState(true);

  // Super Admin
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant as TenantConfig;
        setBizName(t.name);
        setBizCurrency(t.currency);
        setBizTax(t.taxPercentage);
        setBizCuit(t.cuit || '');
        setBizLogo(t.logoUrl || '');
        setBizAllowNegativeStock(t.allowNegativeStock || false);
      }
    } catch (err) {
      console.error('Error fetching config', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/auth/employee');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchInviteCodes = async () => {
    try {
      const res = await fetch('/api/invite-codes');
      if (res.ok) {
        const data = await res.json();
        setInviteCodes(data.codes || []);
      }
    } catch (err) {
      console.error('Error fetching invite codes', err);
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchEmployees();
    // Check if user is super admin
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.isSuperAdmin) {
        setIsSuperAdmin(true);
        fetchInviteCodes();
      } else {
        setCodesLoading(false);
      }
    }).catch(() => setCodesLoading(false));
  }, []);

  const handleBizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const payload = {
      name: bizName,
      currency: bizCurrency,
      taxPercentage: Number(bizTax),
      cuit: bizCuit || null,
      logoUrl: bizLogo || null,
      allowNegativeStock: bizAllowNegativeStock,
    };

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: 'Datos de configuración del negocio actualizados.' });
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al actualizar configuración' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al conectar con el servidor' });
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setCreatingEmp(true);

    try {
      const res = await fetch('/api/auth/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          password: empPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ type: 'success', msg: `Cuenta de empleado creada para ${empName}` });
        setEmpName('');
        setEmpEmail('');
        setEmpPassword('');
        fetchEmployees(); // Recargar listado
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al crear empleado' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setCreatingEmp(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = confirm(
      '⚠️ ADVERTENCIA CRÍTICA: ¿Estás seguro de restaurar este respaldo?\n\nEsta operación eliminará TODOS los datos actuales de este comercio (productos, clientes, ventas y saldos) y los reemplazará con los contenidos del archivo. Esta acción no se puede deshacer.'
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    setAlert(null);
    setRestoring(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          const res = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json),
          });

          const data = await res.json();

          if (res.ok) {
            setAlert({ type: 'success', msg: '¡Copia de seguridad restaurada correctamente! Se ha recargado toda la base de datos.' });
            fetchConfig();
            fetchEmployees();
          } else {
            setAlert({ type: 'error', msg: data.error || 'Ocurrió un error al procesar el archivo' });
          }
        } catch (err) {
          setAlert({ type: 'error', msg: 'El archivo seleccionado no contiene un JSON válido.' });
        } finally {
          setRestoring(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al leer el archivo.' });
      setRestoring(false);
      e.target.value = '';
    }
  };

  const handleToggleEmployee = async (id: string, currentActive: boolean) => {
    const confirmChange = confirm(
      currentActive 
        ? '¿Estás seguro de dar de BAJA a este empleado? No podrá iniciar sesión ni registrar ventas hasta que lo vuelvas a habilitar.' 
        : '¿Estás seguro de dar de ALTA a este empleado para habilitar su acceso de nuevo?'
    );
    if (!confirmChange) return;

    setAlert(null);
    try {
      const res = await fetch('/api/auth/employee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ 
          type: 'success', 
          msg: currentActive ? 'El empleado ha sido dado de baja correctamente.' : 'El empleado ha sido dado de alta correctamente.' 
        });
        fetchEmployees();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al cambiar el estado del empleado' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error al conectar con el servidor' });
    }
  };

  const handleCreateInviteCode = async () => {
    setCreatingCode(true);
    setAlert(null);
    try {
      const res = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: inviteNote || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', msg: `¡Código creado! ${data.inviteCode.code}` });
        setInviteNote('');
        fetchInviteCodes();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al crear código' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setCreatingCode(false);
    }
  };

  const handleDeleteInviteCode = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar el código ${code}?`)) return;
    setAlert(null);
    try {
      const res = await fetch(`/api/invite-codes?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Código eliminado' });
        fetchInviteCodes();
      } else {
        setAlert({ type: 'error', msg: data.error || 'Error al eliminar' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Error de conexión' });
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Configuración de Comercio y Accesos</h2>

      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.msg} 
          onClose={() => setAlert(null)} 
        />
      )}

      {configLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando configuraciones de administración...</div>
      ) : (
        <div className={styles.settingsGrid}>
          {/* Panel Datos del Comercio */}
          <div className={styles.panel}>
            <h3 className={styles.title}>🏠 Datos del Negocio</h3>
            <form onSubmit={handleBizSubmit}>
              <div className="form-group">
                <label htmlFor="bizName">Nombre Comercial</label>
                <input
                  id="bizName"
                  type="text"
                  className="form-input"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bizCuit">CUIT del Comercio (Argentina)</label>
                <input
                  id="bizCuit"
                  type="text"
                  className="form-input"
                  placeholder="30-71439281-9"
                  value={bizCuit}
                  onChange={(e) => setBizCuit(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="bizCurrency">Moneda Base</label>
                  <select
                    id="bizCurrency"
                    className="form-input"
                    value={bizCurrency}
                    onChange={(e) => setBizCurrency(e.target.value)}
                  >
                    <option value="ARS">Pesos Argentinos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="bizTax">Alícuota IVA Estándar (%)</label>
                  <input
                    id="bizTax"
                    type="number"
                    step="0.1"
                    className="form-input"
                    required
                    value={bizTax}
                    onChange={(e) => setBizTax(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bizLogo">URL del Logotipo (Opcional)</label>
                <input
                  id="bizLogo"
                  type="text"
                  className="form-input"
                  placeholder="https://mi-servidor.com/logo.png"
                  value={bizLogo}
                  onChange={(e) => setBizLogo(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                <input
                  id="bizAllowNegativeStock"
                  type="checkbox"
                  checked={bizAllowNegativeStock}
                  onChange={(e) => setBizAllowNegativeStock(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="bizAllowNegativeStock" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem', color: 'white' }}>
                  Permitir ventas con stock negativo (Kioscos y Almacenes)
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                💾 Guardar Ajustes del Negocio
              </button>
            </form>
          </div>

          {/* Panel Alta y Listado de Empleados */}
          <div className={styles.panel}>
            <h3 className={styles.title}>👥 Accesos y Empleados</h3>
            
            {/* Formulario Alta de Empleado */}
            <form onSubmit={handleEmployeeSubmit} style={{ marginBottom: '2rem' }}>
              <div className={styles.sectionHeader}>Registrar Cuenta de Empleado (Cajero)</div>
              
              <div className="form-group">
                <label htmlFor="empName">Nombre Completo</label>
                <input
                  id="empName"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Carlos Martínez"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  disabled={creatingEmp}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="empEmail">Correo electrónico</label>
                  <input
                    id="empEmail"
                    type="email"
                    className="form-input"
                    placeholder="carlos@comercio.com"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    disabled={creatingEmp}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="empPassword">Contraseña de acceso</label>
                  <input
                    id="empPassword"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    disabled={creatingEmp}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={creatingEmp}>
                {creatingEmp ? 'Creando cuenta...' : '+ Dar de Alta Empleado'}
              </button>
            </form>

            {/* Listado de Empleados */}
            <div className={styles.sectionHeader}>Personal con Acceso Autorizado</div>
            {employeesLoading ? (
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Cargando empleados...</div>
            ) : employees.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>No tenés ningún empleado registrado todavía.</div>
            ) : (
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>
                        <span 
                          style={{
                            fontWeight: 700,
                            color: emp.isActive ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                            fontSize: '0.75rem'
                          }}
                        >
                          {emp.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleEmployee(emp.id, emp.isActive)}
                          className={emp.isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            minWidth: '95px'
                          }}
                        >
                          {emp.isActive ? '🚫 Dar de Baja' : '✅ Habilitar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Panel Copias de Seguridad */}
          <div className={styles.panel} style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <h3 className={styles.title}>🔄 Copias de Seguridad y Respaldo</h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
              Descarga un respaldo completo con toda la información de tu comercio (configuración, productos, clientes, ventas, saldos e historiales) para guardarlo de forma segura. También puedes subir un archivo de respaldo anterior para restaurar tu base de datos.
            </p>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px', padding: '1.5rem', border: '1px dashed hsl(var(--border))', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Exportar Respaldo</h4>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>Genera un archivo .json de descarga inmediata con la base de datos íntegra de tu comercio.</p>
                </div>
                <a 
                  href="/api/backup" 
                  download 
                  className="btn btn-primary" 
                  style={{ textAlign: 'center', display: 'block', textDecoration: 'none', padding: '0.75rem' }}
                >
                  📥 Exportar Respaldo (.JSON)
                </a>
              </div>

              <div style={{ flex: 1, minWidth: '280px', padding: '1.5rem', border: '1px dashed hsl(var(--border))', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem', color: 'hsl(var(--destructive))' }}>Restaurar Respaldo</h4>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>Carga un archivo de copia de seguridad anterior. ¡Atención! Esto sobrescribirá todos los datos actuales del comercio.</p>
                </div>
                <div>
                  <input 
                    type="file" 
                    accept=".json"
                    id="restore-file-input"
                    onChange={handleRestoreBackup}
                    style={{ display: 'none' }} 
                  />
                  <button 
                    onClick={() => document.getElementById('restore-file-input')?.click()}
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.75rem' }}
                    disabled={restoring}
                  >
                    {restoring ? 'Restaurando Base de Datos...' : '📤 Subir y Restaurar Respaldo'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Códigos de Invitación - Solo visible para Super Admin */}
          {isSuperAdmin && (
          <div className={styles.panel} style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <h3 className={styles.title}>🔑 Códigos de Invitación</h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
              Generá códigos únicos para que tus clientes puedan registrarse. Cada código solo se puede usar una vez.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                <label htmlFor="inviteNote">Nota interna (opcional)</label>
                <input
                  id="inviteNote"
                  type="text"
                  className="form-input"
                  placeholder="Ej: Para kiosco de Juan"
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  disabled={creatingCode}
                />
              </div>
              <button
                onClick={handleCreateInviteCode}
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', whiteSpace: 'nowrap' }}
                disabled={creatingCode}
              >
                {creatingCode ? 'Generando...' : '+ Generar Código'}
              </button>
            </div>

            {codesLoading ? (
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Cargando códigos...</div>
            ) : inviteCodes.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>No hay códigos de invitación generados aún.</div>
            ) : (
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nota</th>
                    <th>Estado</th>
                    <th>Usado por</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteCodes.map((ic) => (
                    <tr key={ic.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.03em' }}>{ic.code}</td>
                      <td style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{ic.note || '—'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: ic.isUsed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--success))',
                          fontSize: '0.75rem'
                        }}>
                          {ic.isUsed ? '✅ Usado' : '🟢 Disponible'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{ic.usedBy || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {!ic.isUsed ? (
                          <button
                            onClick={() => handleDeleteInviteCode(ic.id, ic.code)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            🗑️ Eliminar
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                            {ic.usedAt ? new Date(ic.usedAt).toLocaleDateString('es-AR') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
