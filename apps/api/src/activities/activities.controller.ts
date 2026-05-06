import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './activities.dto';

/**
 * Listado publico (autenticado), ABM solo Administrativo y Owner.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private svc: ActivitiesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post()
  create(@Body() dto: CreateActivityDto) {
    return this.svc.create(dto);
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.svc.update(id, dto);
  }

  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
