import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '../common/enums';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HU NUEVA "Crear usuario interno" (Owner).
 * Solo permite roles ADMINISTRATIVO u OWNER.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        status: true,
        planMensual: true,
        createdAt: true,
      },
    });
  }

  async createInternal(input: {
    nombre: string;
    apellido: string;
    email: string;
    role: Role;
  }) {
    if (input.role === Role.PACIENTE) {
      throw new BadRequestException(
        'Solo se pueden crear cuentas internas con rol Administrativo u Owner',
      );
    }
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (exists) {
      throw new BadRequestException('El email ya se encuentra registrado');
    }

    const tempPassword = randomBytes(6).toString('hex'); // 12 chars
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email,
        role: input.role,
        passwordHash,
        passwordMustChange: true,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        channel: 'EMAIL',
        kind: 'CUENTA_BLOQUEADA',
        asunto: 'Bienvenido a KinePro - Cuenta interna',
        cuerpo: `Tu contrasena temporal es: ${tempPassword}. Debes cambiarla en el primer ingreso.`,
      },
    });

    return {
      ...user,
      tempPasswordPlain: tempPassword, // se devuelve solo en la respuesta
    };
  }

  async setPlanMensual(userId: string, planMensual: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { planMensual },
    });
  }
}
