'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { api } from '@/lib/api';

/**
 * HU #30 "Desbloquear cuenta".
 * Permite ingresar el token recibido por mail y desbloquear la cuenta.
 */
export default function DesbloquearPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setBusy(true);
    try {
      const r = await api<{ mensaje?: string }>('/auth/unlock-account', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setMsg(r.mensaje ?? 'Desbloqueo exitoso');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setErr(e?.body?.message ?? 'Enlace inválido');
    } finally { setBusy(false); }
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto card">
        <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
          Desbloquear cuenta
        </h1>
        <p className="text-sm text-neutral-gray mb-4">
          Pegá el token que recibiste por mail para desbloquear tu cuenta.
        </p>
        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="input" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token de desbloqueo" />
          {err && <div className="alert-error">{err}</div>}
          {msg && <div className="alert-ok">{msg}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Procesando...' : 'Desbloquear cuenta'}
          </button>
        </form>
        <p className="text-xs text-neutral-gray mt-4">
          En el MVP el token se guarda en la "bandeja" de notificaciones del
          usuario (kind = CUENTA_BLOQUEADA). Para la demo, leelo desde la
          tabla Notification antes de venir aquí.
        </p>
      </div>
    </PageShell>
  );
}
