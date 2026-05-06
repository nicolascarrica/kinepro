import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HU NUEVA "Configurar precios y descuento mensual" (Owner).
 * El singleton se identifica con id="singleton".
 */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  async get() {
    const existing = await this.prisma.settings.findUnique({
      where: { id: 'singleton' },
    });
    if (existing) return existing;

    return this.prisma.settings.create({
      data: {
        id: 'singleton',
        precioPorSesion: Number(this.cfg.get('DEFAULT_SESSION_PRICE') ?? 5000),
        descuentoMensual: Number(this.cfg.get('DEFAULT_MONTHLY_DISCOUNT') ?? 20),
      },
    });
  }

  async update(precio: number, descuento: number) {
    if (precio <= 0) {
      throw new Error('El precio por sesion debe ser mayor a cero');
    }
    if (descuento < 0 || descuento > 100) {
      throw new Error('El descuento mensual debe estar entre 0 y 100');
    }
    await this.get(); // asegurar que exista
    return this.prisma.settings.update({
      where: { id: 'singleton' },
      data: { precioPorSesion: precio, descuentoMensual: descuento },
    });
  }
}
