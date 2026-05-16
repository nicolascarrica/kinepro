'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Payment {
  id: string;
  monto: number;
  metodo: string;
  status: string;
  comprobanteId?: string | null;
  createdAt: string;
  appointment: {
    slot: { startsAt: string };
    activity: { nombre: string };
  };
}

/**
 * HU #12 escenario 3 - "Mis pagos" del paciente con descarga
 * de comprobante.
 */
export default function MisPagosPage() {
  return (
    <AuthGuard roles={['PACIENTE']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [items, setItems] = useState<Payment[] | null>(null);

  useEffect(() => {
    api<Payment[]>('/payments/mine').then(setItems);
  }, []);

  async function descargar(id: string) {
    // El backend devuelve text/plain con Content-Disposition.
    const token =
      typeof window === 'undefined'
        ? null
        : window.localStorage.getItem('kinepro_token');
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const res = await fetch(`${base}/payments/mine/${id}/comprobante`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      alert('No se pudo descargar el comprobante');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinepro-comprobante-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-2">Mis pagos</h1>
      <p className="text-neutral-gray mb-6">
        Listado de tus pagos con opción de descargar el comprobante.
      </p>

      {items === null ? (
        <p className="text-neutral-gray">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-gray">Todavía no registraste pagos.</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <h3 className="font-semibold text-kineblue-deep">
                  {p.appointment.activity.nombre}
                </h3>
                <p className="text-sm text-neutral-gray">
                  {new Date(p.appointment.slot.startsAt).toLocaleString('es-AR')}
                </p>
                <p className="text-xs mt-1">
                  <strong>${p.monto}</strong> · {p.metodo} · {p.status}
                  {p.comprobanteId && ` · Comprobante #${p.comprobanteId}`}
                </p>
              </div>
              <button className="btn-outline text-sm" onClick={() => descargar(p.id)}>
                Descargar comprobante
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
