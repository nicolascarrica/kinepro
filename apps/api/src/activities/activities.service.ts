import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto, UpdateActivityDto } from './activities.dto';

/**
 * HU #39 "Crear actividad", #40 "Modificar actividad",
 * #41 "Eliminar actividad" segun HU v2.
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
    const a = await this.prisma.activity.create({ data: dto });
    return { ...a, mensaje: 'La actividad se creó con éxito' };
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
    const updated = await this.prisma.activity.update({
      where: { id },
      data: dto,
    });
    return { ...updated, mensaje: 'La actividad se modificó con éxito' };
  }

  async remove(id: string) {
    const current = await this.prisma.activity.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Actividad inexistente');

    const turnosActivos = await this.prisma.slot.count({
      where: {
        activityId: id,
        cancelado: false,
        startsAt: { gte: new Date() },
      },
    });
    if (turnosActivos > 0) {
      throw new BadRequestException(
        'Deben reprogramarse los turnos antes de eliminar una actividad',
      );
    }
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true, mensaje: 'La actividad se eliminó con éxito' };
  }
}
