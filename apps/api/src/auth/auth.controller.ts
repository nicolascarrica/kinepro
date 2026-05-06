import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './jwt-payload.type';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  RequestResetDto,
  ResetPasswordDto,
  UnlockAccountDto,
  UpdateProfileDto,
} from './auth.dto';

/**
 * Cubre las HU del epica "Control de accesos":
 *   - Registrar usuario
 *   - Iniciar sesion / Cerrar sesion
 *   - Modificar contrasena
 *   - Restablecer contrasena
 *   - Desbloquear cuenta
 *   - Modificar datos personales
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout() {
    // Con JWT puro el "logout" es client-side: borrar token.
    // Lo dejamos endpoint para que el front pueda llamarlo y
    // logguear la accion (HU "Cerrar sesion").
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.sub, dto);
  }

  @Post('request-reset')
  @HttpCode(200)
  requestReset(@Body() dto: RequestResetDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('unlock-account')
  @HttpCode(200)
  unlockAccount(@Body() dto: UnlockAccountDto) {
    return this.auth.unlockAccount(dto);
  }
}
