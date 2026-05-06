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
 * Cubre las HU de turnos del paciente y del personal:
 *   - Reservar turno por demanda  (HU)
 *   - Reservar turnos fijos       (HU - flujo extendible)
 *   - Cancelar turno (paciente)   (HU)
 *   - Reprogramar turno           (HU)
 *   - Listar turnos / Consultar historial
 *   - Controlar asistencia
 *
 * Modelo: cada Slot es una franja horaria con cupo total. Al reservar
 * el paciente elige tambien la actividad (tipo de tratamiento).
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  // ----------------------------------------------------------
  //  HU "Reservar turno por demanda"
  // ----------------------------------------------------------
  async reservar(pacienteId: string, slotId: string, activityId: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
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
    if (!slot) throw new NotFoundException('Horario inexistente');
    if (slot.cancelado) {
      throw new BadRequestException('El horario fue cancelado por el centro');
    }
    if (slot.startsAt < new Date()) {
      throw new BadRequestException('No se puede reservar un horario pasado');
    }

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException('Actividad inexistente');
    }

    // Cupo disponible (cupo total compartido entre actividades).
    if (slot.appointments.length >= slot.cupo) {
      throw new BadRequestException(
        'No hay cupos disponibles para el dia y horario seleccionado',
      );
    }

    // El paciente no puede tener otro turno en ese mismo slot.
    const yaReservado = await this.prisma.appointment.findFirst({
      where: {
        pacienteId,
        slotId,
        status: {
          in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
        },
      },
    });
    if (yaReservado) {
      throw new BadRequestException(
        'Ya tenes un turno reservado para ese horario',
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
        activityId,
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
        asunto: 'Tu turno fue confirmado',
        cuerpo: `Tu turno de "${activity.nombre}" para el ${slot.startsAt.toLocaleString('es-AR')} fue confirmado.`,
      },
    });

    return appointment;
  }

  // ----------------------------------------------------------
  //  HU "Cancelar turno (paciente)"
  // ----------------------------------------------------------
  async cancelar(pacienteId: string, appointmentId: string) {
    const ap = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true, activity: true },
    });
    if (!ap) throw new NotFoundException('Turno inexistente');
    if (ap.pacienteId !== pacienteId) {
      throw new ForbiddenException('No podes cancelar un turno de otro paciente');
    }
    if (ap.status !== AppointmentStatus.RESERVADO) {
      throw new BadRequestException('El turno ya no esta reservado');
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
          cuerpo: `Tu turno de "${ap.activity.nombre}" del ${ap.slot.startsAt.toLocaleString('es-AR')} fue cancelado.`,
        },
      }),
    ]);

    return { ok: true, mensaje: 'Turno cancelado' };
  }

  // ----------------------------------------------------------
  //  HU "Reprogramar turno"
  //  Reglas:
  //    - 48 hs de anticipacion al turno original.
  //    - Maximo 2 reprogramaciones.
  //    - Si el original fue cancelado por el centro, NO suma reprogramacion.
  //    - El paciente no puede tener otro turno en el nuevo horario.
  // ----------------------------------------------------------
  async reprogramar(
    pacienteId: string,
    appointmentId: string,
    nuevoSlotId: string,
    nuevaActivityId?: string,
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
          'El limite de tiempo para reprogramar el turno no se alcanzo',
        );
      }
      if (original.reprogramacionesUsadas >= MAX_REPROGRAMACIONES) {
        throw new BadRequestException(
          'El paciente alcanzo el limite de reprogramaciones',
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
    if (!nuevoSlot) throw new NotFoundException('Horario destino inexistente');
    if (nuevoSlot.cancelado) {
      throw new BadRequestException(
        'El horario destino fue cancelado por el centro',
      );
    }
    if (nuevoSlot.appointments.length >= nuevoSlot.cupo) {
      throw new BadRequestException(
        'El nuevo horario no tiene cupos disponibles',
      );
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        pacienteId,
        slotId: nuevoSlotId,
        status: {
          in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
        },
        NOT: { id: appointmentId },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        'Ya posee otro turno programado para ese horario',
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
          activityId: nuevaActivityId ?? original.activityId,
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

  // ----------------------------------------------------------
  //  HU "Consultar historial de turnos" / "Listar turnos paciente"
  // ----------------------------------------------------------
  async historial(
    pacienteId: string,
    opts: { from?: Date; to?: Date; filtro?: 'PROXIMOS' | 'TODOS' },
  ) {
    const where: any = { pacienteId };
    if (opts.filtro === 'PROXIMOS') {
      where.status = AppointmentStatus.RESERVADO;
      where.slot = { startsAt: { gte: new Date() } };
    } else if (opts.from || opts.to) {
      where.slot = { startsAt: {} };
      if (opts.from) where.slot.startsAt.gte = opts.from;
      if (opts.to) where.slot.startsAt.lte = opts.to;
    }

    return this.prisma.appointment.findMany({
      where,
      include: { slot: true, activity: true },
      orderBy: { slot: { startsAt: 'asc' } },
    });
  }

  // ----------------------------------------------------------
  //  HU "Controlar asistencia"
  //  Solo se puede registrar dentro de la ventana
  //  [startsAt - 30min, startsAt + 60min].
  // ----------------------------------------------------------
  async marcarAsistencia(
    actorRole: Role,
    slotId: string,
    dni: string,
    resultado: 'ASISTIO' | 'AUSENTE',
  ) {
    if (actorRole !== Role.ADMINISTRATIVO && actorRole !== Role.OWNER) {
      throw new ForbiddenException('Solo personal interno puede marcar asistencia');
    }
    const paciente = await this.prisma.user.findUnique({ where: { dni } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado por DNI');

    const ap = await this.prisma.appointment.findFirst({
      where: { slotId, pacienteId: paciente.id, status: AppointmentStatus.RESERVADO },
      include: { slot: true },
    });
    if (!ap) throw new NotFoundException('No hay reserva activa para ese paciente y turno');

    const ahora = Date.now();
    const inicio = ap.slot.startsAt.getTime();
    const ventanaInicio = inicio - 30 * 60 * 1000;
    const ventanaFin = inicio + 60 * 60 * 1000;

    if (ahora < ventanaInicio || ahora > ventanaFin) {
      throw new BadRequestException(
        'La opcion no esta habilitada en este momento',
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
