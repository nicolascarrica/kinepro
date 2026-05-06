'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  nombre: string;
  capacidad: number;
  descripcion?: string | null;
}

/**
 * HU "Crear actividad" / "Modificar actividad" / "Eliminar actividad".
 */
export default function ActivitiesPage() {
  return (
    <AuthGuard roles={['ADMINISTRATIVO', 'OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [form, setForm] = useState({ nombre: '', capacidad: 4, descripcion: '' });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const data = await api<Activity[]>('/activities');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await api('/activities', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setInfo('La actividad se creo con exito');
      setForm({ nombre: '', capacidad: 4, descripcion: '' });
      await load();
    } catch (e: any) {
      setError(
        Array.isArray(e?.body?.message)
          ? e.body.message.join(' / ')
          : e?.body?.message ?? 'Error',
      );
    }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar actividad?')) return;
    setError(null);
    setInfo(null);
    try {
      await api(`/activities/${id}`, { method: 'DELETE' });
      setInfo('La actividad se elimino con exito');
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">Actividades</h1>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <form className="card lg:col-span-1" onSubmit={crear}>
          <h2 className="font-semibold text-kineblue-deep mb-4">
            Crear actividad
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
              <label className="label">Capacidad por turno</label>
              <input
                className="input"
                type="number"
                min={1}
                required
                value={form.capacidad}
                onChange={(e) =>
                  setForm({ ...form, capacidad: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">Descripcion (opcional)</label>
              <textarea
                className="input"
                rows={2}
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
              />
            </div>
            <button className="btn-primary w-full">Crear actividad</button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {items === null ? (
            <p className="text-neutral-gray">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-neutral-gray">No hay actividades cargadas.</p>
          ) : (
            items.map((a) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-kineblue-deep">
                    {a.nombre}
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    Capacidad: {a.capacidad}
                    {a.descripcion ? ` · ${a.descripcion}` : ''}
                  </p>
                </div>
                <button
                  className="text-sm text-red-600 underline"
                  onClick={() => eliminar(a.id)}
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
