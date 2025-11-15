import { ProcessVoiceResponse } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const api = {
  async processVoice(
    userId: string,
    transcript: string,
    conversationStep: number
  ): Promise<ProcessVoiceResponse> {
    try {
      const response = await fetch(`${API_URL}/api/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, transcript, conversationStep }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling voice API:', error);
      throw error;
    }
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },
};
