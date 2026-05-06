import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto, GenerateWeekDto } from './slots.dto';

/**
 * HU "Crear turno", "Listar agenda" y "Cancelar turno por el centro".
 *
 * Reglas de negocio:
 *   - Lunes a Viernes (1..5).
 *   - 07:00 a 20:00 (no se puede crear turno que termine despues de 21:00).
 *   - Un solo slot por (fecha+hora) - cupo compartido entre todas las
 *     actividades.
 */
@Injectable()
export class SlotsService {
  // Constantes de negocio centralizadas para que sean faciles de
  // ajustar/discutir en la demo.
  static readonly HORA_APERTURA = 7;
  static readonly HORA_ULTIMO_INICIO = 20; // ultimo turno posible empieza a las 20
  static readonly DIAS_PERMITIDOS = [1, 2, 3, 4, 5]; // L-V (0=domingo)

  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------------
  //  HU "Listar agenda general (HU NUEVA)" + listado para reservar.
  // ------------------------------------------------------------------
  async list(opts: { from?: Date; to?: Date }) {
    const where: any = {};
    if (opts.from || opts.to) {
      where.startsAt = {};
      if (opts.from) where.startsAt.gte = opts.from;
      if (opts.to) where.startsAt.lt = opts.to;
    }

    const slots = await this.prisma.slot.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.RESERVADO, AppointmentStatus.ASISTIO],
            },
          },
          include: {
            activity: { select: { id: true, nombre: true } },
            paciente: { select: { id: true, nombre: true, apellido: true } },
          },
        },
      },
    });
    return slots.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      cupo: s.cupo,
      ocupados: s.appointments.length,
      cancelado: s.cancelado,
      pacientes: s.appointments.map((a) => ({
        appointmentId: a.id,
        paciente: a.paciente,
        actividad: a.activity,
        status: a.status,
      })),
    }));
  }

  // ------------------------------------------------------------------
  //  HU "Crear turno" (un solo horario)
  // ------------------------------------------------------------------
  async create(dto: CreateSlotDto) {
    const startsAt = new Date(dto.startsAt);
    this.validarRangoHorario(startsAt);
    this.validarDiaPermitido(startsAt);

    const existing = await this.prisma.slot.findUnique({
      where: { startsAt },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un horario para esa fecha y hora');
    }

    return this.prisma.slot.create({
      data: { startsAt, cupo: dto.cupo },
    });
  }

  // ------------------------------------------------------------------
  //  Generar agenda semanal de un saque (L-V x rango horario).
  //  Comodidad para la demo: con un click queda toda la semana lista.
  // ------------------------------------------------------------------
  async generateWeek(dto: GenerateWeekDto) {
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

    const creados: any[] = [];
    const omitidos: any[] = [];

    for (let dia = 0; dia < 5; dia++) {
      for (let h = horaInicio; h <= horaFin; h++) {
        const startsAt = new Date(desde);
        startsAt.setDate(startsAt.getDate() + dia);
        startsAt.setHours(h, 0, 0, 0);
        try {
          const slot = await this.prisma.slot.create({
            data: { startsAt, cupo: dto.cupo },
          });
          creados.push(slot);
        } catch (e: any) {
          if (e?.code === 'P2002') {
            // ya existia, lo omitimos sin abortar
            omitidos.push(startsAt);
          } else {
            throw e;
          }
        }
      }
    }
    return {
      ok: true,
      mensaje: `Generados ${creados.length} horarios. ${omitidos.length} ya existian y se omitieron.`,
      creados: creados.length,
      omitidos: omitidos.length,
    };
  }

  // ------------------------------------------------------------------
  //  HU NUEVA "Cancelar turno por el centro"
  // ------------------------------------------------------------------
  async cancel(id: string, motivo: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: {
        appointments: {
          where: { status: AppointmentStatus.RESERVADO },
          include: { paciente: true, activity: true },
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
            cuerpo: `El turno (${ap.activity.nombre}) del ${slot.startsAt.toLocaleString('es-AR')} fue cancelado. Motivo: ${motivo}. Podes reprogramarlo sin que cuente como reprogramacion propia.`,
          },
        });
      }
    });

    return { ok: true, mensaje: 'Turno cancelado por el centro' };
  }

  // ------------------------------------------------------------------
  //  Validadores de negocio
  // ------------------------------------------------------------------
  private validarRangoHorario(d: Date) {
    const hora = d.getHours();
    if (hora < SlotsService.HORA_APERTURA || hora > SlotsService.HORA_ULTIMO_INICIO) {
      throw new BadRequestException('El horario se encuentra fuera del rango horario');
    }
  }

  private validarDiaPermitido(d: Date) {
    if (!SlotsService.DIAS_PERMITIDOS.includes(d.getDay())) {
      throw new BadRequestException('El dia se encuentra fuera del rango semanal');
    }
  }
}
