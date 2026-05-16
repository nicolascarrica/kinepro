import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * HU "Registrar usuario":
 *   - DNI, email y telefono son unicos.
 *   - Edad >= 13.
 *   - Contrasena con minimo 8 caracteres.
 */
export class RegisterDto {
  @IsString() nombre!: string;
  @IsString() apellido!: string;
  @IsString() @Matches(/^\d{6,10}$/) dni!: string;
  @IsEmail() email!: string;
  @IsString() telefono!: string;
  @IsInt() @Min(13, { message: 'La edad mínima para registrarse es 13 años' })
  edad!: number;
  @IsString() @MinLength(8, { message: 'La contraseña debe contener mínimo 8 caracteres' })
  password!: string;
}

/**
 * HU "Iniciar sesion": email + password.
 */
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

/**
 * HU "Modificar contrasena":
 *   - Debe pedir la contrasena actual.
 *   - La nueva debe ser distinta y >= 8 caracteres.
 */
export class ChangePasswordDto {
  @IsString() actual!: string;
  @IsString() @MinLength(8) nueva!: string;
}

/**
 * HU "Modificar datos personales":
 *   Permite editar email y telefono. DNI no se modifica desde la app.
 */
export class UpdateProfileDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() apellido?: string;
}

/**
 * HU "Restablecer contrasena": pedir enlace por email.
 *   - No se confirma si el email existe (regla de negocio).
 */
export class RequestResetDto {
  @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) nueva!: string;
}

/**
 * HU "Desbloquear cuenta".
 */
export class UnlockAccountDto {
  @IsString() token!: string;
}
