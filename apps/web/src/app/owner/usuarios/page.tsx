'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  role: string;
  status: string;
  planMensual: boolean;
}

/**
 * HU NUEVA "Crear usuario interno (Owner)".
 * + Setear/quitar plan mensual a un paciente.
 */
export default function UsuariosPage() {
  return (
    <AuthGuard roles={['OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [items, setItems] = useState<User[] | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    role: 'ADMINISTRATIVO' as 'ADMINISTRATIVO' | 'OWNER',
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    setItems(await api<User[]>('/users'));
  }
  useEffect(() => {
    load();
  }, []);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const r = await api<{ tempPasswordPlain: string }>('/users/internal', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setInfo(
        `Usuario creado. Contrasena temporal: ${r.tempPasswordPlain} (debe cambiarla en el primer ingreso)`,
      );
      setForm({ nombre: '', apellido: '', email: '', role: 'ADMINISTRATIVO' });
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  async function togglePlan(id: string, planMensual: boolean) {
    try {
      await api(`/users/${id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ planMensual }),
      });
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">
        Usuarios del sistema
      </h1>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <form className="card lg:col-span-1" onSubmit={crear}>
          <h2 className="font-semibold text-kineblue-deep mb-4">
            Crear usuario interno
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input
                className="input"
                required
                value={form.apellido}
                onChange={(e) =>
                  setForm({ ...form, apellido: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as typeof form.role,
                  })
                }
              >
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <button className="btn-primary w-full">Crear usuario</button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {items === null ? (
            <p className="text-neutral-gray">Cargando...</p>
          ) : (
            items.map((u) => (
              <div
                key={u.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-kineblue-deep">
                    {u.nombre} {u.apellido}
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    {u.email} · {u.role} · {u.status}
                    {u.role === 'PACIENTE' &&
                      (u.planMensual
                        ? ' · Plan mensual'
                        : ' · Plan ocasional')}
                  </p>
                </div>
                {u.role === 'PACIENTE' && (
                  <button
                    className="text-sm underline"
                    onClick={() => togglePlan(u.id, !u.planMensual)}
                  >
                    {u.planMensual ? 'Quitar plan mensual' : 'Marcar mensual'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
