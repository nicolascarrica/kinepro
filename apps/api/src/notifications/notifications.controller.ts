import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HU "Recibir notificaciones de turnos" / "turnos liberados".
 * Listado in-app de notificaciones para el usuario actual.
 */
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { leida: true },
    });
  }
}
