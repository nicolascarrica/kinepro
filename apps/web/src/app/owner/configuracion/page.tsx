'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

/**
 * HU NUEVA "Configurar precios y descuento mensual".
 */
export default function SettingsPage() {
  return (
    <AuthGuard roles={['OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [form, setForm] = useState({
    precioPorSesion: 5000,
    descuentoMensual: 20,
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    api<{ precioPorSesion: number; descuentoMensual: number }>(
      '/settings',
    ).then((s) => setForm(s));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await api('/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setInfo('Configuracion actualizada con exito');
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">
        Configuracion
      </h1>
      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}
      <form className="card space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label">Precio por sesion ($)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.precioPorSesion}
            onChange={(e) =>
              setForm({ ...form, precioPorSesion: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="label">Descuento mensual (%)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={form.descuentoMensual}
            onChange={(e) =>
              setForm({ ...form, descuentoMensual: Number(e.target.value) })
            }
          />
        </div>
        <button className="btn-primary w-full">Guardar configuracion</button>
      </form>
    </div>
  );
}
