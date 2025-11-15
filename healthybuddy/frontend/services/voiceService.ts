import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export class VoiceService {
  private recording: Audio.Recording | null = null;

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85, // Slightly slower for elderly users
        onDone: () => resolve(),
        onError: (error) => {
          console.error('TTS Error:', error);
          resolve();
        },
      });
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    Speech.stop();
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Audio permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }

  /**
   * Simulate speech-to-text (for MVP - using text input as fallback)
   * In production, this would use Web Speech API or a service like Google Cloud Speech
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    // For MVP, we'll use text input instead of actual transcription
    // This would normally call a speech-to-text API
    console.log('Audio URI:', audioUri);
    return '';
  }
}

export const voiceService = new VoiceService();
