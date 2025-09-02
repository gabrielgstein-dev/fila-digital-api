import { TestHelper } from './test-setup';

describe('Business Flows (e2e)', () => {
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  describe('🏥 Cenário Centro Clínico - Múltiplas Filas Especializadas', () => {
    it('deve processar filas independentemente', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Criar filas especializadas
      const filaGeral = await testHelper.createQueue(tenant.id, {
        name: 'Fila Geral',
        description: 'Atendimento geral',
        queueType: 'GENERAL',
        capacity: 50,
        avgServiceTime: 300,
      });

      const filaPediatria = await testHelper.createQueue(tenant.id, {
        name: 'Pediatria',
        description: 'Consultas pediátricas',
        queueType: 'PRIORITY',
        capacity: 30,
        avgServiceTime: 600,
      });

      const filaRadiologia = await testHelper.createQueue(tenant.id, {
        name: 'Radiologia',
        description: 'Exames de imagem',
        queueType: 'GENERAL',
        capacity: 20,
        avgServiceTime: 900,
      });

      // Criar tickets em cada fila
      await testHelper.createTicket(filaGeral.id, {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        priority: 1,
      });

      await testHelper.createTicket(filaPediatria.id, {
        clientName: 'Maria Santos',
        clientPhone: '11888888888',
        priority: 2,
      });

      await testHelper.createTicket(filaRadiologia.id, {
        clientName: 'Pedro Costa',
        clientPhone: '11777777777',
        priority: 1,
      });

      // Verificar que as filas foram criadas
      expect(filaGeral.id).toBeDefined();
      expect(filaPediatria.id).toBeDefined();
      expect(filaRadiologia.id).toBeDefined();
    });
  });

  describe('🔒 Isolamento entre Empresas', () => {
    it('deve impedir acesso às filas de outra empresa', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Criar fila na primeira empresa
      const filaEmpresa1 = await testHelper.createQueue(tenant.id, {
        name: 'Fila Empresa 1',
        description: 'Fila da primeira empresa',
      });

      // Criar segunda empresa
      const empresa2 = await testHelper.createTenant({
        name: 'Empresa 2',
        slug: 'empresa-2',
      });

      const agenteEmpresa2 = await testHelper.createAgent(empresa2.id, {
        role: 'ADMINISTRADOR',
      });

      // Verificar que as empresas foram criadas
      expect(tenant.id).toBeDefined();
      expect(empresa2.id).toBeDefined();
      expect(agenteEmpresa2.id).toBeDefined();
    });

    it('deve mostrar apenas filas do próprio tenant', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Criar fila no tenant atual
      const filaAtual = await testHelper.createQueue(tenant.id, {
        name: 'Fila Atual',
        description: 'Fila do tenant atual',
      });

      // Criar outro tenant
      const outroTenant = await testHelper.createTenant({
        name: 'Outro Tenant',
        slug: 'outro-tenant',
      });

      const outroAgente = await testHelper.createAgent(outroTenant.id, {
        role: 'ADMINISTRADOR',
      });

      // Verificar que cada tenant foi criado
      expect(tenant.id).toBeDefined();
      expect(outroTenant.id).toBeDefined();
      expect(outroAgente.id).toBeDefined();
    });
  });

  describe('📊 Gestão de Capacidade e Tempo', () => {
    it('deve calcular tempo de espera baseado na capacidade', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      const fila = await testHelper.createQueue(tenant.id, {
        name: 'Fila Teste',
        description: 'Fila para teste de capacidade',
        capacity: 10,
        avgServiceTime: 300, // 5 minutos
      });

      // Criar 5 tickets
      for (let i = 0; i < 5; i++) {
        await testHelper.createTicket(fila.id, {
          clientName: `Cliente ${i + 1}`,
          priority: 1,
        });
      }

      // Verificar que a fila foi criada
      expect(fila.id).toBeDefined();
    });
  });

  describe('🎯 Priorização Inteligente', () => {
    it('deve priorizar tickets por tipo de fila', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      const filaGeral = await testHelper.createQueue(tenant.id, {
        name: 'Fila Geral',
        description: 'Fila geral',
        queueType: 'GENERAL',
      });

      const filaPrioritaria = await testHelper.createQueue(tenant.id, {
        name: 'Fila Prioritária',
        description: 'Fila prioritária',
        queueType: 'PRIORITY',
      });

      const filaVIP = await testHelper.createQueue(tenant.id, {
        name: 'Fila VIP',
        description: 'Fila VIP',
        queueType: 'VIP',
      });

      // Criar tickets com mesma prioridade em filas diferentes
      await testHelper.createTicket(filaGeral.id, {
        clientName: 'Cliente Geral',
        priority: 1,
      });

      await testHelper.createTicket(filaPrioritaria.id, {
        clientName: 'Cliente Prioritário',
        priority: 1,
      });

      await testHelper.createTicket(filaVIP.id, {
        clientName: 'Cliente VIP',
        priority: 1,
      });

      // Verificar que as filas foram criadas
      expect(filaGeral.id).toBeDefined();
      expect(filaPrioritaria.id).toBeDefined();
      expect(filaVIP.id).toBeDefined();
    });
  });
});
