import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto, UpdateActivityDto } from './activities.dto';

/**
 * HU "Crear / Modificar / Eliminar actividad".
 * Las restricciones funcionales viven aca, no en el controller.
 */
@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.activity.findMany({ orderBy: { nombre: 'asc' } });
  }

  async create(dto: CreateActivityDto) {
    const exists = await this.prisma.activity.findUnique({
      where: { nombre: dto.nombre },
    });
    if (exists) {
      throw new BadRequestException('La actividad ya se encuentra registrada');
    }
    return this.prisma.activity.create({ data: dto });
  }

  async update(id: string, dto: UpdateActivityDto) {
    const current = await this.prisma.activity.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Actividad inexistente');

    if (dto.nombre && dto.nombre !== current.nombre) {
      const conflict = await this.prisma.activity.findUnique({
        where: { nombre: dto.nombre },
      });
      if (conflict) {
        throw new BadRequestException(
          'El nombre de la actividad ya se encuentra registrada',
        );
      }
    }

    return this.prisma.activity.update({ where: { id }, data: dto });
  }

  /**
   * HU "Eliminar actividad":
   *  - Falla si la actividad tiene turnos activos (reservas vigentes
   *    de pacientes en horarios futuros).
   */
  async remove(id: string) {
    const current = await this.prisma.activity.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Actividad inexistente');

    const turnosActivos = await this.prisma.appointment.count({
      where: {
        activityId: id,
        status: 'RESERVADO',
        slot: { startsAt: { gte: new Date() }, cancelado: false },
      },
    });
    if (turnosActivos > 0) {
      throw new BadRequestException(
        'Deben reprogramarse los turnos antes de eliminar una actividad',
      );
    }
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true, mensaje: 'La actividad se elimino con exito' };
  }
}
