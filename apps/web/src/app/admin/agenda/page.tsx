'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Slot {
  id: string;
  startsAt: string;
  cupo: number;
  ocupados: number;
  cancelado: boolean;
  pacientes: Array<{
    appointmentId: string;
    paciente: { id: string; nombre: string; apellido: string };
    actividad: { id: string; nombre: string };
    status: string;
  }>;
}

/**
 * HU NUEVA "Listar agenda general (personal interno)".
 * Muestra cada horario con su cupo, los pacientes inscriptos y el
 * tipo de tratamiento que cada uno eligio.
 */
export default function AgendaPage() {
  return (
    <AuthGuard roles={['ADMINISTRATIVO', 'OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [rango, setRango] = useState<'HOY' | 'SEMANA'>('SEMANA');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = new Date(today);
    to.setDate(today.getDate() + (rango === 'HOY' ? 1 : 7));
    const data = await api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    );
    setSlots(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango]);

  async function cancelarSlot(id: string) {
    const motivo = window.prompt('Motivo de cancelacion:');
    if (!motivo) return;
    setError(null);
    setInfo(null);
    try {
      await api(`/slots/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setInfo('Horario cancelado por el centro. Pacientes notificados.');
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'No se pudo cancelar');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-kineblue-deep">Agenda</h1>
        <div className="flex gap-2 text-sm">
          <button
            className={rango === 'HOY' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setRango('HOY')}
          >
            Hoy
          </button>
          <button
            className={rango === 'SEMANA' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setRango('SEMANA')}
          >
            Esta semana
          </button>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      {slots === null ? (
        <p className="text-neutral-gray">Cargando agenda...</p>
      ) : slots.length === 0 ? (
        <p className="text-neutral-gray">
          No hay horarios para el rango seleccionado.
        </p>
      ) : (
        <div className="space-y-3">
          {slots.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-semibold text-kineblue-deep">
                    {new Date(s.startsAt).toLocaleString('es-AR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </h3>
                  <p className="text-xs text-neutral-gray mt-1">
                    Cupo {s.ocupados}/{s.cupo}
                    {s.cancelado && (
                      <span className="ml-2 text-red-600 font-medium">
                        Cancelado
                      </span>
                    )}
                  </p>
                </div>
                {!s.cancelado && (
                  <button
                    className="text-xs underline text-red-600"
                    onClick={() => cancelarSlot(s.id)}
                  >
                    Cancelar horario
                  </button>
                )}
              </div>
              {s.pacientes.length === 0 ? (
                <p className="text-sm text-neutral-gray mt-3">
                  Sin reservas todavia.
                </p>
              ) : (
                <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                  {s.pacientes.map((p) => (
                    <li
                      key={p.appointmentId}
                      className="border border-neutral-200 rounded-md px-3 py-2 flex items-center justify-between"
                    >
                      <span>
                        <strong>
                          {p.paciente.nombre} {p.paciente.apellido}
                        </strong>
                        <span className="text-xs text-neutral-gray ml-2">
                          ({p.actividad.nombre})
                        </span>
                      </span>
                      <span className="text-[11px] text-kineblue">
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
