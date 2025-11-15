import { ProcessVoiceResponse } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.34.146:3001';

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

  async processAudio(
    userId: string,
    audioBase64: string,
    conversationStep: number
  ): Promise<ProcessVoiceResponse> {
    try {
      const response = await fetch(`${API_URL}/api/voice/process-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, audioBase64, conversationStep }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData?.error || `API error: ${response.status}`;
        console.error('API error response:', errorData);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error calling audio API:', error);
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

  async textToSpeech(text: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/api/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('TTS API error:', errorData);
        return null;
      }

      const data = await response.json();
      return data.audioBase64 || null;
    } catch (error) {
      console.error('Error calling TTS API:', error);
      return null;
    }
  },
};
