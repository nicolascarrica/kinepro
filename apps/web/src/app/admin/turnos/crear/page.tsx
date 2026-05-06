'use client';

import { FormEvent, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

/**
 * HU "Crear turno" (HU del admin).
 *
 * Cada horario es una franja con un cupo total compartido entre las
 * actividades. El paciente elige la actividad al reservar.
 *
 * Reglas (validadas en backend):
 *   - L-V, hora de inicio entre 07:00 y 20:00.
 *   - No puede haber otro horario para la misma fecha+hora.
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">
        Crear horario
      </h1>
      <div className="flex gap-2 mb-6 text-sm">
        <button
          className={tab === 'individual' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setTab('individual')}
        >
          Un horario
        </button>
        <button
          className={tab === 'semana' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setTab('semana')}
        >
          Generar semana entera
        </button>
      </div>

      {tab === 'individual' ? <FormIndividual /> : <FormSemana />}

      <p className="text-xs text-neutral-gray mt-6">
        Reglas: lunes a viernes, hora de inicio entre 07:00 y 20:00. Cada
        horario tiene un cupo total compartido entre las distintas
        actividades.
      </p>
    </div>
  );
}

function FormIndividual() {
  const [form, setForm] = useState({ fecha: '', hora: '09:00', cupo: 8 });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!form.fecha) return;
    const startsAt = new Date(`${form.fecha}T${form.hora}:00`);
    try {
      await api('/slots', {
        method: 'POST',
        body: JSON.stringify({
          startsAt: startsAt.toISOString(),
          cupo: form.cupo,
        }),
      });
      setInfo('Horario creado');
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Fecha (lunes a viernes)</label>
          <input
            className="input"
            type="date"
            required
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Hora de inicio</label>
          <select
            className="input"
            value={form.hora}
            onChange={(e) => setForm({ ...form, hora: e.target.value })}
          >
            {horas.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Cupo total (pacientes que entran)</label>
        <input
          className="input"
          type="number"
          min={1}
          value={form.cupo}
          onChange={(e) => setForm({ ...form, cupo: Number(e.target.value) })}
        />
      </div>
      <button className="btn-primary w-full">Crear horario</button>
    </form>
  );
}

function FormSemana() {
  const [form, setForm] = useState({
    desde: '',
    cupo: 8,
    horaInicio: 7,
    horaFin: 20,
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!form.desde) return;
    try {
      const r = await api<{ mensaje: string }>('/slots/week', {
        method: 'POST',
        body: JSON.stringify({
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
        <label className="label">Lunes de la semana</label>
        <input
          className="input"
          type="date"
          required
          value={form.desde}
          onChange={(e) => setForm({ ...form, desde: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Hora desde</label>
          <input
            className="input"
            type="number"
            min={7}
            max={20}
            value={form.horaInicio}
            onChange={(e) =>
              setForm({ ...form, horaInicio: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="label">Hora hasta</label>
          <input
            className="input"
            type="number"
            min={7}
            max={20}
            value={form.horaFin}
            onChange={(e) =>
              setForm({ ...form, horaFin: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="label">Cupo</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.cupo}
            onChange={(e) => setForm({ ...form, cupo: Number(e.target.value) })}
          />
        </div>
      </div>
      <button className="btn-success w-full">Generar semana</button>
      <p className="text-xs text-neutral-gray">
        Genera de lunes a viernes en el rango horario indicado, omitiendo los
        que ya existen.
      </p>
    </form>
  );
}
