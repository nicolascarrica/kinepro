'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
 * Campanita de notificaciones en el header.
 *
 * Cubre la HU "Recibir notificaciones de turnos": muestra un badge
 * con el contador de no leidas y un dropdown con las ultimas
 * notificaciones del usuario. Hace polling cada 30 segundos para
 * mantenerse al dia sin necesidad de websockets.
 */
export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await api<Notification[]>('/notifications');
      setItems(data);
    } catch {
      // si no esta autenticado todavia, ignoramos el error.
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // cerrar al click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const noLeidas = items.filter((n) => !n.leida).length;

  async function marcarTodas() {
    await Promise.all(
      items
        .filter((n) => !n.leida)
        .map((n) =>
          api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => null),
        ),
    );
    await load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notificaciones"
        className="relative p-1 rounded hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-progreen text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 font-bold">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white text-neutral-900 rounded-lg shadow-xl border border-neutral-200 z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-semibold text-kineblue-deep">
              Notificaciones
            </h3>
            <button
              className="text-xs text-kineblue underline disabled:opacity-50"
              onClick={marcarTodas}
              disabled={noLeidas === 0}
            >
              Marcar todas como leidas
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-neutral-gray">
                No tenes notificaciones.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {items.slice(0, 10).map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 ${
                      n.leida ? 'opacity-60' : 'bg-kineblue-light/10'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium text-sm text-kineblue-deep">
                        {n.asunto}
                      </p>
                      <span className="text-[10px] text-neutral-gray">
                        {new Date(n.createdAt).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-neutral-700 whitespace-pre-wrap">
                      {n.cuerpo}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-4 py-2 border-t text-right">
            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              className="text-xs text-kineblue hover:underline"
            >
              Ver todas →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
