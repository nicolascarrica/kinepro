'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Slot {
  id: string;
  activityId: string;
  activityName: string;
  startsAt: string;
  cupo: number;
  ocupados: number;
  cancelado: boolean;
}

/**
 * HU #42 Reserva de turnos fijos.
 * El paciente elige actividad + día de la semana + hora; el sistema
 * reserva 4 sesiones consecutivas del mismo (actividad, día, hora).
 */
export default function ReservarMensualPage() {
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
  const [activityId, setActivityId] = useState<string>('');
  const [diaSemana, setDiaSemana] = useState<number>(1);
  const [hora, setHora] = useState<number>(9);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const to = new Date(today); to.setDate(to.getDate() + 35);
    api<Slot[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    ).then(setSlots);
  }, []);

  // Detectar actividades disponibles
  const actividades = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of slots) map.set(s.activityId, s.activityName);
    return Array.from(map.entries());
  }, [slots]);
  useEffect(() => {
    if (!activityId && actividades[0]) setActivityId(actividades[0][0]);
  }, [activityId, actividades]);

  // Primer slot que matchea la selección y es futuro
  const primeraFecha = useMemo(() => {
    return slots
      .filter((s) =>
        s.activityId === activityId &&
        new Date(s.startsAt).getDay() === diaSemana &&
        new Date(s.startsAt).getHours() === hora &&
        new Date(s.startsAt) > new Date() &&
        !s.cancelado &&
        s.ocupados < s.cupo,
      )
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]?.startsAt;
  }, [slots, activityId, diaSemana, hora]);

  async function reservar(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!primeraFecha) {
      setError('No hay disponibilidad para la selección. Pedile al admin que cree los horarios.');
      return;
    }
    try {
      const r = await api<{ mensaje: string; descuentoPct: number; sesiones: number }>(
        '/appointments/reserve-monthly',
        {
          method: 'POST',
          body: JSON.stringify({ activityId, desde: primeraFecha }),
        },
      );
      setInfo(`${r.mensaje}. ${r.sesiones} sesiones reservadas${r.descuentoPct > 0 ? ` con descuento del ${r.descuentoPct}%` : ''}.`);
    } catch (e: any) {
      setError(e?.body?.message ?? 'No se pudo reservar');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
        Reserva mensual fija
      </h1>
      <p className="text-neutral-gray mb-4">
        Reservá el mismo día y horario durante 4 semanas seguidas. Si tenés
        plan mensual y no acumulaste penalizaciones, aplicamos el descuento.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      <form className="card max-w-xl space-y-4" onSubmit={reservar}>
        <div>
          <label className="label">Actividad</label>
          <select className="input" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
            {actividades.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Día de la semana</label>
            <select className="input" value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
              <option value={1}>Lunes</option>
              <option value={2}>Martes</option>
              <option value={3}>Miércoles</option>
              <option value={4}>Jueves</option>
              <option value={5}>Viernes</option>
            </select>
          </div>
          <div>
            <label className="label">Hora</label>
            <select className="input" value={hora} onChange={(e) => setHora(Number(e.target.value))}>
              {Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-neutral-gray">
          {primeraFecha
            ? <>Próxima sesión: <strong>{new Date(primeraFecha).toLocaleString('es-AR')}</strong> (se reservan también las 3 siguientes semanas)</>
            : <>No hay horario disponible para esa combinación.</>}
        </div>

        <button className="btn-success w-full" disabled={!primeraFecha}>
          Reservar 4 sesiones
        </button>
      </form>
    </div>
  );
}
