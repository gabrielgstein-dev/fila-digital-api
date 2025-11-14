#!/usr/bin/env node

/**
 * Executor de Todos os Testes
 *
 * Executa todos os testes do sistema de tickets em sequência:
 * 1. Teste básico (banco + trigger)
 * 2. Teste de tempo real (SSE + notificações)
 * 3. Teste completo (todos os endpoints)
 */

const { execSync } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Validação de Código',
    file: 'test-code-validation.js',
    description: 'Valida estrutura, dependências e arquivos',
  },
  {
    name: 'Teste E2E Mínimo',
    file: 'test-e2e-minimal.js',
    description: 'Testa conexão e componentes essenciais',
  },
  {
    name: 'Teste Básico',
    file: 'test-ticket-basic.js',
    description: 'Verifica banco de dados e trigger PostgreSQL',
  },
  {
    name: 'Teste de Tempo Real',
    file: 'test-realtime-simple.js',
    description: 'Verifica sistema SSE e notificações',
  },
  {
    name: 'Teste E2E Simples',
    file: 'test-e2e-simple.js',
    description: 'Teste E2E sem dependência do servidor',
  },
  {
    name: 'Teste E2E Completo',
    file: 'test-e2e-complete.js',
    description: 'Teste E2E completo com servidor',
  },
];

async function runAllTests() {
  console.log('🧪 EXECUTOR DE TESTES - SISTEMA DE TICKETS\n');
  console.log('='.repeat(60));
  console.log('Este script executará todos os testes em sequência');
  console.log(
    'Certifique-se de que o servidor está rodando para os testes completos',
  );
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${i + 1}/${tests.length} 🧪 ${test.name}`);
    console.log(`   📝 ${test.description}`);
    console.log('   ' + '-'.repeat(50));

    try {
      const startTime = Date.now();

      execSync(`node scripts/tests/${test.file}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..'), // Voltar para a raiz do projeto
        timeout: 60000, // 60 segundos por teste
      });

      const duration = Date.now() - startTime;
      console.log(
        `   ✅ ${test.name}: PASSOU (${Math.round(duration / 1000)}s)`,
      );
      results.passed++;
    } catch (error) {
      console.log(`   ❌ ${test.name}: FALHOU`);
      console.log(`   Erro: ${error.message}`);
      results.failed++;
      results.errors.push({
        test: test.name,
        error: error.message,
      });
    }
  }

  // Resultado final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO FINAL DOS TESTES');
  console.log('='.repeat(60));

  console.log(`✅ Testes passaram: ${results.passed}`);
  console.log(`❌ Testes falharam: ${results.failed}`);
  console.log(
    `📈 Taxa de sucesso: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
  );

  if (results.errors.length > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Sistema de tickets funcionando perfeitamente');
    console.log('✅ Cadastro de tickets funcionando');
    console.log('✅ Mudanças de status funcionando');
    console.log('✅ Sistema de tempo real funcionando');
  } else {
    console.log('⚠️ ALGUNS TESTES FALHARAM');
    console.log('🔧 Verifique os erros acima e corrija os problemas');
  }

  console.log('='.repeat(60));

  // Instruções adicionais
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log(
    '1. Se todos os testes passaram, o sistema está pronto para produção',
  );
  console.log('2. Se alguns testes falharam, verifique:');
  console.log('   - Se o banco de dados está conectado');
  console.log('   - Se o trigger PostgreSQL foi criado');
  console.log('   - Se o servidor está rodando (para testes de tempo real)');
  console.log('   - Se as variáveis de ambiente estão corretas');
  console.log('3. Para executar testes individuais:');
  console.log('   - node test-ticket-basic.js');
  console.log('   - node test-realtime-simple.js');
  console.log('   - node test-ticket-realtime-complete.js');
}

// Executar todos os testes
runAllTests().catch(console.error);
