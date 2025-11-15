import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from './api';
import Voice from '@react-native-voice/voice';

// Web-specific types
interface WebRecording {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  onSpeechActivity?: () => void;
}

// TTS Strategy Interface
interface TTSEngine {
  speak(text: string, signal?: AbortSignal): Promise<void>;
  stop(): Promise<void>;
  isAvailable(): boolean;
}

// Unified System TTS - handles both mobile and web
class SystemTTS implements TTSEngine {
  private isSpeaking = false;
  private resolveCallback: (() => void) | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }
    return true; // expo-speech is available on mobile
  }

  async speak(text: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;

    if (Platform.OS === 'web') {
      return this.speakWeb(text, signal);
    }
    return this.speakMobile(text, signal);
  }

  private async speakWeb(text: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;

    return new Promise((resolve) => {
      try {
        if (!this.isAvailable()) {
          console.error('Web Speech API not available');
          resolve();
          return;
        }

        if (this.isSpeaking) {
          window.speechSynthesis.cancel();
        }

        if (signal?.aborted) {
          resolve();
          return;
        }

        this.isSpeaking = true;
        this.resolveCallback = resolve;

        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        utterance.lang = 'en-US';
        utterance.pitch = 1.0;
        utterance.rate = 0.85;
        utterance.volume = 1.0;

        utterance.onend = () => {
          if (!signal?.aborted) {
            this.cleanup();
          }
          resolve();
        };

        utterance.onerror = (error) => {
          const errorType = (error as SpeechSynthesisErrorEvent).error;
          // 'interrupted' and 'canceled' are normal when stopping/overriding speech
          // 'not-allowed' is expected for auto-play without user interaction
          if (errorType !== 'not-allowed' && errorType !== 'interrupted' && errorType !== 'canceled') {
            console.error('Web Speech API error:', errorType);
          }
          this.cleanup();
          resolve();
        };

        if (signal) {
          signal.addEventListener('abort', () => {
            this.stop();
            resolve();
          });
        }

        try {
          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.warn('Failed to start Web Speech API:', error);
          this.cleanup();
          resolve();
        }
      } catch (error) {
        console.error('Web Speech API failed:', error);
        this.cleanup();
        resolve();
      }
    });
  }

  private async speakMobile(text: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;

    return new Promise(async (resolve) => {
      try {
        if (this.isSpeaking) {
          await this.stop();
        }

        if (signal?.aborted) {
          resolve();
          return;
        }

        const Speech = await import('expo-speech');
        if (!Speech?.default?.speak) {
          console.error('expo-speech not available');
          resolve();
          return;
        }

        if (signal?.aborted) {
          resolve();
          return;
        }

        this.isSpeaking = true;
        this.resolveCallback = resolve;

        Speech.default.speak(text, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.85,
          onDone: () => {
            if (!signal?.aborted) {
              this.cleanup();
            }
            resolve();
          },
          onError: (error) => {
            console.error('Expo Speech error:', error);
            this.cleanup();
            resolve();
          },
        });

        if (signal) {
          signal.addEventListener('abort', () => {
            this.stop();
            resolve();
          });
        }
      } catch (error) {
        console.error('Expo Speech failed:', error);
        this.cleanup();
        resolve();
      }
    });
  }

  async stop(): Promise<void> {
    if (Platform.OS === 'web') {
      if (this.isAvailable()) {
        window.speechSynthesis.cancel();
      }
    } else {
      try {
        const Speech = await import('expo-speech');
        Speech.default?.stop();
      } catch (error) {
        console.warn('Error stopping expo-speech:', error);
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (this.resolveCallback) {
      this.resolveCallback();
      this.resolveCallback = null;
    }
  }
}

// TTS Manager - handles fallback chain
class TTSManager {
  private engines: TTSEngine[] = [];
  private currentEngine: TTSEngine | null = null;

  constructor() {
    // Initialize engines in priority order
    this.engines = [
      new SystemTTS(), // Unified system TTS (handles both mobile and web)
    ];
  }

  async speak(text: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;

    // Try each engine until one works
    for (const engine of this.engines) {
      if (engine.isAvailable()) {
        try {
          this.currentEngine = engine;
          await engine.speak(text, signal);
          return;
        } catch (error) {
          console.warn(`TTS engine failed, trying next:`, error);
          continue;
        }
      }
    }

    console.error('No TTS engine available');
  }

  async stop(): Promise<void> {
    if (this.currentEngine) {
      await this.currentEngine.stop();
      this.currentEngine = null;
    }
  }
}

export class VoiceService {
  private recording: Audio.Recording | null = null;
  private webRecording: WebRecording | null = null;
  private isRecording = false;

  private sound: Audio.Sound | null = null;
  private onSpeechActivityCallback: (() => void) | null = null;
  private onSilenceDetectedCallback: (() => void) | null = null;
  
  // Web Speech Recognition
  private recognition: any = null;
  private isRecognizing = false;
  
  // TTS management
  private ttsManager = new TTSManager();
  private currentSpeakPromise: Promise<void> | null = null;
  private currentSpeakAbortController: AbortController | null = null;
  
  // Rate limit handling
  private rateLimitUntil: number = 0;
  private readonly RATE_LIMIT_COOLDOWN_MS = 30000;
  
  // Silence detection
  private lastSpeechActivityTime: number = 0;
  private recordingStartTime: number = 0;
  private silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
  private silenceThresholdMs: number = 3000;
  private minRecordingDurationMs: number = 1000;

  // Audio playback
  private playAudioResolve: (() => void) | null = null;
  private playAudioCheckInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Speak text
   * @param text Text to speak
   * @param useOpenAI If true, use OpenAI TTS (for AI responses). If false, use system TTS only (for prompts/announcements)
   */
  async speak(text: string, useOpenAI: boolean = false): Promise<void> {
    // Cancel previous operation
    if (this.currentSpeakAbortController) {
      this.currentSpeakAbortController.abort();
      this.currentSpeakAbortController = null;
    }

    // Stop any currently playing audio (non-blocking)
    this.stopSpeaking().catch(() => {});

    // Create new abort controller
    const abortController = new AbortController();
    this.currentSpeakAbortController = abortController;

    // Execute speak operation
    const speakPromise = useOpenAI 
      ? this.executeSpeakWithOpenAI(text, abortController.signal)
      : this.executeSpeakWithSystem(text, abortController.signal);
    this.currentSpeakPromise = speakPromise;

    try {
      await speakPromise;
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Error in speak:', error);
      }
    } finally {
      if (this.currentSpeakPromise === speakPromise && 
          this.currentSpeakAbortController === abortController) {
        this.currentSpeakPromise = null;
        this.currentSpeakAbortController = null;
      }
    }
  }

  /**
   * Speak using system TTS only (for prompts, announcements, etc.)
   */
  private async executeSpeakWithSystem(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    await this.ttsManager.speak(text, signal);
  }

  /**
   * Speak using OpenAI TTS with fallback to system TTS (for AI responses)
   */
  private async executeSpeakWithOpenAI(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;

    // Check rate limit cooldown
    const now = Date.now();
    if (now < this.rateLimitUntil) {
      const remainingSeconds = Math.ceil((this.rateLimitUntil - now) / 1000);
      console.log(`Skipping backend TTS (cooldown ${remainingSeconds}s), using system TTS`);
      await this.ttsManager.speak(text, signal);
      return;
    }

    // Try backend TTS first
    let audioBase64: string | null = null;
    try {
      audioBase64 = await api.textToSpeech(text);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || 
                         error?.message?.includes('Rate limit') ||
                         error?.message?.includes('rate_limit');
      
      if (isRateLimit) {
        const retryAfter = error?.retryAfter 
          ? parseInt(error.retryAfter) * 1000 
          : this.RATE_LIMIT_COOLDOWN_MS;
        this.rateLimitUntil = now + retryAfter;
        console.warn(`Rate limit detected, cooldown ${Math.ceil(retryAfter / 1000)}s`);
      } else if (error?.message?.includes('timeout')) {
        this.rateLimitUntil = now + 10000; // 10s cooldown after timeout
        console.warn('Backend TTS timeout');
      } else {
        console.warn('Backend TTS error:', error?.message || error);
      }
    }

    if (signal.aborted) return;

    // If backend TTS succeeded, play audio
    if (audioBase64) {
      this.rateLimitUntil = 0; // Reset cooldown on success
      const audioUri = await this.saveBase64AsAudio(audioBase64);
      if (audioUri && !signal.aborted) {
        await this.playAudio(audioUri);
        return;
      }
    }

    // Fallback to system TTS
    if (!signal.aborted) {
      await this.ttsManager.speak(text, signal);
    }
  }

  private async saveBase64AsAudio(base64: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return `data:audio/mp3;base64,${base64}`;
      }

      const docDir = (FileSystem as any).documentDirectory || '';
      const fileName = `${docDir}tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileName, base64, {
        encoding: 'base64' as any,
      });
      return fileName;
    } catch (error) {
      console.error('Failed to save audio file:', error);
      if (Platform.OS === 'web') {
        return `data:audio/mp3;base64,${base64}`;
      }
      return null;
    }
  }

  private async playAudio(uri: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return this.playAudioWeb(uri);
      }
      return this.playAudioMobile(uri);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.cleanupAudio();
    }
  }

  private async playAudioWeb(uri: string): Promise<void> {
    return new Promise((resolve) => {
      // Stop existing audio
      if (this.sound) {
        if (this.sound instanceof HTMLAudioElement) {
          this.sound.pause();
          this.sound.src = '';
        }
        this.sound = null;
      }

      this.playAudioResolve = resolve;
      const AudioConstructor = (typeof window !== 'undefined' && window.Audio) || (globalThis as any).Audio;
      const audio = new AudioConstructor(uri);
      this.sound = audio as any;

      audio.onended = () => {
        this.cleanupAudio();
        resolve();
      };

      audio.onerror = () => {
        console.error('HTML5 Audio error');
        this.cleanupAudio();
        resolve();
      };

      audio.play().catch((error: Error) => {
        console.error('Failed to play audio:', error);
        this.cleanupAudio();
        resolve();
      });
    });
  }

  private async playAudioMobile(uri: string): Promise<void> {
    // Stop existing audio
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    this.cleanupAudio();

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 1.0 }
    );

    this.sound = sound;

    return new Promise((resolve) => {
      this.playAudioResolve = resolve;

      const doResolve = () => {
        if (this.playAudioResolve !== resolve) return;
        this.cleanupAudio();
        if (this.sound === sound) {
          sound.unloadAsync().catch(console.error);
          this.sound = null;
        }
        resolve();
      };

      this.playAudioResolve = doResolve;

      this.playAudioCheckInterval = setInterval(() => {
        if (!this.sound || this.sound !== sound) {
          doResolve();
          return;
        }

        sound.getStatusAsync().then((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish || !status.isPlaying) {
              doResolve();
            }
          } else {
            doResolve();
          }
        }).catch(() => doResolve());
      }, 50);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && (status.didJustFinish || (!status.isPlaying && !status.didJustFinish))) {
          doResolve();
        }
      });
    });
  }

  private cleanupAudio(): void {
    if (this.playAudioCheckInterval) {
      clearInterval(this.playAudioCheckInterval);
      this.playAudioCheckInterval = null;
    }
    if (this.playAudioResolve) {
      this.playAudioResolve();
      this.playAudioResolve = null;
    }
  }

  async stopSpeaking(): Promise<void> {
    // Abort current operation
    if (this.currentSpeakAbortController) {
      this.currentSpeakAbortController.abort();
      this.currentSpeakAbortController = null;
    }

    // Stop TTS
    await this.ttsManager.stop();

    // Stop audio playback
    this.cleanupAudio();
    if (this.sound) {
      try {
        if (Platform.OS === 'web' && this.sound instanceof HTMLAudioElement) {
          this.sound.pause();
          this.sound.src = '';
        } else {
          await (this.sound as any).stopAsync?.();
          await (this.sound as any).unloadAsync();
        }
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
      this.sound = null;
    }
  }

  async isSpeaking(): Promise<boolean> {
    if (!this.sound) return false;
    const status = await this.sound.getStatusAsync();
    return status.isLoaded && status.isPlaying;
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  setSpeechActivityCallback(callback: (() => void) | null): void {
    this.onSpeechActivityCallback = callback;
  }

  setSilenceDetectedCallback(callback: (() => void) | null): void {
    this.onSilenceDetectedCallback = callback;
  }

  private startSilenceDetection(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }

    this.recordingStartTime = Date.now();

    this.silenceCheckInterval = setInterval(() => {
      if (!this.isRecording) {
        if (this.silenceCheckInterval) {
          clearInterval(this.silenceCheckInterval);
          this.silenceCheckInterval = null;
        }
        return;
      }

      const now = Date.now();
      const timeSinceStart = now - this.recordingStartTime;
      const timeSinceLastSpeech = now - this.lastSpeechActivityTime;

      if (timeSinceStart < this.minRecordingDurationMs) {
        return;
      }

      if (timeSinceLastSpeech >= this.silenceThresholdMs) {
        console.log(`Silence detected (${this.silenceThresholdMs}ms)`);
        if (this.silenceCheckInterval) {
          clearInterval(this.silenceCheckInterval);
          this.silenceCheckInterval = null;
        }
        if (this.onSilenceDetectedCallback) {
          this.onSilenceDetectedCallback();
        }
      }
    }, 200);
  }

  private stopSilenceDetection(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        console.log('Already recording');
        return;
      }

      if (Platform.OS === 'web') {
        return await this.startWebRecording();
      }

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Audio permission not granted');
      }

      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      }

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      this.recording = recording;
      this.isRecording = true;
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw new Error(`Failed to start recording: ${error?.message || 'Unknown error'}`);
    }
  }

  private async startWebRecording(): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaRecorder API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          ...(typeof (window as any).chrome !== 'undefined' && {
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
          }),
        },
      });

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.webRecording = {
        mediaRecorder,
        audioChunks,
        stream,
        audioContext: null,
        analyser: null,
      };

      mediaRecorder.start();
      this.isRecording = true;
    } catch (error: any) {
      console.error('Failed to start web recording:', error);
      this.isRecording = false;
      this.webRecording = null;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found');
      }
      throw new Error(`Failed to start web recording: ${error?.message || 'Unknown error'}`);
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      this.stopSilenceDetection();

      if (!this.isRecording) {
        return null;
      }

      if (Platform.OS === 'web' && this.webRecording) {
        return await this.stopWebRecording();
      }

      if (!this.recording) {
        this.isRecording = false;
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;
      return uri;
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      this.webRecording = null;
      this.stopSilenceDetection();
      return null;
    }
  }

  private async stopWebRecording(): Promise<string | null> {
    try {
      if (!this.webRecording) {
        return null;
      }

      const { mediaRecorder, audioChunks, stream } = this.webRecording;

      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          this.cleanupWebRecording();
          resolve(null);
          return;
        }

        mediaRecorder.onstop = async () => {
          try {
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }

            if (audioChunks.length === 0) {
              this.cleanupWebRecording();
              resolve(null);
              return;
            }

            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUri = reader.result as string;
              this.cleanupWebRecording();
              resolve(dataUri);
            };
            reader.onerror = () => {
              this.cleanupWebRecording();
              resolve(null);
            };
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error('Error processing web recording:', error);
            this.cleanupWebRecording();
            resolve(null);
          }
        };

        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        } else {
          this.cleanupWebRecording();
          resolve(null);
        }
      });
    } catch (error: any) {
      console.error('Failed to stop web recording:', error);
      this.cleanupWebRecording();
      return null;
    }
  }

  private cleanupWebRecording(): void {
    this.stopSilenceDetection();
    if (this.webRecording) {
      if (this.webRecording.stream) {
        this.webRecording.stream.getTracks().forEach(track => track.stop());
      }
      if (this.webRecording.audioContext && this.webRecording.audioContext.state !== 'closed') {
        this.webRecording.audioContext.close().catch(console.error);
      }
      this.webRecording = null;
    }
    this.isRecording = false;
  }

  async getAudioAsBase64(uri: string): Promise<string | null> {
    try {
      if (uri.startsWith('data:')) {
        const base64Part = uri.split(',')[1];
        if (base64Part) {
          return base64Part;
        }
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      return base64;
    } catch (error: any) {
      console.error('Failed to read audio file:', error);
      return null;
    }
  }

  /**
   * Start real-time speech recognition (no rate limit, uses device built-in recognition)
   * Returns transcript when recognition ends
   * @param timeoutMs Maximum time to wait for speech (default: 10 seconds)
   */
  async startSpeechRecognition(timeoutMs: number = 10000): Promise<string | null> {
    if (Platform.OS === 'web') {
      return this.startWebSpeechRecognition(timeoutMs);
    }
    return this.startMobileSpeechRecognition(timeoutMs);
  }

  /**
   * Stop speech recognition
   */
  async stopSpeechRecognition(): Promise<void> {
    if (Platform.OS === 'web') {
      this.stopRecognition();
    } else {
      try {
        await Voice.stop();
      } catch (error) {
        console.warn('Error stopping Voice recognition:', error);
      }
    }
  }

  /**
   * Start Web Speech Recognition (web only)
   * Waits for speech and returns transcript
   */
  private async startWebSpeechRecognition(timeoutMs: number = 10000): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.warn('Web Speech Recognition not available');
          resolve(null);
          return;
        }

        if (this.isRecognizing) {
          this.stopRecognition();
        }

        this.isRecognizing = true;
        const recognition = new SpeechRecognition();
        this.recognition = recognition;

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        let finalTranscript = '';
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          this.isRecognizing = false;
          this.recognition = null;
        };

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }
        };

        recognition.onend = () => {
          cleanup();
          if (finalTranscript.trim()) {
            resolve(finalTranscript.trim());
          } else {
            resolve(null);
          }
        };

        recognition.onerror = (event: any) => {
          const errorType = event.error;
          // 'aborted' and 'no-speech' are expected when stopping or no input received
          if (errorType !== 'aborted' && errorType !== 'no-speech') {
            console.error('Web Speech Recognition error:', errorType);
          }
          cleanup();
          resolve(null);
        };

        // Set timeout
        timeoutId = setTimeout(() => {
          recognition.stop();
        }, timeoutMs);

        recognition.start();
      } catch (error) {
        console.error('Failed to start Web Speech Recognition:', error);
        this.isRecognizing = false;
        this.recognition = null;
        resolve(null);
      }
    });
  }

  /**
   * Start Mobile Speech Recognition (iOS/Android)
   * Waits for speech and returns transcript
   */
  private async startMobileSpeechRecognition(timeoutMs: number = 10000): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        Voice.isAvailable()
          .then((isAvailable: number) => {
            if (isAvailable !== 1) {
              console.warn('Voice recognition not available on this device');
              resolve(null);
              return;
            }

            let finalTranscript = '';
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            const cleanup = () => {
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              Voice.removeAllListeners();
            };

            Voice.onSpeechResults = (e: any) => {
              const results = e.value || [];
              if (results.length > 0) {
                finalTranscript = results[0];
              }
            };

            Voice.onSpeechEnd = () => {
              cleanup();
              resolve(finalTranscript || null);
            };

            Voice.onSpeechError = (e: any) => {
              console.error('Speech recognition error:', e.error);
              cleanup();
              resolve(null);
            };

            // Set timeout
            timeoutId = setTimeout(() => {
              Voice.stop();
              cleanup();
              resolve(finalTranscript || null);
            }, timeoutMs);

            Voice.start('en-US')
              .then(() => {
                console.log('Voice recognition started');
              })
              .catch((error: any) => {
                console.error('Failed to start voice recognition:', error);
                cleanup();
                resolve(null);
              });
          })
          .catch((error: any) => {
            console.error('Failed to check voice availability:', error);
            resolve(null);
          });
      } catch (error) {
        console.error('Failed to start mobile speech recognition:', error);
        resolve(null);
      }
    });
  }

  /**
   * Stop Web Speech Recognition
   */
  private stopRecognition(): void {
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      this.isRecognizing = false;
      this.recognition = null;
    }
  }
}

export const voiceService = new VoiceService();
