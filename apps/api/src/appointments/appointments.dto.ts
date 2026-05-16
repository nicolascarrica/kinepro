import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

/**
 * HU #32 "Reservar turno por demanda".
 * El paciente sale del JWT. La actividad sale del slot (HU v2:
 * cada horario solo puede contener una actividad).
 */
export class ReserveDto {
  @IsString() slotId!: string;
}

export class RescheduleDto {
  @IsString() nuevoSlotId!: string;
}

export class HistoryQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['PROXIMOS', 'PASADOS', 'TODOS'])
  filtro?: 'PROXIMOS' | 'PASADOS' | 'TODOS';
}

export class AttendanceDto {
  @IsString() dni!: string;
  @IsIn(['ASISTIO', 'AUSENTE']) resultado!: 'ASISTIO' | 'AUSENTE';
}

/**
 * HU #42 "Reserva de turnos fijos".
 * Reservar el mismo (actividad, dia de la semana, hora) en todo
 * un mes (4 sesiones aprox.).
 */
export class ReserveMonthlyDto {
  @IsString() activityId!: string;
  // ISO del primer dia (debe ser L-V y dentro del horario).
  @IsDateString() desde!: string;
}
