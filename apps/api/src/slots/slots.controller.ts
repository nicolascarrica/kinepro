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
import { SlotsService } from './slots.service';
import {
  CancelSlotDto,
  CreateSlotDto,
  GenerateWeekDto,
} from './slots.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('slots')
export class SlotsController {
  constructor(private svc: SlotsService) {}

  /**
   * Listar agenda. Cualquier usuario autenticado puede listar.
   */
  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.list({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post()
  create(@Body() dto: CreateSlotDto) {
    return this.svc.create(dto);
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post('week')
  generateWeek(@Body() dto: GenerateWeekDto) {
    return this.svc.generateWeek(dto);
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSlotDto) {
    return this.svc.cancel(id, dto.motivo);
  }
}
