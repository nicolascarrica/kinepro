'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Role } from '@/lib/auth-context';

export function AuthGuard({
  roles,
  children,
}: {
  roles?: Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, roles, router]);

  if (loading || !user) {
    return <div className="p-8 text-neutral-gray">Cargando...</div>;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8 text-red-700">
        No tenes permisos para acceder a esta pantalla.
      </div>
    );
  }
  return <>{children}</>;
}
