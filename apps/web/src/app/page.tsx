import Link from 'next/link';
import { PageShell } from '@/components/PageShell';

export default function Home() {
  return (
    <PageShell>
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-kineblue-deep leading-tight">
            Reserva tu sesion en KinePro,
            <span className="text-progreen"> sin llamadas.</span>
          </h1>
          <p className="mt-4 text-neutral-gray text-lg">
            Centro de atencion kinesiologica. Eligi actividad, dia y horario,
            paga online y listo. Cancelas o reprogramas desde la app.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/registro" className="btn-success">
              Registrarme
            </Link>
            <Link href="/login" className="btn-outline">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <div className="card border-kineblue/20">
          <h2 className="text-xl font-semibold text-kineblue-deep mb-4">
            Como funciona
          </h2>
          <ol className="space-y-3 text-neutral-gray list-decimal list-inside">
            <li>Crea tu cuenta con tu DNI y email.</li>
            <li>Eligi una actividad.</li>
            <li>Reserva un turno en el horario que prefieras.</li>
            <li>Aboná online (Mercado Pago) o presencial.</li>
            <li>Recibí recordatorios y tu comprobante en la app.</li>
          </ol>
        </div>
      </section>
    </PageShell>
  );
}
