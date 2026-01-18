import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketEstimateService } from './ticket-estimate.service';

describe('TicketEstimateService', () => {
  let service: TicketEstimateService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketEstimateService,
        {
          provide: PrismaService,
          useValue: {
            ticket: {
              findMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketEstimateService>(TicketEstimateService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculateEstimatedTime', () => {
    it('deve retornar 0 quando posição for 0 ou negativa', async () => {
      const result = await service.calculateEstimatedTime('queue-1', 0);
      expect(result).toBe(0);
    });

    it('deve calcular tempo estimado com base no tempo médio', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { avg_recent_service_time: 300 },
      ]);

      const result = await service.calculateEstimatedTime('queue-1', 3);
      expect(result).toBe(900);
    });

    it('deve usar fallback quando não há dados recentes', async () => {
      jest
        .spyOn(prisma, '$queryRaw')
        .mockResolvedValueOnce([{ avg_recent_service_time: null }])
        .mockResolvedValueOnce([{ avg_service_time: 240 }]);

      const result = await service.calculateEstimatedTime('queue-1', 2);
      expect(result).toBe(480);
    });
  });

  describe('getTicketPosition', () => {
    it('deve retornar posição correta na fila', async () => {
      const mockTickets = [
        { id: 'ticket-1', priority: 2, createdAt: new Date('2024-01-01') },
        { id: 'ticket-2', priority: 2, createdAt: new Date('2024-01-02') },
        { id: 'ticket-3', priority: 1, createdAt: new Date('2024-01-03') },
      ];

      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue(mockTickets as any);

      const position = await service.getTicketPosition('queue-1', 'ticket-2');
      expect(position).toBe(2);
    });

    it('deve retornar 0 quando ticket não está na fila', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);

      const position = await service.getTicketPosition('queue-1', 'ticket-99');
      expect(position).toBe(0);
    });
  });

  describe('getAverageServiceTime', () => {
    it('deve retornar tempo médio recente quando disponível', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { avg_recent_service_time: 350 },
      ]);

      const result = await service.getAverageServiceTime('queue-1');
      expect(result).toBe(350);
    });

    it('deve usar valor padrão quando não há dados', async () => {
      jest
        .spyOn(prisma, '$queryRaw')
        .mockResolvedValueOnce([{ avg_recent_service_time: null }])
        .mockResolvedValueOnce([{ avg_service_time: null }]);

      const result = await service.getAverageServiceTime('queue-1');
      expect(result).toBe(300);
    });
  });
});
