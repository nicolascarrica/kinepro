import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'KinePro - Gestion de turnos',
  description: 'Centro de atencion kinesiologica KinePro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
