import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

/**
 * HU "Reservar turno por demanda".
 * El paciente se infiere del JWT, no se pide en el body.
 *  - slotId: el horario al que quiere asistir
 *  - activityId: el tratamiento que elige (Tren superior / medio / inferior)
 */
export class ReserveDto {
  @IsString() slotId!: string;
  @IsString() activityId!: string;
}

export class RescheduleDto {
  @IsString() nuevoSlotId!: string;
  @IsOptional() @IsString() activityId?: string;
}

export class HistoryQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['PROXIMOS', 'TODOS']) filtro?: 'PROXIMOS' | 'TODOS';
}

export class AttendanceDto {
  @IsString() dni!: string;
  @IsIn(['ASISTIO', 'AUSENTE']) resultado!: 'ASISTIO' | 'AUSENTE';
}
