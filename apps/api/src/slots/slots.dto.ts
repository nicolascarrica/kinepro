import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * HU "Crear turno":
 *   Reglas:
 *     - Duracion 60 minutos (implicito).
 *     - Solo lunes a viernes.
 *     - Hora de inicio entre 07:00 y 20:00 (cierre 21:00).
 *     - Cada horario es una franja unica con un cupo total
 *       compartido por todas las actividades.
 */
export class CreateSlotDto {
  @IsDateString() startsAt!: string; // ISO en hora local
  @IsInt() @Min(1) cupo!: number;
}

/**
 * Genera de un saque toda la semana (L-V) con un cupo dado.
 *  - desde: fecha YYYY-MM-DD del lunes.
 *  - cupo: cupo total por horario.
 *  - horaInicio / horaFin: rango horario (default 7-20).
 */
export class GenerateWeekDto {
  @IsDateString() desde!: string;
  @IsInt() @Min(1) cupo!: number;
  @IsOptional() @IsInt() horaInicio?: number;
  @IsOptional() @IsInt() horaFin?: number;
}

export class CancelSlotDto {
  @IsString() motivo!: string;
}
