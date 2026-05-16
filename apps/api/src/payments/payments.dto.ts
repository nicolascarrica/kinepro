import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * HU #9 Registrar pago presencial.
 *  - Solo Administrativo / Owner.
 *  - Metodos: EFECTIVO o POSNET.
 *  - El monto es obligatorio.
 */
export class RegisterCashPaymentDto {
  @IsString() appointmentId!: string;
  @IsIn(['EFECTIVO', 'POSNET']) metodo!: 'EFECTIVO' | 'POSNET';
  @IsOptional() @IsNumber() @Min(0.01)
  monto?: number;
}

export class HistoryFilterDto {
  @IsOptional() @IsString() paciente?: string; // nombre/apellido o email
}
