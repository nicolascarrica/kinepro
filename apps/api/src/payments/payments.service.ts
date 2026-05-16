import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCashPaymentDto } from './payments.dto';

/**
 * HU #9 "Registrar pago presencial" + HU #12 "Generar comprobante".
 *
 * Cuando se registra el pago se genera el comprobante con el texto:
 *   "Se ha registrado un pago de $XXXX correspondiente al turno
 *    del día DDD DD/MM a las HH:MMhs."
 * Esa notificacion va a la "bandeja" del paciente (campanita).
 */
@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------------
  //  Registro de pago presencial (admin/owner)
  // ----------------------------------------------------------
  async registerCash(dto: RegisterCashPaymentDto) {
    if (!dto.metodo) {
      throw new BadRequestException(
        'Debe seleccionar un método de pago para continuar',
      );
    }
    if (dto.monto == null) {
      throw new BadRequestException(
        'El monto es obligatorio para registrar el pago',
      );
    }
    if (dto.monto <= 0) {
      throw new BadRequestException(
        'El monto es obligatorio para registrar el pago',
      );
    }

    const ap = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { slot: true, paciente: true, payment: true },
    });
    if (!ap) throw new NotFoundException('Turno inexistente');
    if (ap.payment) {
      throw new BadRequestException(
        'El turno ya tiene un pago registrado',
      );
    }

    return this.confirmarPago({
      appointmentId: ap.id,
      pacienteId: ap.pacienteId,
      monto: dto.monto,
      metodo:
        dto.metodo === 'EFECTIVO'
          ? PaymentMethod.EFECTIVO
          : PaymentMethod.POSNET,
    });
  }

  // ----------------------------------------------------------
  //  Confirma un pago (sirve tanto para presencial como para
  //  online mockeado). Genera la notificacion comprobante.
  //  HU #12 Generar comprobante de pago.
  // ----------------------------------------------------------
  async confirmarPago(input: {
    appointmentId: string;
    pacienteId: string;
    monto: number;
    metodo: PaymentMethod;
    externalRef?: string;
  }) {
    const ap = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { slot: true },
    });
    if (!ap) throw new NotFoundException('Turno inexistente');

    const comprobanteId = randomBytes(6).toString('hex').toUpperCase();

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          appointmentId: input.appointmentId,
          pacienteId: input.pacienteId,
          monto: input.monto,
          metodo: input.metodo,
          status: PaymentStatus.APROBADO,
          externalRef: input.externalRef ?? null,
          comprobanteId,
        },
      });

      const cuerpo = `Se ha registrado un pago de $${input.monto} correspondiente al turno del día ${ap.slot.startsAt.toLocaleDateString(
        'es-AR',
        { weekday: 'long', day: '2-digit', month: '2-digit' },
      )} a las ${ap.slot.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs.`;

      await tx.notification.create({
        data: {
          userId: input.pacienteId,
          channel: 'EMAIL',
          kind: 'PAGO_REGISTRADO',
          asunto: 'Comprobante de pago',
          cuerpo,
        },
      });

      return p;
    });

    return { ...payment, mensaje: 'Pago registrado y comprobante generado' };
  }

  // ----------------------------------------------------------
  //  Listado de pagos para admin/owner.
  // ----------------------------------------------------------
  async list(filtroPaciente?: string) {
    const where: any = {};
    if (filtroPaciente) {
      where.paciente = {
        OR: [
          { nombre: { contains: filtroPaciente } },
          { apellido: { contains: filtroPaciente } },
          { email: { contains: filtroPaciente } },
          { dni: { contains: filtroPaciente } },
        ],
      };
    }
    const items = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true, email: true, dni: true } },
        appointment: {
          include: { slot: true, activity: true },
        },
      },
    });
    return items;
  }

  // ----------------------------------------------------------
  //  Pagos propios (paciente) - HU #12 escenario 3.
  // ----------------------------------------------------------
  async listMine(pacienteId: string) {
    return this.prisma.payment.findMany({
      where: { pacienteId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: { include: { slot: true, activity: true } },
      },
    });
  }

  // ----------------------------------------------------------
  //  Descarga de comprobante en texto plano.
  // ----------------------------------------------------------
  async comprobante(pacienteId: string, paymentId: string) {
    const p = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: { include: { slot: true, activity: true } },
        paciente: true,
      },
    });
    if (!p) throw new NotFoundException('Comprobante inexistente');
    if (p.pacienteId !== pacienteId) {
      throw new NotFoundException('Comprobante inexistente');
    }
    const slot = p.appointment.slot;
    const linea = (s: string) => s;
    return [
      linea('============================================'),
      linea('             KinePro - Comprobante         '),
      linea('============================================'),
      linea(`Comprobante #: ${p.comprobanteId}`),
      linea(`Fecha de pago : ${p.createdAt.toLocaleString('es-AR')}`),
      linea(`Paciente      : ${p.paciente.nombre} ${p.paciente.apellido}`),
      linea(`DNI           : ${p.paciente.dni ?? '-'}`),
      linea(`Email         : ${p.paciente.email}`),
      linea('--------------------------------------------'),
      linea(`Actividad     : ${p.appointment.activity.nombre}`),
      linea(
        `Turno         : ${slot.startsAt.toLocaleDateString('es-AR')} ${slot.startsAt.toLocaleTimeString(
          'es-AR',
          { hour: '2-digit', minute: '2-digit' },
        )}hs`,
      ),
      linea(`Método de pago: ${p.metodo}`),
      linea(`Monto         : $${p.monto}`),
      linea('============================================'),
    ].join('\n');
  }
}
