'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

/**
 * Cubre dos HU del epica "Control de accesos":
 *   - Modificar datos personales
 *   - Modificar contrasena
 *
 * Las dos viven en la misma pantalla porque comparten contexto:
 * el usuario edita su perfil. Las validaciones (unicidad de email
 * y telefono, contrasena actual correcta, longitud minima de la
 * nueva, distinta de la actual) viven en el backend.
 */
export default function PerfilPage() {
  return (
    <AuthGuard>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const { user, refresh } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep mb-2">Mi perfil</h1>
      <p className="text-neutral-gray mb-6">
        Actualiza tus datos personales o cambia tu contrasena. El DNI no se
        puede modificar desde la app.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {user && <DatosForm onSaved={refresh} />}
        <PasswordForm />
      </div>
    </div>
  );
}

function DatosForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // sincronizar con el usuario logueado cuando llega
  useEffect(() => {
    if (user) {
      setForm({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono ?? '',
      });
    }
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await api('/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setInfo('Modificacion de datos exitosa');
      await onSaved();
    } catch (e: any) {
      setError(
        Array.isArray(e?.body?.message)
          ? e.body.message.join(' / ')
          : e?.body?.message ?? 'Error al modificar los datos',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card space-y-4" onSubmit={onSubmit}>
      <h2 className="font-semibold text-kineblue-deep">
        Modificar datos personales
      </h2>
      {error && <div className="alert-error">{error}</div>}
      {info && <div className="alert-ok">{info}</div>}
      <div>
        <label className="label">DNI</label>
        <input
          className="input opacity-60"
          value={user?.dni ?? ''}
          disabled
        />
        <p className="text-xs text-neutral-gray mt-1">
          El DNI no se puede modificar desde la app.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Apellido</label>
          <input
            className="input"
            required
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Telefono</label>
        <input
          className="input"
          required
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
      </div>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Guardando...' : 'Modificar datos'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({
    actual: '',
    nueva: '',
    repetir: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (form.nueva !== form.repetir) {
      setError('Las contrasenas nuevas no coinciden');
      return;
    }
    if (form.nueva.length < 8) {
      setError('La contrasena debe contener minimo 8 caracteres');
      return;
    }

    setBusy(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ actual: form.actual, nueva: form.nueva }),
      });
      setInfo('Modificacion exitosa');
      setForm({ actual: '', nueva: '', repetir: '' });
    } catch (e: any) {
      setError(e?.body?.message ?? 'Error al cambiar la contrasena');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card space-y-4" onSubmit={onSubmit}>
      <h2 className="font-semibold text-kineblue-deep">
        Cambiar contrasena
      </h2>
      {error && <div className="alert-error">{error}</div>}
      {info && <div className="alert-ok">{info}</div>}
      <div>
        <label className="label">Contrasena actual</label>
        <input
          className="input"
          type="password"
          required
          value={form.actual}
          onChange={(e) => setForm({ ...form, actual: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Contrasena nueva (minimo 8 caracteres)</label>
        <input
          className="input"
          type="password"
          required
          value={form.nueva}
          onChange={(e) => setForm({ ...form, nueva: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Repetir contrasena nueva</label>
        <input
          className="input"
          type="password"
          required
          value={form.repetir}
          onChange={(e) => setForm({ ...form, repetir: e.target.value })}
        />
      </div>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Guardando...' : 'Cambiar contrasena'}
      </button>
      <p className="text-xs text-neutral-gray">
        Reglas: la nueva debe ser distinta a la actual y tener al menos 8
        caracteres. Si la actual es incorrecta, el sistema lo informa.
      </p>
    </form>
  );
}
