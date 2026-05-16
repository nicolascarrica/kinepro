import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Role, UserStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  RequestResetDto,
  ResetPasswordDto,
  UnlockAccountDto,
  UpdateProfileDto,
} from './auth.dto';

/**
 * Logica de autenticacion y manejo de cuentas.
 * Cubre las HU del epica "Control de accesos".
 *
 * NOTA: Las "notificaciones" por mail se persisten en la tabla
 * Notification (canal EMAIL) en lugar de mandar mail real, asi se
 * puede demostrar el flujo en la demo sin depender de un SMTP.
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  // ----------------------------------------------------------
  //  HU "Registrar usuario"
  // ----------------------------------------------------------
  async register(dto: RegisterDto) {
    // Las validaciones de unicidad se hacen aca para devolver mensajes
    // claros y especificos como pide el escenario "fallido por X registrado".
    const conflictDni = await this.prisma.user.findUnique({
      where: { dni: dto.dni },
    });
    if (conflictDni) {
      throw new BadRequestException('El DNI ya se encuentra registrado');
    }

    const conflictEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (conflictEmail) {
      throw new BadRequestException('El email ya se encuentra registrado');
    }

    const conflictTel = await this.prisma.user.findUnique({
      where: { telefono: dto.telefono },
    });
    if (conflictTel) {
      throw new BadRequestException('El teléfono ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        role: Role.PACIENTE,
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        email: dto.email,
        telefono: dto.telefono,
        // edad se guarda como fechaNacimiento aproximada para no perder dato.
        fechaNacimiento: this.dateFromAge(dto.edad),
        passwordHash,
      },
    });

    // HU #25 escenario 1: "Registro exitoso".
    return { ...this.publicProfile(user), mensaje: 'Registro exitoso' };
  }

  // ----------------------------------------------------------
  //  HU "Iniciar sesion"
  //  Bloqueo de cuenta luego de N intentos fallidos consecutivos.
  // ----------------------------------------------------------
  async login(dto: LoginDto) {
    const max = Number(this.cfg.get('MAX_LOGIN_ATTEMPTS') ?? 3);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // No se confirma si el email existe o no.
      throw new UnauthorizedException('Datos incorrectos');
    }
    if (user.status === UserStatus.BLOQUEADO) {
      throw new UnauthorizedException('La cuenta fue bloqueada');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);

    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldBlock = attempts >= max;

      const unlockToken = shouldBlock ? randomBytes(24).toString('hex') : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          status: shouldBlock ? UserStatus.BLOQUEADO : UserStatus.ACTIVO,
          unlockToken,
        },
      });

      if (shouldBlock) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            channel: 'EMAIL',
            kind: 'CUENTA_BLOQUEADA',
            asunto: 'Tu cuenta de KinePro fue bloqueada',
            cuerpo: `Detectamos varios intentos fallidos. Para desbloquear tu cuenta utiliza el token: ${unlockToken}`,
          },
        });
        throw new UnauthorizedException(
          'Datos incorrectos. La cuenta fue bloqueada y se le envió un mail al correo asociado para desbloquearla',
        );
      }
      throw new UnauthorizedException('Datos incorrectos');
    }

    // Login OK: reset de intentos fallidos.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0 },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: this.publicProfile(user),
    };
  }

  // ----------------------------------------------------------
  //  HU "Modificar contrasena"
  // ----------------------------------------------------------
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario inexistente');

    const ok = await bcrypt.compare(dto.actual, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (await bcrypt.compare(dto.nueva, user.passwordHash)) {
      throw new BadRequestException(
        'La contraseña nueva debe ser distinta a la actual',
      );
    }

    const passwordHash = await bcrypt.hash(dto.nueva, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordMustChange: false },
    });
    // HU #28 escenario 1: "Modificación exitosa".
    return { ok: true, mensaje: 'Modificación exitosa' };
  }

  // ----------------------------------------------------------
  //  HU "Modificar datos personales"
  // ----------------------------------------------------------
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (exists) {
        throw new BadRequestException('El mail ya se encuentra registrado');
      }
    }
    if (dto.telefono) {
      const exists = await this.prisma.user.findFirst({
        where: { telefono: dto.telefono, NOT: { id: userId } },
      });
      if (exists) {
        throw new BadRequestException('El telefono ya se encuentra registrado');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    // HU #31 escenario 1: "Modificación de datos exitosa".
    return {
      ...this.publicProfile(user),
      mensaje: 'Modificación de datos exitosa',
    };
  }

  // ----------------------------------------------------------
  //  HU "Restablecer contrasena"
  //  Importante: NO confirmar si el email existe o no.
  // ----------------------------------------------------------
  async requestPasswordReset(dto: RequestResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const mensaje =
      'Si la dirección proporcionada pertenece a una cuenta, recibirás un enlace para restablecer tu contraseña';

    if (!user) {
      return { ok: true, mensaje };
    }

    const token = randomBytes(24).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        channel: 'EMAIL',
        kind: 'CUENTA_BLOQUEADA',
        asunto: 'Restablece tu contrasena de KinePro',
        cuerpo: `Tu enlace de restablecimiento (token): ${token}`,
      },
    });

    return { ok: true, mensaje };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { resetToken: dto.token },
    });
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('El enlace de restablecimiento expiro');
    }

    if (await bcrypt.compare(dto.nueva, user.passwordHash)) {
      throw new BadRequestException('La contraseña debe ser distinta a la actual');
    }

    const passwordHash = await bcrypt.hash(dto.nueva, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        failedLoginAttempts: 0,
      },
    });

    // HU #29 escenario 3: "Restablecimiento exitoso".
    return { ok: true, mensaje: 'Restablecimiento exitoso' };
  }

  // ----------------------------------------------------------
  //  HU "Desbloquear cuenta"
  // ----------------------------------------------------------
  async unlockAccount(dto: UnlockAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { unlockToken: dto.token },
    });
    if (!user) {
      throw new BadRequestException('Enlace invalido');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        unlockToken: null,
        status: UserStatus.ACTIVO,
        failedLoginAttempts: 0,
      },
    });
    // HU #30 escenario 1: "Desbloqueo exitoso".
    return { ok: true, mensaje: 'Desbloqueo exitoso' };
  }

  // ----------------------------------------------------------
  //  Perfil "me"
  // ----------------------------------------------------------
  async getProfile(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('Usuario inexistente');
    return this.publicProfile(u);
  }

  // ----------------------------------------------------------
  //  Helpers
  // ----------------------------------------------------------
  private publicProfile(u: any) {
    return {
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono,
      dni: u.dni,
      role: u.role,
      planMensual: u.planMensual,
      status: u.status,
    };
  }

  private dateFromAge(age: number) {
    const now = new Date();
    return new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
  }
}
