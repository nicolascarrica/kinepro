'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { NotificationsBell } from './NotificationsBell';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-kineblue text-white shadow">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">KinePro</span>
          <span className="text-xs bg-progreen-deep rounded-full px-2 py-0.5">
            v0.1
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Inicio
              </Link>
              {user.role === 'PACIENTE' && (
                <>
                  <Link href="/turnos/reservar" className="hover:underline">
                    Reservar
                  </Link>
                  <Link href="/turnos/mis-turnos" className="hover:underline">
                    Mis turnos
                  </Link>
                  <Link href="/mis-pagos" className="hover:underline">
                    Mis pagos
                  </Link>
                </>
              )}
              {(user.role === 'ADMINISTRATIVO' || user.role === 'OWNER') && (
                <>
                  <Link href="/admin/agenda" className="hover:underline">
                    Agenda
                  </Link>
                  <Link href="/admin/actividades" className="hover:underline">
                    Actividades
                  </Link>
                  <Link href="/admin/turnos/crear" className="hover:underline">
                    Crear turno
                  </Link>
                  <Link href="/admin/pagos" className="hover:underline">
                    Pagos
                  </Link>
                </>
              )}
              {user.role === 'OWNER' && (
                <>
                  <Link href="/owner/usuarios" className="hover:underline">
                    Usuarios
                  </Link>
                  <Link href="/owner/configuracion" className="hover:underline">
                    Configuracion
                  </Link>
                </>
              )}
              <NotificationsBell />
              <Link
                href="/perfil"
                className="opacity-80 hidden md:inline hover:underline"
                title="Mi perfil"
              >
                {user.nombre}
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="text-xs underline opacity-90 hover:opacity-100"
              >
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="bg-progreen px-3 py-1 rounded-md hover:bg-progreen-deep"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
