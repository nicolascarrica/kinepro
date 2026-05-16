import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * HU #39 "Crear actividad" (v2): solo se pide el nombre.
 */
export class CreateActivityDto {
  @IsString() @MinLength(1) nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
}

/**
 * HU #40 "Modificar actividad" (v2): solo se modifica el nombre.
 */
export class UpdateActivityDto {
  @IsString() @MinLength(1) nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
}
