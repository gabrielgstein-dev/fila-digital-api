export const NOTIFICATION_TEMPLATES = {
  TICKET_CREATED: 'Sua senha é {number}. Posição: {position}. Tempo estimado: {estimatedTime} min.',
  TICKET_CALLED: 'Sua senha {number} foi chamada! Dirija-se ao atendimento.',
  TICKET_POSITION_UPDATE: 'Sua senha {number} está na posição {position}. Tempo estimado: {estimatedTime} min.',
  TICKET_COMPLETED: 'Atendimento da senha {number} finalizado. Obrigado!',
} as const;

export const NOTIFICATION_CHANNELS = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  SMS: 'sms',
  EMAIL: 'email',
} as const;

export const NOTIFICATION_RETRY = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
} as const;
