const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://username:password@host:port/database?schema=public',
    },
  },
});

const defaultPlans = [
  {
    name: 'Gratuito',
    slug: 'free',
    description: 'Plano gratuito com recursos básicos',
    price: 0,
    billingCycle: 'MONTHLY',
    isActive: true,
    isTrialable: false,
    trialDays: 0,
    features: {
      analytics: false,
      customBranding: false,
      smsNotifications: false,
      emailNotifications: true,
      apiAccess: false,
      webhooks: false,
      customIntegrations: false,
      prioritySupport: false,
      dedicatedSupport: false,
    },
    limits: {
      maxQueues: 1,
      maxAgents: 2,
      maxCorporateUsers: 5,
      maxTicketsPerDay: 100,
      maxCounters: 1,
      hasAnalytics: false,
      hasCustomBranding: false,
      hasSMSNotifications: false,
      hasEmailNotifications: true,
      hasAPIAccess: false,
      maxStorageGB: 0.5,
      supportLevel: 'email',
      maxAPIRequestsPerDay: 0,
    },
  },
  {
    name: 'Básico',
    slug: 'basic',
    description: 'Plano básico para pequenas empresas',
    price: 9900,
    billingCycle: 'MONTHLY',
    isActive: true,
    isTrialable: true,
    trialDays: 14,
    features: {
      analytics: true,
      customBranding: false,
      smsNotifications: true,
      emailNotifications: true,
      apiAccess: false,
      webhooks: false,
      customIntegrations: false,
      prioritySupport: false,
      dedicatedSupport: false,
    },
    limits: {
      maxQueues: 5,
      maxAgents: 10,
      maxCorporateUsers: 20,
      maxTicketsPerDay: 1000,
      maxCounters: 3,
      hasAnalytics: true,
      hasCustomBranding: false,
      hasSMSNotifications: true,
      hasEmailNotifications: true,
      hasAPIAccess: false,
      maxStorageGB: 1,
      supportLevel: 'chat',
      maxAPIRequestsPerDay: 0,
    },
  },
  {
    name: 'Profissional',
    slug: 'professional',
    description: 'Plano profissional para empresas em crescimento',
    price: 29900,
    billingCycle: 'MONTHLY',
    isActive: true,
    isTrialable: true,
    trialDays: 14,
    features: {
      analytics: true,
      customBranding: true,
      smsNotifications: true,
      emailNotifications: true,
      apiAccess: true,
      webhooks: true,
      customIntegrations: true,
      prioritySupport: true,
      dedicatedSupport: false,
    },
    limits: {
      maxQueues: 20,
      maxAgents: 50,
      maxCorporateUsers: 100,
      maxTicketsPerDay: 10000,
      maxCounters: 10,
      hasAnalytics: true,
      hasCustomBranding: true,
      hasSMSNotifications: true,
      hasEmailNotifications: true,
      hasAPIAccess: true,
      maxStorageGB: 10,
      supportLevel: 'phone',
      maxAPIRequestsPerDay: 100000,
    },
  },
  {
    name: 'Empresarial',
    slug: 'enterprise',
    description: 'Plano empresarial com recursos ilimitados',
    price: 99900,
    billingCycle: 'MONTHLY',
    isActive: true,
    isTrialable: true,
    trialDays: 30,
    features: {
      analytics: true,
      customBranding: true,
      smsNotifications: true,
      emailNotifications: true,
      apiAccess: true,
      webhooks: true,
      customIntegrations: true,
      prioritySupport: true,
      dedicatedSupport: true,
    },
    limits: {
      maxQueues: -1,
      maxAgents: -1,
      maxCorporateUsers: -1,
      maxTicketsPerDay: -1,
      maxCounters: -1,
      hasAnalytics: true,
      hasCustomBranding: true,
      hasSMSNotifications: true,
      hasEmailNotifications: true,
      hasAPIAccess: true,
      maxStorageGB: -1,
      supportLevel: 'dedicated',
      maxAPIRequestsPerDay: -1,
    },
  },
];

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Iniciando seed de planos de assinatura...\n');

    for (const planData of defaultPlans) {
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { slug: planData.slug },
      });

      if (existingPlan) {
        console.log(`⏭️  Plano "${planData.name}" já existe, atualizando...`);
        await prisma.subscriptionPlan.update({
          where: { slug: planData.slug },
          data: planData,
        });
        console.log(`✅ Plano "${planData.name}" atualizado`);
      } else {
        console.log(`➕ Criando plano "${planData.name}"...`);
        await prisma.subscriptionPlan.create({
          data: planData,
        });
        console.log(`✅ Plano "${planData.name}" criado`);
      }
      console.log('');
    }

    console.log('🎉 Seed de planos concluído com sucesso!\n');

    const allPlans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });

    console.log('📋 Planos disponíveis:');
    allPlans.forEach((plan) => {
      const price = plan.price / 100;
      console.log(`\n   ${plan.name} (${plan.slug})`);
      console.log(
        `   Preço: R$ ${price.toFixed(2)}/${plan.billingCycle.toLowerCase()}`,
      );
      console.log(
        `   Trial: ${plan.isTrialable ? `${plan.trialDays} dias` : 'Não'}`,
      );
      console.log(`   Status: ${plan.isActive ? '✅ Ativo' : '❌ Inativo'}`);
    });
  } catch (error) {
    console.error('❌ Erro ao fazer seed de planos:', error);
    if (error.code === 'P2021') {
      console.error(
        '\n💡 Erro: Tabela não encontrada. Execute as migrations primeiro:',
      );
      console.error('   npx prisma migrate dev --name add_subscription_system');
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedSubscriptionPlans();
}

module.exports = { seedSubscriptionPlans };
