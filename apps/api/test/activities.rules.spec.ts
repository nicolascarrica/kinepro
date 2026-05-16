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
  slot: {
    count: jest.fn(),
  },
};

describe('ActivitiesService - reglas Crear/Modificar/Eliminar', () => {
  let svc: ActivitiesService;
  beforeEach(() => {
    jest.resetAllMocks();
    svc = new ActivitiesService(prismaMock);
  });

  it('crea actividad valida (solo nombre)', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    prismaMock.activity.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'x', ...data }),
    );
    const a = await svc.create({ nombre: 'Tren medio' });
    expect(a.nombre).toBe('Tren medio');
    expect(a.mensaje).toBe('La actividad se creó con éxito');
  });

  it('rechaza nombre duplicado al crear', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'y' });
    await expect(
      svc.create({ nombre: 'Tren superior' }),
    ).rejects.toThrow('La actividad ya se encuentra registrada');
  });

  it('rechaza modificar a un nombre ya registrado', async () => {
    prismaMock.activity.findUnique
      .mockResolvedValueOnce({ id: 'x', nombre: 'Tren medio' }) // current
      .mockResolvedValueOnce({ id: 'y', nombre: 'Tren inferior' }); // conflict
    await expect(
      svc.update('x', { nombre: 'Tren inferior' }),
    ).rejects.toThrow('El nombre de la actividad ya se encuentra registrada');
  });

  it('rechaza eliminacion si tiene turnos activos futuros', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'x' });
    prismaMock.slot.count.mockResolvedValue(2);
    await expect(svc.remove('x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('elimina actividad sin turnos activos', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'x' });
    prismaMock.slot.count.mockResolvedValue(0);
    prismaMock.activity.delete.mockResolvedValue({});
    const r = await svc.remove('x');
    expect(r.ok).toBe(true);
    expect(r.mensaje).toBe('La actividad se eliminó con éxito');
  });
});
