import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.type';
import { PaymentsService } from './payments.service';
import { RegisterCashPaymentDto } from './payments.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  /** HU #9 Registrar pago presencial */
  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Post('cash')
  cash(@Body() dto: RegisterCashPaymentDto) {
    return this.svc.registerCash(dto);
  }

  /** Listado para admin/owner (consultar historial de pagos) */
  @Roles(Role.ADMINISTRATIVO, Role.OWNER)
  @Get()
  list(@Query('paciente') paciente?: string) {
    return this.svc.list(paciente);
  }

  /** HU #12 - Mis pagos (paciente) */
  @Roles(Role.PACIENTE)
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.svc.listMine(user.sub);
  }

  /** HU #12 escenario 3 - Descarga de comprobante */
  @Roles(Role.PACIENTE)
  @Get('mine/:id/comprobante')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async comprobante(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const txt = await this.svc.comprobante(user.sub, id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="kinepro-comprobante-${id}.txt"`,
    );
    return txt;
  }
}
