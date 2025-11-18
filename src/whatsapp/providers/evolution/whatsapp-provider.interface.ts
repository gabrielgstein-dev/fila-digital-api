export interface SendWhatsAppOptions {
  to: string;
  message: string;
  from?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  details?: {
    message?: string;
    code?: number;
    status?: number;
    moreInfo?: string;
  };
}

export interface IWhatsAppProvider {
  sendMessage(options: SendWhatsAppOptions): Promise<WhatsAppResponse>;
  isConfigured(): boolean;
  formatPhoneNumber(phone: string): string;
}

