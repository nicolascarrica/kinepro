import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, AppointmentType, Role } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const HORAS_LIMITE_REPROGRAMAR = 48;
const MAX_REPROGRAMACIONES = 2;

/**
 * Cubre las HU de turnos:
 *   #32 Reservar turno por demanda
 *   #33 Reprogramar turno
 *   #34 Cancelar turno (paciente)
 *   #42 Reserva de turnos fijos (mensual)
 *   Visualizar turnos pendientes / pasados / historial
 *   Controlar asistencia
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  // ---------------------------------------------------------------
  //  HU #32 Reservar turno por demanda
  // ---------------------------------------------------------------
  async reservar(pacienteId: string, slotId: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        activity: true,
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
            },
          },
        },
      },
    });
    if (!slot) throw new NotFoundException('Turno inexistente');
    if (slot.cancelado) {
      throw new BadRequestException('El turno fue cancelado por el centro');
    }
    if (slot.startsAt < new Date()) {
      throw new BadRequestException('No se puede reservar un turno pasado');
    }

    if (slot.appointments.length >= slot.cupo) {
      throw new BadRequestException(
        'La actividad no posee cupos en el día y horario seleccionado',
      );
    }

    // El paciente no puede tener otro turno en el mismo horario.
    const otroEnMismoHorario = await this.prisma.appointment.findFirst({
      where: {
        pacienteId,
        status: {
          in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
        },
        slot: { startsAt: slot.startsAt },
      },
    });
    if (otroEnMismoHorario) {
      throw new BadRequestException(
        'El paciente ya posee un turno para una actividad en el día y horario seleccionado',
      );
    }

    const settings = await this.settings.get();
    const paciente = await this.prisma.user.findUnique({
      where: { id: pacienteId },
    });
    const descuento = paciente?.planMensual ? settings.descuentoMensual : 0;
    const precio = settings.precioPorSesion * (1 - descuento / 100);

    const appointment = await this.prisma.appointment.create({
      data: {
        pacienteId,
        slotId,
        activityId: slot.activityId,
        type: AppointmentType.POR_DEMANDA,
        status: AppointmentStatus.RESERVADO,
        precio,
        descuentoPct: descuento,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: pacienteId,
        channel: 'IN_APP',
        kind: 'TURNO_CONFIRMADO',
        asunto: 'Turno confirmado',
        cuerpo: `Su turno para la actividad ${slot.activity.nombre} ha sido confirmado para el día ${slot.startsAt.toLocaleDateString('es-AR')} a las ${slot.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs.`,
      },
    });

    return { ...appointment, mensaje: 'Reserva exitosa' };
  }

  // ---------------------------------------------------------------
  //  HU #42 Reserva de turnos fijos
  //  Reserva 4 sesiones del mismo (actividad, dia de semana, hora)
  //  durante el mes que arranca en `desde`.
  // ---------------------------------------------------------------
  async reservarMensual(
    pacienteId: string,
    activityId: string,
    desde: Date,
  ) {
    const dow = desde.getDay();
    const hora = desde.getHours();
    if (dow < 1 || dow > 5) {
      throw new BadRequestException('El día se encuentra fuera del rango semanal');
    }
    // 4 sesiones consecutivas semana a semana.
    const fechas: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const f = new Date(desde);
      f.setDate(f.getDate() + i * 7);
      fechas.push(f);
    }

    // Buscar los slots correspondientes.
    const slots = await this.prisma.slot.findMany({
      where: {
        activityId,
        startsAt: { in: fechas },
      },
      include: {
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
            },
          },
        },
      },
    });

    if (slots.length < 4) {
      throw new BadRequestException(
        'No se encuentra disponibilidad de días para la fecha seleccionada',
      );
    }
    for (const s of slots) {
      if (s.cancelado || s.appointments.length >= s.cupo) {
        throw new BadRequestException(
          'No se encuentra disponibilidad de días para la fecha seleccionada',
        );
      }
    }
    // Validar que el paciente no tenga otro turno en esos horarios.
    for (const s of slots) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          pacienteId,
          status: {
            in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
          },
          slot: { startsAt: s.startsAt },
        },
      });
      if (conflict) {
        throw new BadRequestException(
          'El paciente ya posee un turno para una actividad en el día y horario seleccionado',
        );
      }
    }

    // Calcular descuento (HU #42): 20% si plan mensual y sin
    // ausencias ni reprogramaciones acumuladas en el mes.
    const paciente = await this.prisma.user.findUnique({
      where: { id: pacienteId },
    });
    const settings = await this.settings.get();

    const ausencias = await this.prisma.appointment.count({
      where: { pacienteId, status: AppointmentStatus.AUSENTE },
    });
    const reprogramaciones = await this.prisma.appointment.aggregate({
      where: { pacienteId },
      _sum: { reprogramacionesUsadas: true },
    });
    const reprogTotal = reprogramaciones._sum.reprogramacionesUsadas ?? 0;

    const elegibleDescuento =
      paciente?.planMensual && ausencias < 2 && reprogTotal < 2;
    const descuento = elegibleDescuento ? settings.descuentoMensual : 0;
    const precioPorSesion = settings.precioPorSesion * (1 - descuento / 100);

    // Crear MonthlyBooking + 4 appointments + notificacion.
    const booking = await this.prisma.$transaction(async (tx) => {
      const mb = await tx.monthlyBooking.create({
        data: {
          pacienteId,
          desde: slots[0].startsAt,
          hasta: slots[3].startsAt,
        },
      });
      for (const s of slots) {
        await tx.appointment.create({
          data: {
            pacienteId,
            slotId: s.id,
            activityId: s.activityId,
            type: AppointmentType.FIJO,
            status: AppointmentStatus.RESERVADO,
            precio: precioPorSesion,
            descuentoPct: descuento,
            monthlyBookingId: mb.id,
          },
        });
      }
      await tx.notification.create({
        data: {
          userId: pacienteId,
          channel: 'IN_APP',
          kind: 'TURNO_CONFIRMADO',
          asunto: 'Reserva mensual confirmada',
          cuerpo: `Se reservaron 4 sesiones de ${slots[0].activityId} del ${slots[0].startsAt.toLocaleDateString('es-AR')} al ${slots[3].startsAt.toLocaleDateString('es-AR')}.${descuento > 0 ? ` Se aplicó un descuento del ${descuento}%.` : ''}`,
        },
      });
      return mb;
    });
    return {
      ok: true,
      mensaje: 'Reserva exitosa',
      monthlyBookingId: booking.id,
      sesiones: 4,
      descuentoPct: descuento,
    };
  }

  // ---------------------------------------------------------------
  //  HU #34 Cancelar turno (paciente)
  // ---------------------------------------------------------------
  async cancelar(pacienteId: string, appointmentId: string) {
    const ap = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true, activity: true },
    });
    if (!ap) throw new NotFoundException('Turno inexistente');
    if (ap.pacienteId !== pacienteId) {
      throw new ForbiddenException(
        'No podes cancelar un turno de otro paciente',
      );
    }
    if (ap.status !== AppointmentStatus.RESERVADO) {
      throw new BadRequestException('El turno ya no está reservado');
    }

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: ap.id },
        data: { status: AppointmentStatus.CANCELADO },
      }),
      this.prisma.notification.create({
        data: {
          userId: pacienteId,
          channel: 'IN_APP',
          kind: 'TURNO_CANCELADO',
          asunto: 'Turno cancelado',
          cuerpo: `Su turno del día ${ap.slot.startsAt.toLocaleDateString('es-AR')} a las ${ap.slot.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs ha sido cancelado.`,
        },
      }),
    ]);

    return { ok: true, mensaje: 'Turno cancelado' };
  }

  // ---------------------------------------------------------------
  //  HU #33 Reprogramar turno
  // ---------------------------------------------------------------
  async reprogramar(
    pacienteId: string,
    appointmentId: string,
    nuevoSlotId: string,
  ) {
    const original = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });
    if (!original) throw new NotFoundException('Turno inexistente');
    if (original.pacienteId !== pacienteId) {
      throw new ForbiddenException(
        'No podes reprogramar un turno de otro paciente',
      );
    }
    if (
      original.status !== AppointmentStatus.RESERVADO &&
      original.status !== AppointmentStatus.CANCELADO_CENTRO
    ) {
      throw new BadRequestException('El turno no puede reprogramarse');
    }

    const fueCanceladoCentro =
      original.status === AppointmentStatus.CANCELADO_CENTRO;

    if (!fueCanceladoCentro) {
      const horas =
        (original.slot.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (horas < HORAS_LIMITE_REPROGRAMAR) {
        throw new BadRequestException(
          'El límite de tiempo para reprogramar el turno no se alcanzó',
        );
      }
      if (original.reprogramacionesUsadas >= MAX_REPROGRAMACIONES) {
        throw new BadRequestException(
          'El paciente alcanzó el límite de reprogramaciones',
        );
      }
    }

    const nuevoSlot = await this.prisma.slot.findUnique({
      where: { id: nuevoSlotId },
      include: {
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
            },
          },
        },
      },
    });
    if (!nuevoSlot) throw new NotFoundException('Turno destino inexistente');
    if (nuevoSlot.cancelado) {
      throw new BadRequestException(
        'El turno destino fue cancelado por el centro',
      );
    }
    if (nuevoSlot.appointments.length >= nuevoSlot.cupo) {
      throw new BadRequestException('El nuevo turno no tiene cupos disponibles');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        pacienteId,
        status: {
          in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
        },
        slot: { startsAt: nuevoSlot.startsAt },
        NOT: { id: appointmentId },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        'Ya posee otro turno programado para ese día y horario',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: original.id },
        data: { status: AppointmentStatus.REPROGRAMADO },
      });
      return tx.appointment.create({
        data: {
          pacienteId,
          slotId: nuevoSlotId,
          activityId: nuevoSlot.activityId,
          type: original.type,
          status: AppointmentStatus.RESERVADO,
          precio: original.precio,
          descuentoPct: original.descuentoPct,
          reprogramacionesUsadas: fueCanceladoCentro
            ? original.reprogramacionesUsadas
            : original.reprogramacionesUsadas + 1,
        },
      });
    });
  }

  async historial(
    pacienteId: string,
    opts: { from?: Date; to?: Date; filtro?: 'PROXIMOS' | 'PASADOS' | 'TODOS' },
  ) {
    const where: any = { pacienteId };
    if (opts.filtro === 'PROXIMOS') {
      where.status = AppointmentStatus.RESERVADO;
      where.slot = { startsAt: { gte: new Date() } };
    } else if (opts.filtro === 'PASADOS') {
      where.slot = { startsAt: { lt: new Date() } };
    } else if (opts.from || opts.to) {
      where.slot = { startsAt: {} };
      if (opts.from) where.slot.startsAt.gte = opts.from;
      if (opts.to) where.slot.startsAt.lte = opts.to;
    }

    return this.prisma.appointment.findMany({
      where,
      include: { slot: true, activity: true, payment: true },
      orderBy: { slot: { startsAt: 'asc' } },
    });
  }

  async marcarAsistencia(
    actorRole: Role,
    slotId: string,
    dni: string,
    resultado: 'ASISTIO' | 'AUSENTE',
  ) {
    if (actorRole !== Role.ADMINISTRATIVO && actorRole !== Role.OWNER) {
      throw new ForbiddenException(
        'Solo personal interno puede marcar asistencia',
      );
    }
    const paciente = await this.prisma.user.findUnique({ where: { dni } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado por DNI');

    const ap = await this.prisma.appointment.findFirst({
      where: {
        slotId,
        pacienteId: paciente.id,
        status: AppointmentStatus.RESERVADO,
      },
      include: { slot: true },
    });
    if (!ap)
      throw new NotFoundException(
        'No hay reserva activa para ese paciente y turno',
      );

    const ahora = Date.now();
    const inicio = ap.slot.startsAt.getTime();
    if (ahora < inicio - 30 * 60 * 1000 || ahora > inicio + 60 * 60 * 1000) {
      throw new BadRequestException(
        'La opción no está habilitada en este momento',
      );
    }

    return this.prisma.appointment.update({
      where: { id: ap.id },
      data: {
        status:
          resultado === 'ASISTIO'
            ? AppointmentStatus.ASISTIO
            : AppointmentStatus.AUSENTE,
        attendanceMarkedAt: new Date(),
      },
    });
  }
}
