/**
 * Seed KinePro v2:
 *  - Cada (dia, hora) tiene UNA actividad asignada (HU v2 #35).
 *  - 3 actividades: Tren superior / medio / inferior con capacidad 8.
 *  - Lunes y miercoles: alterna superior/medio/inferior por hora.
 *  - Martes y jueves: idem.
 *  - Viernes: idem.
 *
 *  Login (todos comparten password):
 *    owner@kinepro.com / kinepro2026
 *    admin@kinepro.com / kinepro2026
 *    paciente1@kinepro.com / kinepro2026  (plan mensual)
 *    paciente2@kinepro.com / kinepro2026
 *    paciente3@kinepro.com / kinepro2026
 */
import { PrismaClient } from '@prisma/client';
import { Role } from '../src/common/enums';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const HORA_DESDE = 7;
const HORA_HASTA = 20;
const CUPO = 8;

function nextMondayDate() {
  const d = new Date();
  const dia = d.getDay();
  const offset = ((1 - dia + 7) % 7) || 7;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('[seed] limpiando base...');
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.monthlyBooking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  console.log('[seed] settings...');
  await prisma.settings.create({
    data: { id: 'singleton', precioPorSesion: 5000, descuentoMensual: 20 },
  });

  console.log('[seed] usuarios...');
  const pwd = await bcrypt.hash('kinepro2026', 10);
  const owner = await prisma.user.create({
    data: { role: Role.OWNER, nombre: 'Laura', apellido: 'Diaz', email: 'owner@kinepro.com', dni: '20111222', telefono: '221-111-1111', passwordHash: pwd },
  });
  const admin = await prisma.user.create({
    data: { role: Role.ADMINISTRATIVO, nombre: 'Maria', apellido: 'Lopez', email: 'admin@kinepro.com', dni: '21111222', telefono: '221-222-2222', passwordHash: pwd },
  });
  const p1 = await prisma.user.create({
    data: { role: Role.PACIENTE, nombre: 'Juan', apellido: 'Perez', email: 'paciente1@kinepro.com', dni: '30111222', telefono: '221-333-3333', planMensual: true, passwordHash: pwd },
  });
  const p2 = await prisma.user.create({
    data: { role: Role.PACIENTE, nombre: 'Ana', apellido: 'Gomez', email: 'paciente2@kinepro.com', dni: '30222333', telefono: '221-444-4444', passwordHash: pwd },
  });
  const p3 = await prisma.user.create({
    data: { role: Role.PACIENTE, nombre: 'Pedro', apellido: 'Ruiz', email: 'paciente3@kinepro.com', dni: '30333444', telefono: '221-555-5555', passwordHash: pwd },
  });

  console.log('[seed] actividades...');
  const trenSup = await prisma.activity.create({ data: { nombre: 'Tren superior', capacidad: CUPO, descripcion: 'Hombros, brazos, espalda alta' } });
  const trenMedio = await prisma.activity.create({ data: { nombre: 'Tren medio', capacidad: CUPO, descripcion: 'Core y zona media' } });
  const trenInf = await prisma.activity.create({ data: { nombre: 'Tren inferior', capacidad: CUPO, descripcion: 'Cadera, piernas' } });

  const actsPorHora = [trenSup, trenMedio, trenInf];

  console.log('[seed] agenda L-V de la semana proxima...');
  const lunes = nextMondayDate();
  for (let dia = 0; dia < 5; dia++) {
    for (let h = HORA_DESDE; h <= HORA_HASTA; h++) {
      const startsAt = new Date(lunes);
      startsAt.setDate(startsAt.getDate() + dia);
      startsAt.setHours(h, 0, 0, 0);
      // Rotacion: cada (dia, hora) tiene UNA actividad asignada.
      const act = actsPorHora[(dia + h) % actsPorHora.length];
      await prisma.slot.create({
        data: { activityId: act.id, startsAt, cupo: CUPO },
      });
    }
  }

  console.log('[seed] reserva de demo + notificacion...');
  const primer = await prisma.slot.findFirst({
    orderBy: { startsAt: 'asc' },
    include: { activity: true },
  });
  if (primer) {
    await prisma.appointment.create({
      data: {
        pacienteId: p1.id,
        slotId: primer.id,
        activityId: primer.activityId,
        precio: 5000 * 0.8,
        descuentoPct: 20,
      },
    });
    await prisma.notification.create({
      data: {
        userId: p1.id,
        kind: 'TURNO_CONFIRMADO',
        asunto: 'Turno confirmado',
        cuerpo: `Su turno para la actividad ${primer.activity.nombre} ha sido confirmado para el día ${primer.startsAt.toLocaleDateString('es-AR')} a las ${primer.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs.`,
      },
    });
  }

  console.log('[seed] OK', {
    owner: owner.email,
    admin: admin.email,
    pacientes: [p1.email, p2.email, p3.email],
    actividades: [trenSup.nombre, trenMedio.nombre, trenInf.nombre],
    slots: 5 * (HORA_HASTA - HORA_DESDE + 1),
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
