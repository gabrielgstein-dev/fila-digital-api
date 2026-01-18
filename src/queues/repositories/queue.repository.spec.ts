import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueRepository } from './queue.repository';

describe('QueueRepository', () => {
  let repository: QueueRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueRepository,
        {
          provide: PrismaService,
          useValue: {
            queue: {
              findFirst: jest.fn(),
            },
            ticket: {
              count: jest.fn(),
              findFirst: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<QueueRepository>(QueueRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findQueueWithStats', () => {
    it('deve retornar fila com estatísticas', async () => {
      const mockQueue = {
        id: 'queue-1',
        name: 'Fila Geral',
        tenant: { id: 'tenant-1', name: 'Empresa' },
        tickets: [],
        _count: { tickets: 5 },
      };

      jest.spyOn(prisma.queue, 'findFirst').mockResolvedValue(mockQueue as any);

      const result = await repository.findQueueWithStats('queue-1', 'tenant-1');
      expect(result).toEqual(mockQueue);
      expect(prisma.queue.findFirst).toHaveBeenCalledWith({
        where: { id: 'queue-1', tenantId: 'tenant-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('getAverageServiceTimeRecent', () => {
    it('deve retornar tempo médio das últimas horas', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { avg_service_time: 420 },
      ]);

      const result = await repository.getAverageServiceTimeRecent('queue-1', 3);
      expect(result).toBe(420);
    });

    it('deve retornar 0 em caso de erro', async () => {
      jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('DB Error'));

      const result = await repository.getAverageServiceTimeRecent('queue-1', 3);
      expect(result).toBe(0);
    });
  });

  describe('getWaitingTicketsCount', () => {
    it('deve retornar contagem de tickets aguardando', async () => {
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(7);

      const result = await repository.getWaitingTicketsCount('queue-1');
      expect(result).toBe(7);
    });
  });

  describe('getNextTicketInQueue', () => {
    it('deve retornar próximo ticket por prioridade', async () => {
      const mockTicket = {
        id: 'ticket-1',
        myCallingToken: 'G001',
        priority: 2,
        queue: { id: 'queue-1', tenant: { name: 'Empresa' } },
      };

      jest.spyOn(prisma.ticket, 'findFirst').mockResolvedValue(mockTicket as any);

      const result = await repository.getNextTicketInQueue('queue-1');
      expect(result).toEqual(mockTicket);
      expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ queueId: 'queue-1' }),
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: expect.any(Object),
      });
    });
  });
});
