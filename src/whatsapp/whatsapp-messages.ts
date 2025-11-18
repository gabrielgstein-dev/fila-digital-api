export interface StartQueueParams {
  userName: string;
  queueName: string;
  ticketToken: string;
  position: number;
  tenantName: string;
  estimatedMinutes: number;
  peopleAhead: number;
}

export interface UpdatePositionParams {
  queueName: string;
  ticketToken: string;
  position: number;
  tenantName: string;
  estimatedMinutes: number;
  peopleAhead: number;
}

export interface QueueNotificationLinkParams {
  tenantName: string;
  ticketToken: string;
}

export function startQueue(params: StartQueueParams): string {
  const {
    userName,
    queueName,
    ticketToken,
    tenantName,
    estimatedMinutes,
    peopleAhead,
  } = params;

  const waitingTime =
    estimatedMinutes === 1 ? '1 minuto' : `${estimatedMinutes} minutos`;
  const queueDisplayName = queueName || 'de atendimento';

  return `Olá! ${userName}
Você entrou na fila ${queueDisplayName} da empresa ${tenantName}.

🎫 Sua senha: ${ticketToken}
⏱️ Tempo médio de espera: ${waitingTime}
📊 Senhas na sua frente: ${peopleAhead}`;
}

export function updatePosition(params: UpdatePositionParams): string {
  const {
    queueName,
    ticketToken,
    position,
    tenantName,
    estimatedMinutes,
    peopleAhead,
  } = params;

  const waitingTime =
    estimatedMinutes === 1 ? '1 minuto' : `${estimatedMinutes} minutos`;
  const queueDisplayName = queueName || 'de atendimento';

  if (peopleAhead === 0) {
    return `Atualização da sua senha *${ticketToken}* na fila ${queueDisplayName} da empresa ${tenantName}.

🎉 Você é o próximo a ser chamado!
⏱️ Tempo estimado: *${waitingTime}*`;
  }

  const peopleAheadText =
    peopleAhead === 1 ? '1 senha' : `${peopleAhead} senhas`;

  return `Atualização da sua senha *${ticketToken}* na fila ${queueDisplayName} da empresa ${tenantName}.

📊 Faltam *${peopleAheadText}* para você ser chamado
📍 Sua posição atual: *${position}*
⏱️ Tempo estimado: *${waitingTime}*`;
}

export function queueNotificationLink(
  params: QueueNotificationLinkParams,
): string {
  const { tenantName, ticketToken } = params;

  return `Olá! Você entrou na fila da empresa ${tenantName} e sua senha é ${ticketToken}. Aguarde ser chamado.`;
}
