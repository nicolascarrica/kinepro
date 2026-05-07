'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { WeekCalendar, CalendarSlot } from '@/components/WeekCalendar';
import { api } from '@/lib/api';

interface Slot extends CalendarSlot {}

interface Activity {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

/**
 * HU "Reservar turno por demanda".
 *
 * Vista calendario semanal: dias en columnas, horas en filas.
 * Click en una celda con cupo abre un modal para elegir el tipo
 * de tratamiento.
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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [seleccionado, setSeleccionado] = useState<Slot | null>(null);
  const [activitySel, setActivitySel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    // traemos un rango amplio (4 semanas) para que la navegacion
    // entre semanas dentro del calendario no requiera otro fetch.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(today);
    next.setDate(next.getDate() + 28);
    const data = await api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(next.toISOString())}`,
    );
    setSlots(data);
  }

  useEffect(() => {
    load();
    api<Activity[]>('/activities').then((a) => {
      setActivities(a);
      if (a[0]) setActivitySel(a[0].id);
    });
  }, []);

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
      <p className="text-neutral-gray mb-4">
        Eligi un horario disponible en el calendario y despues seleccionas el
        tratamiento que queres hacer.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {ok && <div className="alert-ok mb-4">{ok}</div>}

      <WeekCalendar<Slot>
        slots={slots}
        onSlotClick={(s) => {
          if (s.cancelado) return;
          if (s.ocupados >= s.cupo) return;
          if (new Date(s.startsAt) < new Date()) return;
          setSeleccionado(s);
        }}
        renderCell={(s) => {
          if (!s) {
            return <span className="text-xs text-neutral-300">—</span>;
          }
          if (s.cancelado) {
            return (
              <div className="rounded bg-red-50 border border-red-200 px-2 py-1">
                <div className="text-xs font-semibold text-red-600">
                  Cancelado
                </div>
              </div>
            );
          }
          const lleno = s.ocupados >= s.cupo;
          const pasado = new Date(s.startsAt) < new Date();
          if (pasado) {
            return (
              <div className="rounded bg-neutral-50 border border-neutral-200 px-2 py-1 opacity-60">
                <div className="text-xs text-neutral-gray">Pasado</div>
              </div>
            );
          }
          return (
            <div
              className={`rounded px-2 py-1 border ${
                lleno
                  ? 'bg-red-50 border-red-200'
                  : 'bg-progreen-light/20 border-progreen-light hover:bg-progreen-light/40'
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  lleno ? 'text-red-700' : 'text-progreen-deep'
                }`}
              >
                {lleno ? 'Sin cupo' : `${s.cupo - s.ocupados} libre(s)`}
              </div>
              <div className="text-[10px] text-neutral-gray mt-0.5">
                {s.ocupados}/{s.cupo}
              </div>
            </div>
          );
        }}
      />

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
