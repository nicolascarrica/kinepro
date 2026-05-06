/**
 * Tests unitarios de las reglas de negocio mas relevantes para la
 * defensa: rango horario y dia permitido en la creacion de horarios.
 *
 * Estos tests no requieren BD - testean el validador puro a traves
 * de la clase SlotsService usando un PrismaService mock.
 */
import { BadRequestException } from '@nestjs/common';
import { SlotsService } from '../src/slots/slots.service';

const prismaMock: any = {
  slot: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
};

describe('SlotsService - reglas "Crear horario"', () => {
  let svc: SlotsService;
  beforeEach(() => {
    jest.resetAllMocks();
    svc = new SlotsService(prismaMock);
    prismaMock.slot.findUnique.mockResolvedValue(null);
    prismaMock.slot.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 's1', ...data }),
    );
  });

  it('rechaza creacion fuera del rango horario (22:00)', async () => {
    const startsAt = new Date('2026-05-11T22:00:00'); // Lunes 22:00
    await expect(
      svc.create({ startsAt: startsAt.toISOString(), cupo: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza creacion fuera del rango semanal (domingo)', async () => {
    const startsAt = new Date('2026-05-10T10:00:00'); // Domingo 10:00
    await expect(
      svc.create({ startsAt: startsAt.toISOString(), cupo: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza creacion si ya existe un horario igual', async () => {
    prismaMock.slot.findUnique.mockResolvedValueOnce({ id: 'existente' });
    const startsAt = new Date('2026-05-11T10:00:00');
    await expect(
      svc.create({ startsAt: startsAt.toISOString(), cupo: 8 }),
    ).rejects.toThrow('Ya existe un horario para esa fecha y hora');
  });

  it('crea horario valido para lunes 10:00', async () => {
    const startsAt = new Date('2026-05-11T10:00:00');
    const slot = await svc.create({
      startsAt: startsAt.toISOString(),
      cupo: 8,
    });
    expect(slot).toBeDefined();
    expect(prismaMock.slot.create).toHaveBeenCalled();
  });
});
