import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsString } from 'class-validator';
import { Role } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

class CreateInternalDto {
  @IsString() nombre!: string;
  @IsString() apellido!: string;
  @IsEmail() email!: string;
  @IsIn([Role.ADMINISTRATIVO, Role.OWNER]) role!: Role;
}

class SetPlanDto {
  @IsBoolean() planMensual!: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Roles(Role.OWNER)
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles(Role.OWNER)
  @Post('internal')
  createInternal(@Body() dto: CreateInternalDto) {
    return this.svc.createInternal(dto);
  }

  @Roles(Role.OWNER, Role.ADMINISTRATIVO)
  @Patch(':id/plan')
  setPlan(@Param('id') id: string, @Body() dto: SetPlanDto) {
    return this.svc.setPlanMensual(id, dto.planMensual);
  }
}
