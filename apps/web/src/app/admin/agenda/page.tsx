'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { WeekCalendar, CalendarSlot } from '@/components/WeekCalendar';
import { api } from '@/lib/api';

interface Slot extends CalendarSlot {
  activityId: string;
  activityName: string;
  pacientes: Array<{
    appointmentId: string;
    paciente: { id: string; nombre: string; apellido: string };
    status: string;
  }>;
}

/** HU #51 Visualizar turnos (personal) + cancelar por el centro. */
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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [seleccionado, setSeleccionado] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    today.setHours(0, 0, 0, 0);
    const to = new Date(today);
    to.setDate(to.getDate() + 28);
    const data = await api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    );
    setSlots(data);
  }

  useEffect(() => { load(); }, []);

  async function cancelarSlot(id: string) {
    const motivo = window.prompt('Motivo de cancelación:');
    if (!motivo) return;
    setError(null); setInfo(null);
    try {
      await api(`/slots/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setInfo('Turno cancelado por el centro. Pacientes notificados.');
      setSeleccionado(null);
      await load();
    } catch (e: any) {
      setError(e?.body?.message ?? 'No se pudo cancelar');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-2">Agenda</h1>
      <p className="text-neutral-gray mb-4">
        Vista semanal. Cada horario tiene su actividad asignada. Click en
        una celda para ver pacientes inscriptos.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      <WeekCalendar<Slot>
        slots={slots}
        onSlotClick={(s) => setSeleccionado(s)}
        renderCell={(s) => {
          if (!s) return <span className="text-xs text-neutral-300">—</span>;
          if (s.cancelado) {
            return (
              <div className="rounded border bg-red-50 border-red-200 px-2 py-1">
                <div className="text-xs font-semibold text-red-600">Cancelado</div>
                <div className="text-[10px] text-neutral-gray">{s.activityName}</div>
              </div>
            );
          }
          const ratio = s.cupo === 0 ? 0 : s.ocupados / s.cupo;
          const tone = ratio === 0
            ? 'bg-neutral-50 border-neutral-200 text-neutral-gray'
            : ratio < 1
              ? 'bg-progreen-light/20 border-progreen-light text-progreen-deep'
              : 'bg-red-50 border-red-200 text-red-700';
          return (
            <div className={`rounded border px-2 py-1 ${tone}`}>
              <div className="text-xs font-semibold leading-tight">
                {s.activityName}
              </div>
              <div className="text-[10px] mt-0.5">
                {s.ocupados}/{s.cupo}
              </div>
            </div>
          );
        }}
      />

      {seleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSeleccionado(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-lg font-semibold text-kineblue-deep">
                  {seleccionado.activityName}
                </h3>
                <p className="text-sm text-neutral-gray">
                  {new Date(seleccionado.startsAt).toLocaleString('es-AR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="text-xs">
                Cupo {seleccionado.ocupados}/{seleccionado.cupo}
                {seleccionado.cancelado && <span className="ml-2 text-red-600">Cancelado</span>}
              </span>
            </div>

            {seleccionado.pacientes.length === 0 ? (
              <p className="text-sm text-neutral-gray mt-4">
                Sin pacientes inscriptos.
              </p>
            ) : (
              <ul className="mt-4 space-y-1 text-sm">
                {seleccionado.pacientes.map((p) => (
                  <li key={p.appointmentId} className="border border-neutral-200 rounded-md px-3 py-2 flex items-center justify-between">
                    <span><strong>{p.paciente.nombre} {p.paciente.apellido}</strong></span>
                    <span className="text-[11px] text-kineblue">{p.status}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 mt-6 justify-end">
              <button className="btn-outline" onClick={() => setSeleccionado(null)}>Cerrar</button>
              {!seleccionado.cancelado && (
                <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => cancelarSlot(seleccionado.id)}>
                  Cancelar turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
