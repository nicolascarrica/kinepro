import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto, GenerateWeekDto } from './slots.dto';

/**
 * HU #35 "Crear turno", HU #51 "Visualizar turnos (personal)" y
 * la HU complementaria "Cancelar turno por el centro".
 *
 * Reglas v2:
 *   - L a V (1..5).
 *   - 07:00 a 20:00 (cierre 21:00).
 *   - Un solo slot por (actividad, dia, hora).
 *   - Cada (dia, hora) solo puede tener una actividad asignada.
 */
@Injectable()
export class SlotsService {
  static readonly HORA_APERTURA = 7;
  static readonly HORA_ULTIMO_INICIO = 20;
  static readonly DIAS_PERMITIDOS = [1, 2, 3, 4, 5];

  constructor(private prisma: PrismaService) {}

  async list(opts: { from?: Date; to?: Date; activityId?: string }) {
    const where: any = {};
    if (opts.from || opts.to) {
      where.startsAt = {};
      if (opts.from) where.startsAt.gte = opts.from;
      if (opts.to) where.startsAt.lt = opts.to;
    }
    if (opts.activityId) where.activityId = opts.activityId;

    const slots = await this.prisma.slot.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        activity: true,
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
            },
          },
          include: {
            paciente: { select: { id: true, nombre: true, apellido: true } },
          },
        },
      },
    });
    return slots.map((s) => ({
      id: s.id,
      activityId: s.activityId,
      activityName: s.activity.nombre,
      startsAt: s.startsAt,
      cupo: s.cupo,
      ocupados: s.appointments.length,
      cancelado: s.cancelado,
      pacientes: s.appointments.map((a) => ({
        appointmentId: a.id,
        paciente: a.paciente,
        status: a.status,
      })),
    }));
  }

  async create(dto: CreateSlotDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity) throw new NotFoundException('Actividad inexistente');

    const startsAt = new Date(dto.startsAt);
    this.validarRangoHorario(startsAt);
    this.validarDiaPermitido(startsAt);

    // Misma actividad + misma fecha/hora -> ya existe
    const sameActivitySlot = await this.prisma.slot.findFirst({
      where: { activityId: activity.id, startsAt },
    });
    if (sameActivitySlot) {
      throw new BadRequestException(
        'La actividad ya existe en el día y horario seleccionado',
      );
    }

    // Otra actividad en el mismo dia/hora -> ocupado
    const conflict = await this.prisma.slot.findFirst({
      where: { startsAt },
    });
    if (conflict) {
      throw new BadRequestException(
        'El día y horario se encuentra ocupado por otra actividad',
      );
    }

    const cupo = dto.cupo ?? activity.capacidad;
    const slot = await this.prisma.slot.create({
      data: { activityId: activity.id, startsAt, cupo },
    });
    return { ...slot, mensaje: 'Turno creado' };
  }

  async generateWeek(dto: GenerateWeekDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity) throw new NotFoundException('Actividad inexistente');

    const desde = new Date(dto.desde);
    desde.setHours(0, 0, 0, 0);
    if (desde.getDay() !== 1) {
      throw new BadRequestException('La fecha de inicio debe ser un lunes');
    }
    const horaInicio = dto.horaInicio ?? SlotsService.HORA_APERTURA;
    const horaFin = dto.horaFin ?? SlotsService.HORA_ULTIMO_INICIO;
    if (
      horaInicio < SlotsService.HORA_APERTURA ||
      horaFin > SlotsService.HORA_ULTIMO_INICIO ||
      horaFin < horaInicio
    ) {
      throw new BadRequestException('Rango horario invalido');
    }

    const cupo = dto.cupo ?? activity.capacidad;
    let creados = 0;
    let omitidos = 0;

    for (let dia = 0; dia < 5; dia++) {
      for (let h = horaInicio; h <= horaFin; h++) {
        const startsAt = new Date(desde);
        startsAt.setDate(startsAt.getDate() + dia);
        startsAt.setHours(h, 0, 0, 0);
        try {
          // Si existe slot de OTRA actividad en ese horario, lo saltamos.
          const conflict = await this.prisma.slot.findFirst({
            where: { startsAt, NOT: { activityId: activity.id } },
          });
          if (conflict) {
            omitidos++;
            continue;
          }
          await this.prisma.slot.create({
            data: { activityId: activity.id, startsAt, cupo },
          });
          creados++;
        } catch (e: any) {
          if (e?.code === 'P2002') {
            omitidos++;
          } else {
            throw e;
          }
        }
      }
    }
    return {
      ok: true,
      mensaje: `Generados ${creados} horarios. ${omitidos} ya existían o estaban ocupados por otra actividad.`,
      creados,
      omitidos,
    };
  }

  async cancel(id: string, motivo: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: {
        activity: true,
        appointments: {
          where: { status: AppointmentStatus.RESERVADO },
          include: { paciente: true },
        },
      },
    });
    if (!slot) throw new NotFoundException('Turno inexistente');

    const ahora = new Date();
    const fin = new Date(slot.startsAt.getTime() + 60 * 60 * 1000);
    if (fin < ahora) {
      throw new BadRequestException(
        'No es posible cancelar un turno ya finalizado',
      );
    }
    if (slot.cancelado) {
      throw new BadRequestException('El turno ya estaba cancelado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.slot.update({
        where: { id },
        data: { cancelado: true, motivoCancel: motivo },
      });
      for (const ap of slot.appointments) {
        await tx.appointment.update({
          where: { id: ap.id },
          data: { status: AppointmentStatus.CANCELADO_CENTRO },
        });
        await tx.notification.create({
          data: {
            userId: ap.pacienteId,
            channel: 'IN_APP',
            kind: 'TURNO_CANCELADO',
            asunto: 'Tu turno fue cancelado por el centro',
            cuerpo: `Su turno del día ${slot.startsAt.toLocaleString('es-AR')} (${slot.activity.nombre}) ha sido cancelado. Motivo: ${motivo}. Puede reprogramarlo sin que cuente como reprogramación propia.`,
          },
        });
      }
    });

    return { ok: true, mensaje: 'Turno cancelado por el centro' };
  }

  private validarRangoHorario(d: Date) {
    const hora = d.getHours();
    if (hora < SlotsService.HORA_APERTURA || hora > SlotsService.HORA_ULTIMO_INICIO) {
      throw new BadRequestException('El horario se encuentra fuera del rango horario');
    }
  }

  private validarDiaPermitido(d: Date) {
    if (!SlotsService.DIAS_PERMITIDOS.includes(d.getDay())) {
      throw new BadRequestException('El día se encuentra fuera del rango semanal');
    }
  }
}
