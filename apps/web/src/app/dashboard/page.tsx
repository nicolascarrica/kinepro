'use client';

import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth-context';

/**
 * Dashboard generico segun rol. Cada rol ve sus accesos directos.
 */
export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell>
        <Inner />
      </PageShell>
    </AuthGuard>
  );
}

function Inner() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-kineblue-deep">
        Hola {user.nombre} 👋
      </h1>
      <p className="text-neutral-gray">
        Tu rol: <strong>{user.role}</strong>
      </p>

      <section className="grid md:grid-cols-3 gap-4 mt-8">
        {user.role === 'PACIENTE' && (
          <>
            <Card title="Reservar turno" href="/turnos/reservar" desc="HU: Reservar turno por demanda" />
            <Card title="Mis turnos" href="/turnos/mis-turnos" desc="HU: Listar turnos / Consultar historial" />
            <Card title="Mis notificaciones" href="/notificaciones" desc="HU: Recibir notificaciones de turnos" />
            <Card title="Mi perfil" href="/perfil" desc="HU: Modificar datos personales / Modificar contraseña" />
          </>
        )}
        {(user.role === 'ADMINISTRATIVO' || user.role === 'OWNER') && (
          <>
            <Card title="Agenda general" href="/admin/agenda" desc="HU: Listar agenda general (HU NUEVA)" />
            <Card title="Actividades" href="/admin/actividades" desc="HU: Crear / Modificar / Eliminar actividad" />
            <Card title="Crear turno" href="/admin/turnos/crear" desc="HU: Crear turno" />
          </>
        )}
        {user.role === 'OWNER' && (
          <>
            <Card title="Usuarios internos" href="/owner/usuarios" desc="HU NUEVA: Crear usuario interno" />
            <Card title="Configuracion" href="/owner/configuracion" desc="HU NUEVA: Configurar precios y descuento" />
          </>
        )}
      </section>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href} className="card hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-kineblue-deep">{title}</h3>
      <p className="text-sm text-neutral-gray mt-1">{desc}</p>
      <div className="mt-3 text-progreen text-sm">Ir →</div>
    </Link>
  );
}
