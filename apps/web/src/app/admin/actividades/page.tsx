'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

/** HU #39 / #40 / #41 + "Visualizar actividades (personal)". */
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editando, setEditando] = useState<Activity | null>(null);

  async function load() {
    const data = await api<Activity[]>('/activities');
    setItems(data);
  }

  useEffect(() => { load(); }, []);

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar actividad?')) return;
    setError(null); setInfo(null);
    try {
      const r = await api<{ mensaje: string }>(`/activities/${id}`, { method: 'DELETE' });
      setInfo(r.mensaje);
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
        <FormCrear onCreated={() => { setError(null); setInfo('La actividad se creó con éxito'); load(); }} onError={setError} />

        <div className="lg:col-span-2 space-y-3">
          {items === null ? (
            <p className="text-neutral-gray">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-neutral-gray">No existen actividades.</p>
          ) : (
            items.map((a) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-kineblue-deep">{a.nombre}</h3>
                  {a.descripcion && <p className="text-sm text-neutral-gray">{a.descripcion}</p>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button className="text-kineblue underline" onClick={() => setEditando(a)}>
                    Modificar
                  </button>
                  <button className="text-red-600 underline" onClick={() => eliminar(a.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editando && (
        <ModalEditar
          actividad={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); setInfo('La actividad se modificó con éxito'); load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function FormCrear({ onCreated, onError }: { onCreated: () => void; onError: (s: string) => void }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  async function crear(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/activities', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ nombre: '', descripcion: '' });
      onCreated();
    } catch (e: any) {
      onError(
        Array.isArray(e?.body?.message) ? e.body.message.join(' / ') : e?.body?.message ?? 'Error',
      );
    }
  }

  return (
    <form className="card lg:col-span-1" onSubmit={crear}>
      <h2 className="font-semibold text-kineblue-deep mb-4">Crear actividad</h2>
      <div className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <button className="btn-primary w-full">Crear actividad</button>
      </div>
    </form>
  );
}

function ModalEditar({ actividad, onClose, onSaved, onError }: { actividad: Activity; onClose: () => void; onSaved: () => void; onError: (s: string) => void }) {
  const [nombre, setNombre] = useState(actividad.nombre);
  const [descripcion, setDescripcion] = useState(actividad.descripcion ?? '');

  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/activities/${actividad.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombre, descripcion }),
      });
      onSaved();
    } catch (e: any) {
      onError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3 className="text-lg font-semibold text-kineblue-deep">Modificar actividad</h3>
        <div>
          <label className="label">Nombre</label>
          <input className="input" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="input" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary">Modificar actividad</button>
        </div>
      </form>
    </div>
  );
}
