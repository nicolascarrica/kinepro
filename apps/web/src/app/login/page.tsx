'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';

/**
 * HU "Iniciar sesion".
 * Cubre los escenarios de error: datos incorrectos, cuenta bloqueada,
 * etc., dejando que el backend devuelva el mensaje exacto.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error al iniciar sesion');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto card">
        <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
          Iniciar sesion
        </h1>
        <p className="text-sm text-neutral-gray mb-6">
          Accedé con tu email registrado.
        </p>
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
          <div>
            <label className="label">Contrasena</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>
        <div className="mt-4 text-sm text-neutral-gray flex justify-between">
          <Link href="/recuperar" className="hover:underline">
            Olvidé mi contrasena
          </Link>
          <Link href="/registro" className="hover:underline">
            Crear cuenta
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
