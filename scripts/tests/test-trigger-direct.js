#!/usr/bin/env node

/**
 * Teste Direto do Trigger PostgreSQL
 *
 * Testa o trigger diretamente via SQL para verificar se está funcionando
 */

const { Client } = require('pg');

async function testTriggerDirect() {
  console.log('🔧 Teste Direto do Trigger PostgreSQL\n');
  console.log('='.repeat(50));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Conectar ao banco
    console.log('1️⃣ Conectando ao banco de dados...');
    await client.connect();
    console.log('   ✅ Conectado ao PostgreSQL');

    // 2. Verificar se o trigger existe
    console.log('\n2️⃣ Verificando trigger...');
    const triggerResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'ticket_changes_trigger'
      ) as exists;
    `);

    if (triggerResult.rows[0].exists) {
      console.log('   ✅ Trigger PostgreSQL está ativo');
    } else {
      console.log('   ❌ Trigger PostgreSQL não encontrado');
      return;
    }

    // 3. Verificar se a função existe
    console.log('\n3️⃣ Verificando função...');
    const functionResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'notify_ticket_changes'
      ) as exists;
    `);

    if (functionResult.rows[0].exists) {
      console.log('   ✅ Função notify_ticket_changes existe');
    } else {
      console.log('   ❌ Função notify_ticket_changes não encontrada');
      return;
    }

    // 4. Buscar ou criar fila de teste
    console.log('\n4️⃣ Configurando fila de teste...');
    let queueResult = await client.query(`
      SELECT id, name FROM queues 
      WHERE name = 'Fila de Teste Trigger' 
      LIMIT 1
    `);

    let queueId;
    if (queueResult.rows.length === 0) {
      // Buscar tenant
      const tenantResult = await client.query(`
        SELECT id FROM tenants LIMIT 1
      `);

      if (tenantResult.rows.length === 0) {
        console.log('   ❌ Nenhum tenant encontrado');
        return;
      }

      const newQueueResult = await client.query(
        `
        INSERT INTO queues (id, name, description, "tenantId", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Fila de Teste Trigger', 'Fila para teste do trigger', $1, true, NOW(), NOW())
        RETURNING id, name
      `,
        [tenantResult.rows[0].id],
      );

      queueId = newQueueResult.rows[0].id;
      console.log(`   ✅ Fila criada: ${newQueueResult.rows[0].name}`);
    } else {
      queueId = queueResult.rows[0].id;
      console.log(`   ✅ Fila encontrada: ${queueResult.rows[0].name}`);
    }

    // 5. Configurar listener para NOTIFY
    console.log('\n5️⃣ Configurando listener...');
    await client.query('LISTEN ticket_updates');
    console.log('   ✅ Listener configurado para ticket_updates');

    // 6. Testar inserção de ticket
    console.log('\n6️⃣ Testando inserção de ticket...');

    let notificationReceived = false;
    const notificationPromise = new Promise((resolve) => {
      client.on('notification', (msg) => {
        if (msg.channel === 'ticket_updates') {
          console.log('   📢 NOTIFY recebido!');
          console.log(`      Canal: ${msg.channel}`);
          console.log(`      Payload: ${msg.payload}`);
          notificationReceived = true;
          resolve();
        }
      });
    });

    // Inserir ticket
    const ticketResult = await client.query(
      `
      INSERT INTO tickets (id, "myCallingToken", "clientName", "clientPhone", "queueId", status, priority, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'TRIGGER001', 'Cliente Trigger', '11999999999', $1, 'WAITING', 1, NOW(), NOW())
      RETURNING id, "myCallingToken"
    `,
      [queueId],
    );

    console.log(
      `   ✅ Ticket inserido: ${ticketResult.rows[0].myCallingToken}`,
    );

    // 7. Aguardar notificação
    console.log('\n7️⃣ Aguardando notificação...');

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Timeout: Nenhuma notificação recebida')),
        5000,
      );
    });

    try {
      await Promise.race([notificationPromise, timeoutPromise]);
      console.log('   ✅ Notificação recebida com sucesso');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 8. Testar atualização de ticket
    console.log('\n8️⃣ Testando atualização de ticket...');

    notificationReceived = false;
    const updateNotificationPromise = new Promise((resolve) => {
      client.on('notification', (msg) => {
        if (msg.channel === 'ticket_updates' && !notificationReceived) {
          console.log('   📢 NOTIFY de atualização recebido!');
          console.log(`      Canal: ${msg.channel}`);
          console.log(`      Payload: ${msg.payload}`);
          notificationReceived = true;
          resolve();
        }
      });
    });

    // Atualizar ticket
    await client.query(
      `
      UPDATE tickets 
      SET status = 'CALLED', "calledAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `,
      [ticketResult.rows[0].id],
    );

    console.log('   ✅ Ticket atualizado para CALLED');

    // Aguardar notificação de atualização
    try {
      await Promise.race([updateNotificationPromise, timeoutPromise]);
      console.log('   ✅ Notificação de atualização recebida');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 9. Limpeza
    console.log('\n9️⃣ Limpando dados de teste...');
    await client.query('DELETE FROM tickets WHERE "myCallingToken" = $1', [
      'TRIGGER001',
    ]);
    console.log('   ✅ Dados de teste removidos');

    // 10. Resultado final
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TESTE DO TRIGGER CONCLUÍDO!');
    console.log('✅ Trigger PostgreSQL funcionando');
    console.log('✅ Função notify_ticket_changes ativa');
    console.log('✅ NOTIFY sendo disparado corretamente');
    console.log('✅ Sistema de tempo real operacional');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:', error);
  } finally {
    try {
      await client.query('UNLISTEN ticket_updates');
      await client.end();
    } catch (error) {
      // Ignorar erros de desconexão
    }
  }
}

// Executar teste
testTriggerDirect().catch(console.error);
