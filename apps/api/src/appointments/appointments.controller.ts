import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.type';
import { AppointmentsService } from './appointments.service';
import {
  AttendanceDto,
  HistoryQueryDto,
  RescheduleDto,
  ReserveDto,
} from './appointments.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  /**
   * HU "Reservar turno por demanda".
   * Solo pacientes pueden reservar para si mismos.
   */
  @Roles(Role.PACIENTE)
  @Post('reserve')
  reserve(@CurrentUser() user: JwtPayload, @Body() dto: ReserveDto) {
    return this.svc.reservar(user.sub, dto.slotId, dto.activityId);
  }

  /**
   * HU "Cancelar turno (paciente)".
   */
  @Roles(Role.PACIENTE)
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.cancelar(user.sub, id);
  }

  /**
   * HU "Reprogramar turno".
   */
  @Roles(Role.PACIENTE)
  @Post(':id/reschedule')
  reschedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.svc.reprogramar(
      user.sub,
      id,
      dto.nuevoSlotId,
      dto.activityId,
    );
  }

  /**
   * HU "Consultar historial" / "Listar turnos paciente".
   */
  @Roles(Role.PACIENTE)
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload, @Query() q: HistoryQueryDto) {
    return this.svc.historial(user.sub, {
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      filtro: q.filtro,
    });
  }

  /**
   * HU "Controlar asistencia" (admin/owner).
   */
  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post('attendance/:slotId')
  attendance(
    @CurrentUser() user: JwtPayload,
    @Param('slotId') slotId: string,
    @Body() dto: AttendanceDto,
  ) {
    return this.svc.marcarAsistencia(user.role, slotId, dto.dni, dto.resultado);
  }
}
