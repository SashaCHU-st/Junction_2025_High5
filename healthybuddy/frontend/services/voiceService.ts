import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from './api';

// Web-specific types
interface WebRecording {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  onSpeechActivity?: () => void;
}

export class VoiceService {
  private recording: Audio.Recording | null = null;
  private webRecording: WebRecording | null = null;
  private isRecording = false;

  private sound: Audio.Sound | null = null;
  private onSpeechActivityCallback: (() => void) | null = null;
  private onSilenceDetectedCallback: (() => void) | null = null; // Callback when silence is detected
  private isSystemTTSSpeaking: boolean = false;
  private systemTTSResolve: (() => void) | null = null; // Resolve function for system TTS Promise
  private playAudioResolve: (() => void) | null = null; // Resolve function for playAudio Promise
  private playAudioCheckInterval: ReturnType<typeof setInterval> | null = null; // Interval for checking audio status
  
  // Interruption monitoring removed
  
  // Silence detection
  private lastSpeechActivityTime: number = 0;
  private recordingStartTime: number = 0; // Track when recording started
  private silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
  private silenceThresholdMs: number = 3000; // 3 seconds of silence (was 1.5s - too short)
  private minRecordingDurationMs: number = 1000; // Minimum 1 second of recording before silence detection

  /**
   * Speak text using SpeechBrain TTS (Text-to-Speech)
   * Falls back to system TTS if backend TTS fails
   */
  async speak(text: string): Promise<void> {
    try {
      console.log('Generating speech for text:', text.substring(0, 50));
      
      // Try to get audio from backend TTS first
      const audioBase64 = await api.textToSpeech(text);
      
      if (audioBase64) {
        // Convert base64 to URI
        const audioUri = await this.saveBase64AsAudio(audioBase64);
        if (audioUri) {
          // Play audio from backend TTS
          await this.playAudio(audioUri);
          return;
        }
      }

      // Fallback to system TTS if backend TTS fails
      console.warn('Backend TTS failed, falling back to system TTS');
      await this.speakWithSystemTTS(text);
    } catch (error) {
      console.error('Error in speak, falling back to system TTS:', error);
      // Fallback to system TTS
      await this.speakWithSystemTTS(text);
    }
  }

