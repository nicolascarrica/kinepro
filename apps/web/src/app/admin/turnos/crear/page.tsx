'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  nombre: string;
  capacidad: number;
}

/**
 * HU #35 Crear turno (v2): cada horario tiene una unica actividad.
 *  - L-V, 07:00 a 20:00, no choque con otra actividad.
 */
export default function CrearTurnoPage() {
  return (
    <AuthGuard roles={['ADMINISTRATIVO', 'OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [tab, setTab] = useState<'individual' | 'semana'>('individual');
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api<Activity[]>('/activities').then(setActivities);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">Crear turno</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <button className={tab === 'individual' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('individual')}>
          Un turno
        </button>
        <button className={tab === 'semana' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('semana')}>
          Generar semana de una actividad
        </button>
      </div>

      {tab === 'individual' ? (
        <FormIndividual activities={activities} />
      ) : (
        <FormSemana activities={activities} />
      )}

      <p className="text-xs text-neutral-gray mt-6">
        Reglas: lunes a viernes, hora 07:00 a 20:00. Cada horario sólo puede
        contener una actividad específica.
      </p>
    </div>
  );
}

function FormIndividual({ activities }: { activities: Activity[] }) {
  const [form, setForm] = useState({ activityId: '', fecha: '', hora: '09:00', cupo: 8 });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (activities[0] && !form.activityId) {
      setForm((f) => ({ ...f, activityId: activities[0].id }));
    }
  }, [activities, form.activityId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!form.fecha) return;
    const startsAt = new Date(`${form.fecha}T${form.hora}:00`);
    try {
      const r = await api<{ mensaje?: string }>('/slots', {
        method: 'POST',
        body: JSON.stringify({
          activityId: form.activityId,
          startsAt: startsAt.toISOString(),
          cupo: form.cupo,
        }),
      });
      setInfo(r.mensaje ?? 'Turno creado');
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  const horas = Array.from({ length: 14 }, (_, i) => {
    const h = (7 + i).toString().padStart(2, '0');
    return `${h}:00`;
  });

  return (
    <form className="card max-w-xl space-y-4" onSubmit={onSubmit}>
      {error && <div className="alert-error">{error}</div>}
      {info && <div className="alert-ok">{info}</div>}
      <div>
        <label className="label">Actividad</label>
        <select className="input" required value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })}>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Fecha (L-V)</label>
          <input className="input" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </div>
        <div>
          <label className="label">Hora de inicio</label>
          <select className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })}>
            {horas.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Cupo de pacientes</label>
        <input className="input" type="number" min={1} value={form.cupo} onChange={(e) => setForm({ ...form, cupo: Number(e.target.value) })} />
      </div>
      <button className="btn-primary w-full">Crear turno</button>
    </form>
  );
}

function FormSemana({ activities }: { activities: Activity[] }) {
  const [form, setForm] = useState({ activityId: '', desde: '', cupo: 8, horaInicio: 7, horaFin: 20 });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (activities[0] && !form.activityId) {
      setForm((f) => ({ ...f, activityId: activities[0].id }));
    }
  }, [activities, form.activityId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!form.desde) return;
    try {
      const r = await api<{ mensaje: string }>('/slots/week', {
        method: 'POST',
        body: JSON.stringify({
          activityId: form.activityId,
          desde: new Date(`${form.desde}T00:00:00`).toISOString(),
          cupo: form.cupo,
          horaInicio: form.horaInicio,
          horaFin: form.horaFin,
        }),
      });
      setInfo(r.mensaje);
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <form className="card max-w-xl space-y-4" onSubmit={onSubmit}>
      {error && <div className="alert-error">{error}</div>}
      {info && <div className="alert-ok">{info}</div>}
      <div>
        <label className="label">Actividad</label>
        <select className="input" required value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })}>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Lunes de la semana</label>
        <input className="input" type="date" required value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Hora desde</label>
          <input className="input" type="number" min={7} max={20} value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Hora hasta</label>
          <input className="input" type="number" min={7} max={20} value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Cupo</label>
          <input className="input" type="number" min={1} value={form.cupo} onChange={(e) => setForm({ ...form, cupo: Number(e.target.value) })} />
        </div>
      </div>
      <button className="btn-success w-full">Generar semana de esa actividad</button>
      <p className="text-xs text-neutral-gray">
        Crea L-V en el rango horario indicado para la actividad elegida.
        Omite los horarios que ya estén ocupados (por la misma u otra actividad).
      </p>
    </form>
  );
}
