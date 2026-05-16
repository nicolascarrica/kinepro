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
            <Card title="Reservar turno" href="/turnos/reservar" desc="HU #32: Reservar turno por demanda" />
            <Card title="Reservar mensualmente" href="/turnos/reservar-mensual" desc="HU #42: Reserva de turnos fijos" />
            <Card title="Mis turnos" href="/turnos/mis-turnos" desc="Visualizar / cancelar / reprogramar" />
            <Card title="Mis pagos" href="/mis-pagos" desc="HU #12: Comprobantes de pago" />
            <Card title="Mis notificaciones" href="/notificaciones" desc="HU: Recibir notificaciones de turnos" />
            <Card title="Mi perfil" href="/perfil" desc="HU #31 / #28: Modificar datos / contraseña" />
          </>
        )}
        {(user.role === 'ADMINISTRATIVO' || user.role === 'OWNER') && (
          <>
            <Card title="Agenda general" href="/admin/agenda" desc="HU #51: Visualizar turnos (personal)" />
            <Card title="Actividades" href="/admin/actividades" desc="HU #39/#40/#41: ABM de actividades" />
            <Card title="Crear turno" href="/admin/turnos/crear" desc="HU #35: Crear turno" />
            <Card title="Pagos" href="/admin/pagos" desc="HU #9: Registrar pago presencial" />
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