  /**
   * Fallback: Use system TTS (expo-speech)
   */
  private async speakWithSystemTTS(text: string): Promise<void> {
    try {
      // Stop any existing system TTS first
      if (this.isSystemTTSSpeaking && this.systemTTSResolve) {
        const Speech = await import('expo-speech');
        Speech.stop();
        this.isSystemTTSSpeaking = false;
        this.systemTTSResolve();
        this.systemTTSResolve = null;
      }

      // Dynamic import to avoid errors if expo-speech is not available
      const Speech = await import('expo-speech');
      this.isSystemTTSSpeaking = true;

    return new Promise((resolve) => {
        // Store resolve function so stopSpeaking can call it
        this.systemTTSResolve = resolve;

        Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
          rate: 0.85,
          onDone: () => {
            this.isSystemTTSSpeaking = false;
            if (this.systemTTSResolve === resolve) {
              this.systemTTSResolve = null;
            }
            resolve();
          },
        onError: (error) => {
            console.error('System TTS Error:', error);
            this.isSystemTTSSpeaking = false;
            if (this.systemTTSResolve === resolve) {
              this.systemTTSResolve = null;
            }
          resolve();
        },
      });
    });
    } catch (error) {
      console.error('Failed to use system TTS:', error);
      this.isSystemTTSSpeaking = false;
      this.systemTTSResolve = null;
    }
  }

  /**
   * Save base64 audio to file and return URI
   */
  private async saveBase64AsAudio(base64: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // For web, return data URI directly (OpenAI TTS outputs MP3)
        return `data:audio/mp3;base64,${base64}`;
      }

      // For mobile, save to file system
      // Use a temporary file path (FileSystem.documentDirectory may not be available in types)
      const docDir = (FileSystem as any).documentDirectory || '';
      const fileName = `${docDir}tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileName, base64, {
        encoding: 'base64' as any,
      });
      return fileName;
    } catch (error) {
      console.error('Failed to save audio file:', error);
      // Fallback: return data URI for web (OpenAI TTS outputs MP3)
      if (Platform.OS === 'web') {
        return `data:audio/mp3;base64,${base64}`;
      }
      return null;
    }
  }

  /**
   * Play audio from URI
   */
  private async playAudio(uri: string): Promise<void> {
    try {
      // Web platform: Use HTML5 Audio for better compatibility
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          // Stop any existing audio
          if (this.sound) {
            if (this.sound instanceof HTMLAudioElement) {
              this.sound.pause();
              this.sound.src = '';
            } else {
              (this.sound as any).unloadAsync?.().catch(console.error);
            }
            this.sound = null;
          }
          
          // Store resolve function
          this.playAudioResolve = resolve;
          
          // Create HTML5 Audio element (use window.Audio for web)
          const AudioConstructor = (typeof window !== 'undefined' && window.Audio) || (globalThis as any).Audio;
          const audio = new AudioConstructor(uri);
          this.sound = audio as any;
          
          audio.onended = () => {
            if (this.playAudioResolve === resolve) {
              this.playAudioResolve = null;
            }
            this.sound = null;
            resolve();
          };
          
          audio.onerror = (error: Event) => {
            console.error('HTML5 Audio error:', error);
            if (this.playAudioResolve === resolve) {
              this.playAudioResolve = null;
            }
            this.sound = null;
            resolve();
          };
          
          // Play audio
          audio.play().catch((error: Error) => {
            console.error('Failed to play audio:', error);
            if (this.playAudioResolve === resolve) {
              this.playAudioResolve = null;
            }
            this.sound = null;
            resolve();
          });
        });
      }
      
      // Mobile platform: Use Expo AV
      // Stop any currently playing sound and resolve its promise
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      // Clear any existing resolve function and interval
      if (this.playAudioCheckInterval) {
        clearInterval(this.playAudioCheckInterval);
        this.playAudioCheckInterval = null;
      }
      this.playAudioResolve = null;

      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      this.sound = sound;

      // Wait for playback to finish or interruption
      return new Promise((resolve) => {
        // Store resolve function so stopSpeaking can call it
        this.playAudioResolve = resolve;
        
        let isResolved = false;
        const doResolve = () => {
          if (isResolved) return;
          isResolved = true;
          
          // Cleanup
          if (this.playAudioCheckInterval) {
            clearInterval(this.playAudioCheckInterval);
            this.playAudioCheckInterval = null;
          }
          this.playAudioResolve = null;
          
          // Cleanup sound if still exists
          if (this.sound === sound) {
            sound.unloadAsync().catch(console.error);
            this.sound = null;
          }
          
            resolve();
        };
        
        // Update stored resolve function
        this.playAudioResolve = doResolve;
        
        // Check status more frequently (every 50ms) for faster interruption detection
        this.playAudioCheckInterval = setInterval(() => {
          // If sound was stopped (set to null), resolve immediately
          if (!this.sound || this.sound !== sound) {
            doResolve();
            return;
          }
          
          sound.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                doResolve();
              } else if (!status.isPlaying) {
                // Not playing and not finished (likely stopped), resolve
                doResolve();
              }
              // If still playing, continue checking
            } else {
              // Not loaded, resolve
              doResolve();
            }
          }).catch(() => {
            // Error getting status, resolve to avoid hanging
            doResolve();
          });
        }, 50); // Check every 50ms for faster response
        
        // Also listen for status updates
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            doResolve();
          } else if (status.isLoaded && !status.isPlaying && !status.didJustFinish) {
            // Stopped but not finished (interrupted)
            doResolve();
          }
        });
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      // Cleanup
      if (this.playAudioCheckInterval) {
        clearInterval(this.playAudioCheckInterval);
        this.playAudioCheckInterval = null;
      }
      this.playAudioResolve = null;
    }
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    console.log('stopSpeaking called');

    // Stop system TTS if speaking
    if (this.isSystemTTSSpeaking) {
      const Speech = await import('expo-speech');
      Speech.stop();
      this.isSystemTTSSpeaking = false;
      if (this.systemTTSResolve) {
        this.systemTTSResolve();
        this.systemTTSResolve = null;
      }
    }
    
    // Resolve playAudio Promise immediately if it exists
    if (this.playAudioResolve) {
      console.log('Resolving playAudio Promise immediately');
      this.playAudioResolve();
      this.playAudioResolve = null;
    }
    
    // Clear check interval
    if (this.playAudioCheckInterval) {
      clearInterval(this.playAudioCheckInterval);
      this.playAudioCheckInterval = null;
    }
    
    // Stop audio playback immediately
    if (this.sound) {
      try {
        if (Platform.OS === 'web' && this.sound instanceof HTMLAudioElement) {
          // Web: Stop HTML5 Audio
          this.sound.pause();
          this.sound.src = '';
        } else {
          // Mobile: Stop Expo AV Sound
          await (this.sound as any).stopAsync?.();
          await (this.sound as any).unloadAsync();
        }
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
      this.sound = null;
    }

    // Stop system TTS (expo-speech) immediately
    if (this.isSystemTTSSpeaking) {
      try {
        const Speech = await import('expo-speech');
        Speech.stop();
        this.isSystemTTSSpeaking = false;

        // Resolve system TTS Promise if it exists
        if (this.systemTTSResolve) {
          console.log('Resolving system TTS Promise immediately');
          this.systemTTSResolve();
          this.systemTTSResolve = null;
        }
      } catch (error) {
        console.error('Error stopping system TTS:', error);
        this.isSystemTTSSpeaking = false;
        if (this.systemTTSResolve) {
          this.systemTTSResolve();
          this.systemTTSResolve = null;
        }
      }
    }
  }

  // Pre-warming removed - microphone access only when user clicks record button

  // Interruption monitoring removed - user controls recording manually via button click

  /**
   * Start silence detection - automatically stop recording after silence threshold
   */
  private startSilenceDetection(): void {
    // Clear existing silence check interval
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }

    // Record when recording started
    this.recordingStartTime = Date.now();

    // Check for silence every 200ms
    this.silenceCheckInterval = setInterval(() => {
      if (!this.isRecording) {
        // Stop checking if not recording
        if (this.silenceCheckInterval) {
          clearInterval(this.silenceCheckInterval);
          this.silenceCheckInterval = null;
        }
        return;
      }

      const now = Date.now();
      const timeSinceRecordingStart = now - this.recordingStartTime;
      const timeSinceLastSpeech = now - this.lastSpeechActivityTime;
      
      // Don't trigger silence detection if:
      // 1. Recording just started (less than minRecordingDurationMs)
      // 2. Speech was detected recently (within silenceThresholdMs)
      if (timeSinceRecordingStart < this.minRecordingDurationMs) {
        // Too early to detect silence - user might still be starting to speak
        return;
      }
      
      // If silence threshold has passed, trigger callback
      if (timeSinceLastSpeech >= this.silenceThresholdMs) {
        console.log(`Silence detected for ${this.silenceThresholdMs}ms (recording for ${timeSinceRecordingStart}ms), triggering callback`);
        
        // Clear interval
        if (this.silenceCheckInterval) {
          clearInterval(this.silenceCheckInterval);
          this.silenceCheckInterval = null;
        }
        
        // Call silence detected callback
        if (this.onSilenceDetectedCallback) {
          this.onSilenceDetectedCallback();
        }
      }
    }, 200); // Check every 200ms
  }

  /**
   * Stop silence detection
   */
  private stopSilenceDetection(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    if (!this.sound) return false;
    const status = await this.sound.getStatusAsync();
    return status.isLoaded && status.isPlaying;
  }

  /**
   * Check if currently recording
   */
  getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * Set callback for speech activity detection
   */
  setSpeechActivityCallback(callback: (() => void) | null): void {
    this.onSpeechActivityCallback = callback;
  }

  /**
   * Set callback for silence detection (auto-stop recording)
   */
  setSilenceDetectedCallback(callback: (() => void) | null): void {
    this.onSilenceDetectedCallback = callback;
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      // Web platform: Use native MediaRecorder API
      if (Platform.OS === 'web') {
        return await this.startWebRecording();
      }

      // iOS/Android: Use Expo AV
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Audio permission not granted. Please enable microphone access in settings.');
      }

      console.log('Audio permission granted');

      // Configure audio mode for iOS
      if (Platform.OS === 'ios') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        console.log('iOS audio mode configured');
      }

      // Expo AV requires all platform options to be provided
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000, // Whisper recommends 16kHz for speech recognition
          numberOfChannels: 1,
          bitRate: 64000, // 16kHz mono needs ~64kbps (optimal for Whisper)
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000, // Whisper recommends 16kHz for speech recognition
          numberOfChannels: 1,
          bitRate: 64000, // 16kHz mono needs ~64kbps (optimal for Whisper)
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      console.log('Creating recording with options:', recordingOptions);
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      this.recording = recording;
      this.isRecording = true;
      console.log('Recording started successfully');
      
      // Audio monitoring removed - user controls recording manually via button click
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw new Error(`Failed to start recording: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Start recording on web using native MediaRecorder API
   */
  private async startWebRecording(): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder API not supported in this browser');
      }

      // Interruption monitoring removed

      // Request microphone access when user clicks record button
      console.log('Requesting microphone access for web...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Whisper recommends 16kHz for speech recognition
          channelCount: 1, // Mono for better speech recognition
          // Additional Chrome-specific constraints for better quality
          ...(typeof (window as any).chrome !== 'undefined' && {
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
          }),
        } 
      });
      console.log('Microphone access granted');

      // Audio monitoring removed - no analyser needed for manual control

      // Determine supported MIME type
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

      console.log('Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 64000, // 16kHz mono needs ~64kbps (optimal for Whisper)
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          // Don't log every chunk to reduce console noise
          // Chunk-based speech detection removed - using frequency analysis instead
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, total chunks:', audioChunks.length);
        // Stream tracks will be stopped in stopRecording
      };

      // Audio monitoring removed - user controls recording manually via button click

      this.webRecording = {
        mediaRecorder,
        audioChunks,
        stream,
        audioContext: null, // No audio context needed for manual control
        analyser: null, // No analyser needed for manual control
        onSpeechActivity: undefined, // No speech activity detection
      };

      // Start recording - user controls start/stop manually via button
      mediaRecorder.start();
      this.isRecording = true;
      console.log('Web recording started successfully');
    } catch (error: any) {
      console.error('Failed to start web recording:', error);
      this.isRecording = false;
      this.webRecording = null;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      throw new Error(`Failed to start web recording: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and return audio URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      // Stop silence detection
      this.stopSilenceDetection();
      
      if (!this.isRecording) {
        console.log('Not recording, nothing to stop');
        return null;
      }

      // Web platform: Handle MediaRecorder
      if (Platform.OS === 'web' && this.webRecording) {
        return await this.stopWebRecording();
      }

      // iOS/Android: Handle Expo AV recording
      if (!this.recording) {
        console.error('Recording object is null');
        this.isRecording = false;
        return null;
      }

      console.log('Stopping Expo AV recording...');
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      console.log('Recording stopped, URI:', uri);
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

  /**
   * Stop web recording and save to file
   */
  private async stopWebRecording(): Promise<string | null> {
    try {
      if (!this.webRecording) {
        console.error('Web recording object is null');
        return null;
      }

      const { mediaRecorder, audioChunks, stream } = this.webRecording;

      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          console.log('MediaRecorder already stopped');
          this.cleanupWebRecording();
          resolve(null);
          return;
        }

        mediaRecorder.onstop = async () => {
          try {
            console.log('MediaRecorder stopped, processing audio chunks...');
            
            // Stop all tracks
            if (stream) {
              stream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
              });
            }

            if (audioChunks.length === 0) {
              console.error('No audio chunks recorded');
              this.cleanupWebRecording();
              resolve(null);
              return;
            }

            // Combine all chunks into a single blob
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            console.log('Audio blob created, size:', audioBlob.size, 'type:', audioBlob.type);

            // Convert blob to base64 data URI
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUri = reader.result as string;
              // For web, return the data URI directly (getAudioAsBase64 will extract base64)
              console.log('Web recording completed, blob size:', audioBlob.size);
              this.cleanupWebRecording();
              resolve(dataUri);
            };
            reader.onerror = () => {
              console.error('Failed to read audio blob');
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
          console.log('Stopped MediaRecorder');
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

  /**
   * Cleanup web recording resources
   */
  private cleanupWebRecording(): void {
    // Stop silence detection
    this.stopSilenceDetection();
    
    if (this.webRecording) {
      // Stop all tracks
      if (this.webRecording.stream) {
        this.webRecording.stream.getTracks().forEach(track => track.stop());
      }
      
      // Close audio context
      if (this.webRecording.audioContext && this.webRecording.audioContext.state !== 'closed') {
        this.webRecording.audioContext.close().catch(console.error);
      }
      
      this.webRecording = null;
    }
    this.isRecording = false;
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  /**
   * Get audio file as base64 for sending to backend
   */
  async getAudioAsBase64(uri: string): Promise<string | null> {
    try {
      // If it's already a base64 data URI (from web), extract the base64 part
      if (uri.startsWith('data:')) {
        const base64Part = uri.split(',')[1];
        if (base64Part) {
          console.log('Using base64 from data URI, length:', base64Part.length);
          return base64Part;
        }
      }

      // For file URIs (iOS/Android), read the file
      console.log('Reading audio file from URI:', uri);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      console.log('Audio file read, base64 length:', base64.length);
      return base64;
    } catch (error: any) {
      console.error('Failed to read audio file:', error);
      return null;
    }
  }
}

export const voiceService = new VoiceService();
