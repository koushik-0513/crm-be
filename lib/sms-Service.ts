import { TSMSMessage, TSMSResponse } from '../types';

export class SMSService {
  private apiKey: string;
  private senderId: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY || '';
    this.senderId = process.env.GUPSHUP_SENDER_ID || '';
    this.apiUrl = 'https://api.gupshup.io/sm/api/v1/msg';
  }

  private getAccessToken(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.GUPSHUP_API_KEY || '';
    }
    return this.apiKey;
  }

  private getSenderId(): string {
    if (!this.senderId) {
      this.senderId = process.env.GUPSHUP_SENDER_ID || '';
    }
    return this.senderId;
  }

  private async makeRequest(message: TSMSMessage): Promise<TSMSResponse> {
    const form_data = new URLSearchParams();
    form_data.append('channel', 'sms');
    form_data.append('source', this.getSenderId());
    form_data.append('destination', message.to);
    form_data.append('message', message.text);
    form_data.append('src.name', this.getSenderId());

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'apikey': this.getAccessToken(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form_data,
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`SMS API error: ${error_data.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async send_message(phoneNumber: string, messageText: string): Promise<{ messageId: string; status: string }> {
    try {
      // Format phone number
      const formatted_phone = this.format_phone_number(phoneNumber);

      const message: TSMSMessage = {
        to: formatted_phone,
        text: messageText,
      };

      const response = await this.makeRequest(message);

      if (response.response && response.response.status === 'submitted') {
        return {
          messageId: response.response.id || `sms_${Date.now()}`,
          status: 'sent',
        };
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async send_bulk_messages(recipients: Array<{ phoneNumber: string; messageText: string }>): Promise<Array<{ phoneNumber: string; messageId: string; status: string; success: boolean; error?: string }>> {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.send_message(recipient.phoneNumber, recipient.messageText);
        results.push({
          phoneNumber: recipient.phoneNumber,
          messageId: result.messageId,
          status: result.status,
          success: true,
        });
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          messageId: '',
          status: 'failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private format_phone_number(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, add +91 (India)
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  async validate_phone_number(phoneNumber: string): Promise<boolean> {
    try {
      const formatted_phone = this.format_phone_number(phoneNumber);
      
      // Basic validation - Indian mobile numbers should be 10 digits + 91 country code
      return formatted_phone.length === 13 && formatted_phone.startsWith('91');
    } catch (error) {
      return false;
    }
  }
}

export const sms_service = new SMSService(); 