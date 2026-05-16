import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * HU #35 "Crear turno":
 *   - Duracion 60 minutos.
 *   - L a V, 07:00 a 20:00 (cierre 21:00).
 *   - Cada horario solo puede contener una actividad especifica.
 */
export class CreateSlotDto {
  @IsString() activityId!: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsInt() @Min(1) cupo?: number;
}

/**
 * Generar la semana de una actividad de un saque (utilidad admin).
 */
export class GenerateWeekDto {
  @IsString() activityId!: string;
  @IsDateString() desde!: string;
  @IsOptional() @IsInt() @Min(1) cupo?: number;
  @IsOptional() @IsInt() horaInicio?: number;
  @IsOptional() @IsInt() horaFin?: number;
}

export class CancelSlotDto {
  @IsString() motivo!: string;
}
