'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { api } from '@/lib/api';

/**
 * HU #29 "Restablecer contraseña" (paso 2).
 * El paciente ingresa el token recibido + nueva contraseña.
 * Reglas validadas en backend:
 *  - Token válido y no expirado.
 *  - Nueva distinta a la actual.
 *  - Mínimo 8 caracteres.
 */
export default function RestablecerPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState({ token: '', nueva: '', repetir: '' });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get('token');
    if (t) setForm((f) => ({ ...f, token: t }));
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (form.nueva !== form.repetir) {
      setErr('Las contraseñas nuevas no coinciden');
      return;
    }
    if (form.nueva.length < 8) {
      setErr('La contraseña debe contener mínimo 8 caracteres');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ mensaje?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: form.token, nueva: form.nueva }),
      });
      setOk(r.mensaje ?? 'Restablecimiento exitoso');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setErr(e?.body?.message ?? 'Error');
    } finally { setBusy(false); }
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto card">
        <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
          Restablecer contraseña
        </h1>
        <p className="text-sm text-neutral-gray mb-4">
          Ingresá el token recibido por mail y tu nueva contraseña.
        </p>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label">Token</label>
            <input className="input" required value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
          </div>
          <div>
            <label className="label">Nueva contraseña (mínimo 8)</label>
            <input className="input" type="password" required value={form.nueva} onChange={(e) => setForm({ ...form, nueva: e.target.value })} />
          </div>
          <div>
            <label className="label">Repetir contraseña</label>
            <input className="input" type="password" required value={form.repetir} onChange={(e) => setForm({ ...form, repetir: e.target.value })} />
          </div>
          {err && <div className="alert-error">{err}</div>}
          {ok && <div className="alert-ok">{ok}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Procesando...' : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
