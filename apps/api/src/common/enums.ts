/**
 * "Enums" del dominio modelados como const objects + types.
 *
 * SQLite no soporta enums nativos en Prisma, por lo que el schema
 * los modela como String. Para mantener seguridad de tipo y poder
 * seguir usando `Role.PACIENTE` (en vez de strings sueltos) usamos
 * este patron `as const`. La forma de uso queda identica al typed
 * enum que generaba @prisma/client.
 *
 * Si en el futuro migran a PostgreSQL pueden volver a `enum X {}`
 * en el schema y reemplazar los imports `from '../common/enums'`
 * por `from '@prisma/client'` sin tocar nada mas.
 */

export const Role = {
  PACIENTE: 'PACIENTE',
  ADMINISTRATIVO: 'ADMINISTRATIVO',
  OWNER: 'OWNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVO: 'ACTIVO',
  BLOQUEADO: 'BLOQUEADO',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AppointmentStatus = {
  RESERVADO: 'RESERVADO',
  CANCELADO: 'CANCELADO',
  CANCELADO_CENTRO: 'CANCELADO_CENTRO',
  REPROGRAMADO: 'REPROGRAMADO',
  ASISTIO: 'ASISTIO',
  AUSENTE: 'AUSENTE',
} as const;
export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const AppointmentType = {
  POR_DEMANDA: 'POR_DEMANDA',
  FIJO: 'FIJO',
} as const;
export type AppointmentType =
  (typeof AppointmentType)[keyof typeof AppointmentType];

export const WaitlistTier = {
  MENSUAL: 'MENSUAL',
  OCASIONAL: 'OCASIONAL',
} as const;
export type WaitlistTier = (typeof WaitlistTier)[keyof typeof WaitlistTier];

export const PaymentStatus = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  MERCADOPAGO: 'MERCADOPAGO',
  EFECTIVO: 'EFECTIVO',
  POSNET: 'POSNET',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationKind = {
  TURNO_CONFIRMADO: 'TURNO_CONFIRMADO',
  TURNO_CANCELADO: 'TURNO_CANCELADO',
  RECORDATORIO: 'RECORDATORIO',
  TURNO_LIBERADO: 'TURNO_LIBERADO',
  PAGO_REGISTRADO: 'PAGO_REGISTRADO',
  CUENTA_BLOQUEADA: 'CUENTA_BLOQUEADA',
} as const;
export type NotificationKind =
  (typeof NotificationKind)[keyof typeof NotificationKind];
