import { Header } from './Header';

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        {children}
      </main>
      <footer className="bg-white border-t py-4 text-center text-xs text-neutral-gray">
        KinePro - 2026 &copy; Todos los derechos reservados.
      </footer>
    </>
  );
}
