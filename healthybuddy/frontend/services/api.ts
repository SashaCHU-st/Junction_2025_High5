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
    const TIMEOUT_MS = 5000; // 5 second timeout for TTS API
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TTS API request timeout'));
        }, TIMEOUT_MS);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(`${API_URL}/api/voice/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        }),
        timeoutPromise,
      ]) as Response;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Log rate limit errors with retry info
        if (response.status === 429) {
          console.warn('TTS API rate limit exceeded:', errorData);
          // Throw error with rate limit info so voiceService can handle cooldown
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          error.retryAfter = errorData.retryAfter || '20';
          throw error;
        } else {
          console.error('TTS API error:', errorData);
        }
        
        // Return null to trigger fallback to system TTS
        return null;
      }

      const data = await response.json();
      return data.audioBase64 || null;
    } catch (error: any) {
      // Re-throw rate limit errors so voiceService can handle them
      if (error?.status === 429) {
        throw error;
      }
      
      // Handle timeout errors
      if (error?.message === 'TTS API request timeout') {
        console.warn('TTS API request timed out, using system TTS');
        return null;
      }
      
      console.error('Error calling TTS API:', error);
      return null;
    }
  },
};