import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsNumber } from 'class-validator';
import { Role } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsNumber() precioPorSesion!: number;
  @IsNumber() descuentoMensual!: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  get() {
    return this.svc.get();
  }

  @Roles(Role.OWNER)
  @Put()
  async update(@Body() dto: UpdateSettingsDto) {
    try {
      return await this.svc.update(dto.precioPorSesion, dto.descuentoMensual);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
