'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { WeekCalendar, CalendarSlot } from '@/components/WeekCalendar';
import { api } from '@/lib/api';

interface Slot extends CalendarSlot {
  activityId: string;
  activityName: string;
}

/**
 * HU #32 Reservar turno por demanda.
 * Cada celda del calendario tiene la actividad pre-asignada
 * (HU v2: una actividad por horario). El paciente confirma la
 * reserva en un modal.
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

const COLORS: Record<string, string> = {
  'Tren superior': 'bg-progreen-light/30 border-progreen-light text-progreen-deep',
  'Tren medio': 'bg-kineblue-light/40 border-kineblue-light text-kineblue-deep',
  'Tren inferior': 'bg-yellow-100 border-yellow-300 text-yellow-800',
};

function colorOf(name: string) {
  return COLORS[name] ?? 'bg-neutral-100 border-neutral-300 text-neutral-gray';
}

function Inner() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [seleccionado, setSeleccionado] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(today);
    next.setDate(next.getDate() + 28);
    const data = await api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(next.toISOString())}`,
    );
    setSlots(data);
  }

  useEffect(() => { load(); }, []);

  const leyenda = useMemo(() => {
    const set = new Map<string, string>();
    for (const s of slots) set.set(s.activityName, colorOf(s.activityName));
    return Array.from(set.entries());
  }, [slots]);

  async function confirmar() {
    if (!seleccionado) return;
    setError(null); setOk(null);
    try {
      await api('/appointments/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: seleccionado.id }),
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
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-kineblue-deep">Reservar turno</h1>
        <Link href="/turnos/reservar-mensual" className="btn-outline text-sm">
          Reservar mensualmente (HU #42)
        </Link>
      </div>
      <p className="text-neutral-gray mb-3">
        Cada horario tiene asignada una actividad. Hace click en una celda
        para reservar.
      </p>
      {leyenda.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {leyenda.map(([name, cls]) => (
            <span key={name} className={`rounded px-2 py-1 border ${cls}`}>
              {name}
            </span>
          ))}
        </div>
      )}

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
          if (!s) return <span className="text-xs text-neutral-300">—</span>;
          if (s.cancelado) {
            return <div className="rounded border bg-red-50 border-red-200 px-2 py-1 text-xs text-red-600">Cancelado</div>;
          }
          if (new Date(s.startsAt) < new Date()) {
            return <div className="rounded border bg-neutral-50 border-neutral-200 px-2 py-1 text-xs text-neutral-gray opacity-70">Pasado</div>;
          }
          const lleno = s.ocupados >= s.cupo;
          const base = colorOf(s.activityName);
          return (
            <div className={`rounded border px-2 py-1 ${lleno ? 'opacity-50' : ''} ${base}`}>
              <div className="text-xs font-semibold leading-tight">
                {s.activityName}
              </div>
              <div className="text-[10px] mt-0.5">
                {lleno ? 'Sin cupo' : `${s.cupo - s.ocupados} libre(s)`}
              </div>
            </div>
          );
        }}
      />

      {seleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSeleccionado(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-kineblue-deep">
              Confirmar reserva
            </h3>
            <p className="text-sm text-neutral-gray mt-1">
              <strong>{seleccionado.activityName}</strong> —{' '}
              {new Date(seleccionado.startsAt).toLocaleString('es-AR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-neutral-gray mt-3">
              Cupo disponible: {seleccionado.cupo - seleccionado.ocupados} / {seleccionado.cupo}
            </p>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="btn-outline" onClick={() => setSeleccionado(null)}>
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
