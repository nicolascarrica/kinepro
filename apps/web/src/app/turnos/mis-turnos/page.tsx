'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Appointment {
  id: string;
  status: string;
  reprogramacionesUsadas: number;
  precio: number;
  descuentoPct: number;
  slot: { id: string; startsAt: string };
  activity: { id: string; nombre: string };
}

interface FreeSlot {
  id: string;
  startsAt: string;
  cupo: number;
  ocupados: number;
  cancelado: boolean;
  activityId: string;
  activityName: string;
}

/**
 * HU "Visualizar turnos pendientes / pasados" + Cancelar + Reprogramar.
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
  const [filtro, setFiltro] = useState<'PROXIMOS' | 'PASADOS' | 'TODOS'>('PROXIMOS');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reprog, setReprog] = useState<Appointment | null>(null);

  async function load() {
    const data = await api<Appointment[]>(`/appointments/mine?filtro=${filtro}`);
    setItems(data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filtro]);

  async function cancelar(id: string) {
    setError(null); setInfo(null);
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
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-kineblue-deep">Mis turnos</h1>
        <div className="flex gap-2 text-sm">
          {(['PROXIMOS', 'PASADOS', 'TODOS'] as const).map((f) => (
            <button key={f} className={filtro === f ? 'btn-primary' : 'btn-outline'} onClick={() => setFiltro(f)}>
              {f === 'PROXIMOS' ? 'Próximos turnos' : f === 'PASADOS' ? 'Turnos pasados' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      {items === null ? (
        <p className="text-neutral-gray">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-gray">
          {filtro === 'PROXIMOS'
            ? 'Usted no posee turnos pendientes.'
            : filtro === 'PASADOS'
              ? 'Usted no posee turnos pasados.'
              : 'No se encuentran resultados.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-kineblue-deep">{a.activity.nombre}</h3>
                <p className="text-sm text-neutral-gray">
                  {new Date(a.slot.startsAt).toLocaleString('es-AR')}
                </p>
                <p className="text-xs mt-1">
                  Estado: <span className="font-medium text-kineblue">{a.status}</span>
                  {' · '}
                  Reprogramaciones: {a.reprogramacionesUsadas}/2
                  {' · '}
                  Precio: ${a.precio.toFixed(0)}
                  {a.descuentoPct > 0 && ` (descuento ${a.descuentoPct}%)`}
                </p>
              </div>
              {a.status === 'RESERVADO' && (
                <div className="flex gap-2">
                  <button className="btn-outline text-sm" onClick={() => setReprog(a)}>
                    Reprogramar
                  </button>
                  <button className="btn-outline text-sm" onClick={() => cancelar(a.id)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reprog && (
        <ReprogramarModal
          appointment={reprog}
          onClose={() => setReprog(null)}
          onOk={() => { setReprog(null); setInfo('Turno reprogramado'); load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function ReprogramarModal({ appointment, onClose, onOk, onError }: { appointment: Appointment; onClose: () => void; onOk: () => void; onError: (s: string) => void }) {
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [seleccion, setSeleccion] = useState<string>('');

  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const to = new Date(today); to.setDate(to.getDate() + 28);
    api<FreeSlot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(to.toISOString())}&activityId=${appointment.activity.id}`,
    ).then(setSlots);
  }, [appointment]);

  async function confirmar() {
    if (!seleccion) return;
    try {
      await api(`/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ nuevoSlotId: seleccion }),
      });
      onOk();
    } catch (e: any) {
      onError(e?.body?.message ?? 'Error');
    }
  }

  const libres = useMemo(
    () => slots.filter((s) => !s.cancelado && s.ocupados < s.cupo && new Date(s.startsAt) > new Date() && s.id !== appointment.slot.id),
    [slots, appointment],
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-kineblue-deep">Reprogramar turno</h3>
        <p className="text-sm text-neutral-gray mt-1">
          {appointment.activity.nombre} — {new Date(appointment.slot.startsAt).toLocaleString('es-AR')}
        </p>
        <label className="label mt-4">Nuevo horario disponible para {appointment.activity.nombre}</label>
        {libres.length === 0 ? (
          <p className="text-sm text-neutral-gray">No hay otros horarios disponibles en las próximas semanas.</p>
        ) : (
          <select className="input" value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
            <option value="">Elegí un horario</option>
            {libres.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.startsAt).toLocaleString('es-AR')} ({s.cupo - s.ocupados} libre)
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 mt-6 justify-end">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={confirmar} disabled={!seleccion}>
            Reprogramar
          </button>
        </div>
      </div>
    </div>
  );
}
