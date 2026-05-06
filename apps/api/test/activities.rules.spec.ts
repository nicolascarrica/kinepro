import { BadRequestException } from '@nestjs/common';
import { ActivitiesService } from '../src/activities/activities.service';

const prismaMock: any = {
  activity: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  appointment: {
    count: jest.fn(),
  },
};

describe('ActivitiesService - reglas Crear/Modificar/Eliminar', () => {
  let svc: ActivitiesService;
  beforeEach(() => {
    jest.resetAllMocks();
    svc = new ActivitiesService(prismaMock);
  });

  it('crea actividad valida', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    prismaMock.activity.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'x', ...data }),
    );
    const a = await svc.create({ nombre: 'Tren medio', capacidad: 8 });
    expect(a.nombre).toBe('Tren medio');
  });

  it('rechaza nombre duplicado', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'y' });
    await expect(
      svc.create({ nombre: 'Tren superior', capacidad: 5 }),
    ).rejects.toThrow('La actividad ya se encuentra registrada');
  });

  it('rechaza eliminacion si tiene turnos activos futuros', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'x' });
    prismaMock.appointment.count.mockResolvedValue(2);
    await expect(svc.remove('x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('elimina actividad sin turnos activos', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'x' });
    prismaMock.appointment.count.mockResolvedValue(0);
    prismaMock.activity.delete.mockResolvedValue({});
    const r = await svc.remove('x');
    expect(r.ok).toBe(true);
  });
});
