/**
 * Tests de reglas "Crear turno" (HU #35 v2).
 */
import { BadRequestException } from '@nestjs/common';
import { SlotsService } from '../src/slots/slots.service';

const prismaMock: any = {
  activity: { findUnique: jest.fn() },
  slot: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
};

describe('SlotsService - HU #35 Crear turno', () => {
  let svc: SlotsService;
  beforeEach(() => {
    jest.resetAllMocks();
    svc = new SlotsService(prismaMock);
    prismaMock.activity.findUnique.mockResolvedValue({
      id: 'a1', nombre: 'Tren superior', capacidad: 8,
    });
    prismaMock.slot.findFirst.mockResolvedValue(null);
    prismaMock.slot.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 's1', ...data }),
    );
  });

  it('rechaza horario fuera de rango (22:00)', async () => {
    const startsAt = new Date('2026-05-11T22:00:00');
    await expect(
      svc.create({ activityId: 'a1', startsAt: startsAt.toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza dia fuera del rango semanal (domingo)', async () => {
    const startsAt = new Date('2026-05-10T10:00:00');
    await expect(
      svc.create({ activityId: 'a1', startsAt: startsAt.toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza misma actividad ya existente para ese horario', async () => {
    prismaMock.slot.findFirst.mockResolvedValueOnce({ id: 'x', activityId: 'a1' });
    const startsAt = new Date('2026-05-11T10:00:00');
    await expect(
      svc.create({ activityId: 'a1', startsAt: startsAt.toISOString() }),
    ).rejects.toThrow('La actividad ya existe en el día y horario seleccionado');
  });

  it('rechaza horario ocupado por otra actividad', async () => {
    prismaMock.slot.findFirst
      .mockResolvedValueOnce(null) // misma actividad: no existe
      .mockResolvedValueOnce({ id: 'y', activityId: 'a2' }); // otra actividad
    const startsAt = new Date('2026-05-11T10:00:00');
    await expect(
      svc.create({ activityId: 'a1', startsAt: startsAt.toISOString() }),
    ).rejects.toThrow('El día y horario se encuentra ocupado por otra actividad');
  });

  it('crea horario valido para lunes 10:00', async () => {
    const startsAt = new Date('2026-05-11T10:00:00');
    const slot = await svc.create({
      activityId: 'a1',
      startsAt: startsAt.toISOString(),
    });
    expect(slot).toBeDefined();
    expect(prismaMock.slot.create).toHaveBeenCalled();
  });
});
