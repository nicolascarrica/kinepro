/**
 * Seed de datos demo para KinePro.
 *  - 1 Owner, 1 Administrativo, 3 Pacientes (uno con plan mensual).
 *  - 3 Actividades: Tren superior, Tren medio, Tren inferior.
 *  - Slots para toda la semana proxima (L-V) en horarios 7..20 con
 *    cupo total 8 cada uno.
 *
 *  Login para la demo:
 *    owner@kinepro.com     / kinepro2026
 *    admin@kinepro.com     / kinepro2026
 *    paciente1@kinepro.com / kinepro2026 (con plan mensual)
 *    paciente2@kinepro.com / kinepro2026
 *    paciente3@kinepro.com / kinepro2026
 */
import { PrismaClient } from '@prisma/client';
import { Role } from '../src/common/enums';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CUPO_POR_HORARIO = 8;
const HORA_DESDE = 7;
const HORA_HASTA = 20;

function nextMondayDate(addDays = 0) {
  const d = new Date();
  const dia = d.getDay();
  const offsetAlLunes = ((1 - dia + 7) % 7) || 7;
  d.setDate(d.getDate() + offsetAlLunes + addDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('[seed] limpiando base...');
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  console.log('[seed] creando settings...');
  await prisma.settings.create({
    data: { id: 'singleton', precioPorSesion: 5000, descuentoMensual: 20 },
  });

  console.log('[seed] creando usuarios...');
  const pwd = await bcrypt.hash('kinepro2026', 10);
  const owner = await prisma.user.create({
    data: {
      role: Role.OWNER,
      nombre: 'Laura',
      apellido: 'Diaz',
      email: 'owner@kinepro.com',
      dni: '20111222',
      telefono: '221-111-1111',
      passwordHash: pwd,
    },
  });
  const admin = await prisma.user.create({
    data: {
      role: Role.ADMINISTRATIVO,
      nombre: 'Maria',
      apellido: 'Lopez',
      email: 'admin@kinepro.com',
      dni: '21111222',
      telefono: '221-222-2222',
      passwordHash: pwd,
    },
  });
  const p1 = await prisma.user.create({
    data: {
      role: Role.PACIENTE,
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'paciente1@kinepro.com',
      dni: '30111222',
      telefono: '221-333-3333',
      planMensual: true,
      passwordHash: pwd,
    },
  });
  const p2 = await prisma.user.create({
    data: {
      role: Role.PACIENTE,
      nombre: 'Ana',
      apellido: 'Gomez',
      email: 'paciente2@kinepro.com',
      dni: '30222333',
      telefono: '221-444-4444',
      passwordHash: pwd,
    },
  });
  const p3 = await prisma.user.create({
    data: {
      role: Role.PACIENTE,
      nombre: 'Pedro',
      apellido: 'Ruiz',
      email: 'paciente3@kinepro.com',
      dni: '30333444',
      telefono: '221-555-5555',
      passwordHash: pwd,
    },
  });

  console.log('[seed] creando actividades...');
  const trenSup = await prisma.activity.create({
    data: { nombre: 'Tren superior', capacidad: 8, descripcion: 'Hombros, brazos, espalda alta' },
  });
  const trenMedio = await prisma.activity.create({
    data: { nombre: 'Tren medio', capacidad: 8, descripcion: 'Core y zona media' },
  });
  const trenInf = await prisma.activity.create({
    data: { nombre: 'Tren inferior', capacidad: 8, descripcion: 'Cadera, piernas' },
  });

  console.log('[seed] creando agenda L-V de la semana proxima...');
  const lunes = nextMondayDate();
  for (let dia = 0; dia < 5; dia++) {
    for (let h = HORA_DESDE; h <= HORA_HASTA; h++) {
      const startsAt = new Date(lunes);
      startsAt.setDate(startsAt.getDate() + dia);
      startsAt.setHours(h, 0, 0, 0);
      await prisma.slot.create({
        data: { startsAt, cupo: CUPO_POR_HORARIO },
      });
    }
  }

  console.log('[seed] sembrando reserva de demo...');
  const slotEjemplo = await prisma.slot.findFirst({ orderBy: { startsAt: 'asc' } });
  if (slotEjemplo) {
    await prisma.appointment.create({
      data: {
        pacienteId: p1.id,
        slotId: slotEjemplo.id,
        activityId: trenSup.id,
        precio: 5000 * 0.8,
        descuentoPct: 20,
      },
    });
    await prisma.notification.create({
      data: {
        userId: p1.id,
        kind: 'TURNO_CONFIRMADO',
        asunto: 'Tu turno fue confirmado',
        cuerpo: `Tu turno de "Tren superior" para el ${slotEjemplo.startsAt.toLocaleString('es-AR')} fue confirmado.`,
      },
    });
  }

  console.log('[seed] OK', {
    owner: owner.email,
    admin: admin.email,
    p1: p1.email,
    p2: p2.email,
    p3: p3.email,
    actividades: [trenSup.nombre, trenMedio.nombre, trenInf.nombre],
    slotsCreados: 5 * (HORA_HASTA - HORA_DESDE + 1),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
