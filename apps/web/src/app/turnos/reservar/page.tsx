'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Slot {
  id: string;
  startsAt: string;
  cupo: number;
  ocupados: number;
  cancelado: boolean;
}

interface Activity {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

/**
 * HU "Reservar turno por demanda".
 *
 * Modelo: cada horario es una franja con cupo total. Al elegir un
 * horario el paciente selecciona ademas el tipo de tratamiento
 * (actividad).
 */
export default function ReservarPage() {
  return (
    <AuthGuard roles={['PACIENTE']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [seleccionado, setSeleccionado] = useState<Slot | null>(null);
  const [activitySel, setActivitySel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(today);
    next.setDate(next.getDate() + 14);
    const data = await api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(next.toISOString())}`,
    );
    setSlots(data.filter((s) => !s.cancelado));
  }

  useEffect(() => {
    load();
    api<Activity[]>('/activities').then((a) => {
      setActivities(a);
      if (a[0]) setActivitySel(a[0].id);
    });
  }, []);

  // agrupar por dia
  const slotsPorDia = useMemo(() => {
    if (!slots) return {};
    const grupos: Record<string, Slot[]> = {};
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const key = d.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
      grupos[key] = grupos[key] ?? [];
      grupos[key].push(s);
    }
    return grupos;
  }, [slots]);

  async function confirmar() {
    if (!seleccionado || !activitySel) return;
    setError(null);
    setOk(null);
    try {
      await api('/appointments/reserve', {
        method: 'POST',
        body: JSON.stringify({
          slotId: seleccionado.id,
          activityId: activitySel,
        }),
      });
      setOk('Reserva exitosa');
      setSeleccionado(null);
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'No se pudo reservar');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
        Reservar turno
      </h1>
      <p className="text-neutral-gray mb-6">
        Eligi un horario disponible. Despues seleccionas el tratamiento que
        queres hacer (Tren superior, medio o inferior).
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {ok && <div className="alert-ok mb-4">{ok}</div>}

      {slots === null ? (
        <p className="text-neutral-gray">Cargando turnos...</p>
      ) : Object.keys(slotsPorDia).length === 0 ? (
        <p className="text-neutral-gray">
          No hay turnos disponibles en los proximos 14 dias.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(slotsPorDia).map(([dia, dslots]) => (
            <section key={dia}>
              <h2 className="text-lg font-semibold text-kineblue-deep capitalize mb-3">
                {dia}
              </h2>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {dslots.map((s) => {
                  const lleno = s.ocupados >= s.cupo;
                  const horario = new Date(s.startsAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <button
                      key={s.id}
                      disabled={lleno}
                      onClick={() => setSeleccionado(s)}
                      className={`rounded-lg border p-3 text-left transition ${
                        lleno
                          ? 'opacity-40 cursor-not-allowed border-neutral-200 bg-white'
                          : 'border-kineblue/30 bg-white hover:border-kineblue hover:bg-kineblue-light/10'
                      }`}
                    >
                      <div className="text-lg font-semibold text-kineblue-deep">
                        {horario}
                      </div>
                      <div
                        className={`text-xs mt-1 ${lleno ? 'text-red-600' : 'text-progreen-deep'}`}
                      >
                        {lleno
                          ? 'Sin cupo'
                          : `${s.cupo - s.ocupados} cupo(s) disponibles`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal simple de seleccion de actividad */}
      {seleccionado && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSeleccionado(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-kineblue-deep">
              Confirmar reserva
            </h3>
            <p className="text-sm text-neutral-gray mt-1">
              {new Date(seleccionado.startsAt).toLocaleString('es-AR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            <label className="label mt-4">Tipo de tratamiento</label>
            <select
              className="input"
              value={activitySel}
              onChange={(e) => setActivitySel(e.target.value)}
            >
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {a.descripcion ? ` - ${a.descripcion}` : ''}
                </option>
              ))}
            </select>

            <div className="flex gap-2 mt-6 justify-end">
              <button
                className="btn-outline"
                onClick={() => setSeleccionado(null)}
              >
                Cancelar
              </button>
              <button className="btn-success" onClick={confirmar}>
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
