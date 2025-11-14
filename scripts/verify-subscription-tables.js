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

async function verifySubscriptionTables() {
  try {
    console.log('🔍 Verificando tabelas de assinatura...\n');

    const subscriptionPlans = await prisma.subscriptionPlan.findMany();
    console.log(
      `✅ Tabela subscription_plans: ${subscriptionPlans.length} planos encontrados`,
    );

    const subscriptions = await prisma.subscription.findMany();
    console.log(
      `✅ Tabela subscriptions: ${subscriptions.length} assinaturas encontradas`,
    );

    const subscriptionHistory = await prisma.subscriptionHistory.findMany();
    console.log(
      `✅ Tabela subscription_history: ${subscriptionHistory.length} registros encontrados`,
    );

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subscriptionId: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        billingEmail: true,
      },
      take: 5,
    });

    console.log(
      `\n✅ Tabela tenants atualizada: ${tenants.length} tenants verificados`,
    );
    console.log('\n📋 Campos de assinatura no Tenant:');
    tenants.forEach((tenant) => {
      console.log(`   - ${tenant.name}:`);
      console.log(`     subscriptionId: ${tenant.subscriptionId || 'null'}`);
      console.log(
        `     subscriptionStatus: ${tenant.subscriptionStatus || 'null'}`,
      );
      console.log(`     trialEndsAt: ${tenant.trialEndsAt || 'null'}`);
      console.log(`     billingEmail: ${tenant.billingEmail || 'null'}`);
    });

    console.log(
      '\n🎉 Todas as tabelas de assinatura foram criadas com sucesso!',
    );
    console.log('\n💡 Próximos passos:');
    console.log('   1. Execute: node scripts/seed-subscription-plans.js');
    console.log(
      '   2. Isso criará os planos padrão (Free, Basic, Professional, Enterprise)',
    );
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
    if (error.code === 'P2021') {
      console.error(
        '\n💡 Erro: Tabela não encontrada. Verifique se as migrations foram aplicadas.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifySubscriptionTables();
