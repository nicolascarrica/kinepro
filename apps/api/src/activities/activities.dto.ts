import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateActivityDto {
  @IsString() nombre!: string;
  @IsInt() @Min(1, { message: 'No se pueden crear actividades sin capacidad' })
  capacidad!: number;
  @IsOptional() @IsString() descripcion?: string;
}

export class UpdateActivityDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsInt() @Min(1, {
    message: 'La actividad no puede tener capacidad 0',
  })
  capacidad?: number;
  @IsOptional() @IsString() descripcion?: string;
}
