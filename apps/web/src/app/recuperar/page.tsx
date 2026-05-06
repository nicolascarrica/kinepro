'use client';

import { FormEvent, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { api } from '@/lib/api';

/**
 * HU "Restablecer contrasena" (parte 1: pedir enlace).
 * Importante: el backend NO confirma si el email existe (regla de negocio).
 */
export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ mensaje: string }>('/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMsg(r.mensaje);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto card">
        <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
          Recuperar contrasena
        </h1>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {msg && <div className="alert-ok">{msg}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Enviando...' : 'Obtener enlace'}
          </button>
        </form>
        <p className="text-xs text-neutral-gray mt-4">
          En el MVP el "enlace" se persiste como notificacion en la app del
          usuario para poder demostrarlo sin necesidad de un servidor SMTP real.
        </p>
      </div>
    </PageShell>
  );
}
