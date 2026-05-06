'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  asunto: string;
  cuerpo: string;
  kind: string;
  channel: string;
  leida: boolean;
  createdAt: string;
}

/**
 * HU "Recibir notificaciones de turnos" (canal IN_APP).
 * El backend tambien crea notificaciones para mails de reset / bloqueo
 * con canal EMAIL para no depender de SMTP en la demo.
 */
export default function NotificacionesPage() {
  return (
    <AuthGuard>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [items, setItems] = useState<Notification[] | null>(null);

  async function load() {
    setItems(await api<Notification[]>('/notifications'));
  }

  useEffect(() => {
    load();
  }, []);

  async function marcar(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">
        Notificaciones
      </h1>
      {items === null ? (
        <p className="text-neutral-gray">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-gray">No tenes notificaciones.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`card ${n.leida ? 'opacity-60' : 'border-kineblue/40'}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-kineblue-deep">{n.asunto}</h3>
                <span className="text-xs text-neutral-gray">
                  {new Date(n.createdAt).toLocaleString('es-AR')} ·{' '}
                  {n.channel}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{n.cuerpo}</p>
              {!n.leida && (
                <button
                  className="text-xs underline mt-2"
                  onClick={() => marcar(n.id)}
                >
                  Marcar como leida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
