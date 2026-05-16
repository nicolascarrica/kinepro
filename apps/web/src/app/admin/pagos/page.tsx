'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Payment {
  id: string;
  monto: number;
  metodo: string;
  status: string;
  comprobanteId?: string | null;
  createdAt: string;
  paciente: { id: string; nombre: string; apellido: string; dni?: string | null };
  appointment: {
    id: string;
    slot: { startsAt: string };
    activity: { nombre: string };
  };
}

interface PendingAppointment {
  id: string;
  activity: { nombre: string };
  slot: { startsAt: string };
  paciente: { id: string; nombre: string; apellido: string; dni?: string | null };
}

/**
 * HU #9 Registrar pago presencial + listado historial de pagos.
 */
export default function PagosAdminPage() {
  return (
    <AuthGuard roles={['ADMINISTRATIVO', 'OWNER']}>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const [pagos, setPagos] = useState<Payment[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const url = filtro ? `/payments?paciente=${encodeURIComponent(filtro)}` : '/payments';
    setPagos(await api<Payment[]>(url));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-6">Pagos</h1>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-ok mb-4">{info}</div>}

      <FormRegistrar onDone={(msg) => { setInfo(msg); setError(null); load(); }} onError={(e) => { setError(e); setInfo(null); }} />

      <div className="card mt-6">
        <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
          <h2 className="font-semibold text-kineblue-deep">Historial de pagos</h2>
          <div className="flex gap-2">
            <input className="input" placeholder="Filtrar por paciente..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            <button className="btn-outline" onClick={load}>Buscar</button>
          </div>
        </div>
        {pagos === null ? (
          <p className="text-neutral-gray">Cargando...</p>
        ) : pagos.length === 0 ? (
          <p className="text-neutral-gray">No se encontraron pagos para los filtros seleccionados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-gray border-b">
                <th className="py-2">Fecha</th>
                <th>Paciente</th>
                <th>Turno</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{new Date(p.createdAt).toLocaleString('es-AR')}</td>
                  <td>{p.paciente.nombre} {p.paciente.apellido}</td>
                  <td>
                    {p.appointment.activity.nombre} —{' '}
                    {new Date(p.appointment.slot.startsAt).toLocaleString('es-AR')}
                  </td>
                  <td>{p.metodo}</td>
                  <td>${p.monto}</td>
                  <td className="text-xs">#{p.comprobanteId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormRegistrar({ onDone, onError }: { onDone: (m: string) => void; onError: (e: string) => void }) {
  const [pendientes, setPendientes] = useState<PendingAppointment[]>([]);
  const [appointmentId, setAppointmentId] = useState('');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'POSNET'>('EFECTIVO');
  const [monto, setMonto] = useState<number | ''>('');

  async function cargarPendientes() {
    // Recurrimos al endpoint /slots para listar slots con appointments,
    // pero filtramos por pagos pendientes haciendo cruz con /payments.
    // Para simplicidad MVP, listamos todos los appointments del admin
    // via /slots y permitimos elegir.
    const today = new Date(); today.setDate(today.getDate() - 7);
    const to = new Date(today); to.setDate(to.getDate() + 14);
    const slots = await api<any[]>(
      `/slots?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    );
    const items: PendingAppointment[] = [];
    for (const s of slots) {
      for (const p of s.pacientes ?? []) {
        items.push({
          id: p.appointmentId,
          activity: { nombre: s.activityName },
          slot: { startsAt: s.startsAt },
          paciente: p.paciente,
        });
      }
    }
    setPendientes(items);
  }

  useEffect(() => { cargarPendientes(); }, []);

  async function registrar(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ mensaje: string }>('/payments/cash', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId,
          metodo,
          monto: monto === '' ? undefined : monto,
        }),
      });
      onDone(r.mensaje);
      setAppointmentId(''); setMonto('');
      await cargarPendientes();
    } catch (e: any) {
      onError(e?.body?.message ?? 'Error');
    }
  }

  return (
    <form className="card max-w-2xl space-y-4" onSubmit={registrar}>
      <h2 className="font-semibold text-kineblue-deep">Registrar pago presencial</h2>
      <div>
        <label className="label">Turno del paciente</label>
        <select className="input" required value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
          <option value="">Elegí un turno</option>
          {pendientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.paciente.nombre} {p.paciente.apellido} — {p.activity.nombre} — {new Date(p.slot.startsAt).toLocaleString('es-AR')}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Método</label>
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value as any)}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="POSNET">Posnet</option>
          </select>
        </div>
        <div>
          <label className="label">Monto</label>
          <input className="input" type="number" min={1} value={monto} onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      </div>
      <button className="btn-primary w-full">Registrar pago</button>
      <p className="text-xs text-neutral-gray">
        El comprobante se genera automáticamente y se envía al paciente como
        notificación (HU #12).
      </p>
    </form>
  );
}
