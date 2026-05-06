'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Appointment {
  id: string;
  status: string;
  reprogramacionesUsadas: number;
  precio: number;
  descuentoPct: number;
  slot: {
    id: string;
    startsAt: string;
  };
  activity: { id: string; nombre: string };
}

/**
 * HU "Listar turnos (paciente)" + "Cancelar turno (paciente)" + "Reprogramar turno"
 * + "Consultar historial de turnos".
 */
export default function MisTurnosPage() {
  return (
    <AuthGuard roles={['PACIENTE']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [filtro, setFiltro] = useState<'PROXIMOS' | 'TODOS'>('PROXIMOS');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const data = await api<Appointment[]>(
      `/appointments/mine?filtro=${filtro}`,
    );
    setItems(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function cancelar(id: string) {
    setError(null);
    setInfo(null);
    try {
      await api(`/appointments/${id}/cancel`, { method: 'POST' });
      setInfo('Turno cancelado');
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'No se pudo cancelar');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-kineblue-deep">Mis turnos</h1>
        <div className="flex gap-2 text-sm">
          <button
            className={filtro === 'PROXIMOS' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setFiltro('PROXIMOS')}
          >
            Proximos turnos
          </button>
          <button
            className={filtro === 'TODOS' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setFiltro('TODOS')}
          >
            Historial completo
          </button>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      {items === null ? (
        <p className="text-neutral-gray">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-gray">
          {filtro === 'PROXIMOS'
            ? 'No tienes turnos pendientes.'
            : 'No se encuentran resultados.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="card flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-kineblue-deep">
                  {a.activity.nombre}
                </h3>
                <p className="text-sm text-neutral-gray">
                  {new Date(a.slot.startsAt).toLocaleString('es-AR')}
                </p>
                <p className="text-xs mt-1">
                  Estado:{' '}
                  <span className="font-medium text-kineblue">{a.status}</span>
                  {' · '}
                  Reprogramaciones: {a.reprogramacionesUsadas}/2
                  {' · '}
                  Precio: ${a.precio.toFixed(0)}
                  {a.descuentoPct > 0 && ` (descuento ${a.descuentoPct}%)`}
                </p>
              </div>
              {a.status === 'RESERVADO' && (
                <div className="flex gap-2">
                  <button
                    className="btn-outline text-sm"
                    onClick={() => cancelar(a.id)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
