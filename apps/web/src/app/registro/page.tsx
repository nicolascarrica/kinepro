'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { api } from '@/lib/api';

/**
 * HU "Registrar usuario".
 *  Reglas de negocio aplicadas en backend:
 *    - DNI/email/telefono unicos
 *    - Edad >= 13
 *    - Contrasena minimo 8 caracteres
 *  Por eso aca solo armamos el form y mostramos el mensaje del backend.
 */
export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    telefono: '',
    edad: 25,
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validaciones con los mensajes EXACTOS de la HU #25 (en lugar de
    // dejar que el navegador muestre su propio mensaje de validacion).
    if (form.edad < 13) {
      setError('La edad mínima para registrarse es 13 años');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe contener mínimo 8 caracteres');
      return;
    }

    setBusy(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setOk(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setError(
        Array.isArray(e?.body?.message)
          ? e.body.message.join(' / ')
          : e?.body?.message ?? 'Error al registrarse',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-xl mx-auto card">
        <h1 className="text-2xl font-bold text-kineblue-deep mb-2">
          Crear cuenta
        </h1>
        <p className="text-sm text-neutral-gray mb-6">
          Necesitamos algunos datos para que puedas reservar turnos.
        </p>
        <form className="grid grid-cols-2 gap-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              required
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input
              className="input"
              required
              value={form.apellido}
              onChange={(e) => update('apellido', e.target.value)}
            />
          </div>
          <div>
            <label className="label">DNI</label>
            <input
              className="input"
              required
              pattern="\d{6,10}"
              value={form.dni}
              onChange={(e) => update('dni', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Edad</label>
            <input
              className="input"
              type="number"
              required
              value={form.edad}
              onChange={(e) => update('edad', Number(e.target.value))}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Telefono</label>
            <input
              className="input"
              required
              value={form.telefono}
              onChange={(e) => update('telefono', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Contraseña (mínimo 8 caracteres)</label>
            <input
              className="input"
              type="password"
              required
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          {error && (
            <div className="alert-error col-span-2">{error}</div>
          )}
          {ok && (
            <div className="alert-ok col-span-2">
              Registro exitoso. Te redirigimos al login...
            </div>
          )}
          <div className="col-span-2 flex items-center justify-between mt-2">
            <Link href="/login" className="text-sm text-neutral-gray hover:underline">
              Ya tengo cuenta
            </Link>
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Registrando...' : 'Registrarme'}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
