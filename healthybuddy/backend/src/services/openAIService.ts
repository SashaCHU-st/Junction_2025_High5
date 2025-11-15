import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio using OpenAI Whisper (Speech-to-Text)
 * @param audioBase64 Base64 encoded audio data
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
  try {
    if (!audioBase64 || audioBase64.trim().length === 0) {
      throw new Error('Empty audio data received');
    }

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Clean base64 string (remove whitespace, data URI prefix if present)
    audioBase64 = audioBase64.trim();
    if (audioBase64.includes(',')) {
      // Remove data URI prefix (e.g., "data:audio/webm;base64,")
      audioBase64 = audioBase64.split(',')[1] || audioBase64;
    }
    
    // Basic validation
    if (!audioBase64 || audioBase64.length < 100) {
      throw new Error('Audio data too short or empty');
    }

    // Convert base64 to buffer
    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audioBase64, 'base64');
    } catch (bufferError: any) {
      throw new Error(`Failed to decode base64 audio: ${bufferError?.message}`);
    }

    if (audioBuffer.length === 0) {
      throw new Error('Decoded audio buffer is empty');
    }

    console.log(`Transcribing audio with OpenAI Whisper: ${audioBuffer.length} bytes`);

    // Detect audio format from buffer header
    // Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    let mimeType = 'audio/webm'; // Default
    let extension = 'webm';
    
    // Check file signature (magic bytes)
    const header = audioBuffer.slice(0, 12);
    if (header[0] === 0xFF && header[1] === 0xFB) {
      // MP3
      mimeType = 'audio/mpeg';
      extension = 'mp3';
    } else if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
      // MP4/M4A (ftyp box)
      mimeType = 'audio/mp4';
      extension = 'm4a';
    } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      // WAV (RIFF)
      mimeType = 'audio/wav';
      extension = 'wav';
    } else if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
      // WebM (EBML)
      mimeType = 'audio/webm';
      extension = 'webm';
    }
    
    console.log(`Detected audio format: ${mimeType} (${extension})`);

    // Create a File-like object for OpenAI API
    // OpenAI SDK accepts File, Blob, or ReadableStream
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    const audioFile = new File([audioBlob], `audio.${extension}`, { type: mimeType });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    const transcript = transcription.text || '';
    console.log(`Transcription result: ${transcript}`);
    
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcription result');
    }

    return transcript;
  } catch (error: any) {
    console.error('Error transcribing audio with OpenAI Whisper:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
    });
    throw new Error(`Failed to transcribe audio: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate response using OpenAI GPT (ChatGPT)
 * @param conversationHistory Array of conversation messages
 * @param userMessage Current user message
 * @returns Generated response text
 */
export async function generateResponse(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<string> {
  try {
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Build conversation messages for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: 'You are a friendly and caring assistant helping elderly users find friends and stay healthy. You ask about their day, activities, interests, and mood in a warm, conversational way. Keep responses short, clear, and encouraging. Ask one question at a time.',
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Use OpenAI GPT model
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // Use gpt-4o-mini as default (cheaper and faster)

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    const generatedText = response.choices[0]?.message?.content || '';
    
    if (!generatedText || generatedText.trim().length === 0) {
      throw new Error('Empty response from OpenAI');
    }

    return generatedText.trim();
  } catch (error: any) {
    console.error('Error generating response with OpenAI GPT:', error);
    // Fallback to a simple response if API fails
    return "I understand. Could you tell me more about that?";
  }
}

/**
 * Extract health data and interests from transcript using OpenAI GPT
 */
export async function extractDataFromTranscript(transcript: string): Promise<{
  steps?: number;
  mood?: string;
  interests?: string[];
  activities?: string[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    const prompt = `Extract health and interest data from this user message. Return ONLY a JSON object with this structure:
{
  "steps": number or null,
  "mood": "happy" | "neutral" | "tired" | "sad" or null,
  "interests": array of strings or null,
  "activities": array of strings or null
}

User message: "${transcript}"

JSON:`;

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction assistant. Return only valid JSON, no other text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    // Try to parse JSON from response
    const text = response.choices[0]?.message?.content?.trim() || '{}';
    
    try {
      const extracted = JSON.parse(text);
      return {
        steps: extracted.steps || undefined,
        mood: extracted.mood || undefined,
        interests: extracted.interests || undefined,
        activities: extracted.activities || undefined,
      };
    } catch (e) {
      console.error('Failed to parse extracted JSON:', e);
      // Fallback to simple extraction
      return fallbackDataExtraction(transcript);
    }
  } catch (error) {
    console.error('Error extracting data with OpenAI:', error);
    // Fallback to simple extraction
    return fallbackDataExtraction(transcript);
  }
}

/**
 * Fallback data extraction using simple keyword matching
 */
function fallbackDataExtraction(transcript: string): {
  steps?: number;
  mood?: string;
  interests?: string[];
  activities?: string[];
} {
  const lowerTranscript = transcript.toLowerCase();
  const extracted: {
    steps?: number;
    mood?: string;
    interests?: string[];
    activities?: string[];
  } = {};

  // Extract steps
  const stepsMatch = lowerTranscript.match(/(\d+)\s*(steps?|walked)/);
  if (stepsMatch) {
    extracted.steps = parseInt(stepsMatch[1]);
  }

  // Extract mood
  if (lowerTranscript.includes('tired') || lowerTranscript.includes('exhausted')) {
    extracted.mood = 'tired';
  } else if (lowerTranscript.includes('happy') || lowerTranscript.includes('great') || lowerTranscript.includes('good')) {
    extracted.mood = 'happy';
  } else if (lowerTranscript.includes('sad') || lowerTranscript.includes('down') || lowerTranscript.includes('lonely')) {
    extracted.mood = 'sad';
  } else {
    extracted.mood = 'neutral';
  }

  // Extract interests/activities
  const interestKeywords = [
    'walking', 'walk', 'exercise', 'gardening', 'garden',
    'reading', 'read', 'books', 'cooking', 'cook',
    'chatting', 'chat', 'talking', 'talk', 'friends',
    'music', 'singing', 'dancing', 'painting', 'art',
    'knitting', 'crafts', 'yoga', 'swimming'
  ];

  const foundInterests: string[] = [];
  const foundActivities: string[] = [];

  interestKeywords.forEach(keyword => {
    if (lowerTranscript.includes(keyword)) {
      if (keyword.includes('walk')) foundInterests.push('walking');
      else if (keyword.includes('garden')) foundInterests.push('gardening');
      else if (keyword.includes('read')) foundInterests.push('reading');
      else if (keyword.includes('cook')) foundInterests.push('cooking');
      else if (keyword.includes('chat') || keyword.includes('talk')) foundInterests.push('chatting');
      else if (keyword.includes('exercise')) foundActivities.push('exercise');
      else foundInterests.push(keyword);
    }
  });

  extracted.interests = [...new Set(foundInterests)];
  extracted.activities = [...new Set(foundActivities)];

  return extracted;
}

/**
 * Generate speech from text using OpenAI TTS (Text-to-Speech)
 * @param text Text to convert to speech
 * @returns Base64 encoded audio data
 */
export async function textToSpeech(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for TTS');
    }

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    console.log(`Generating speech from text using OpenAI TTS`);
    console.log(`Text: ${text.substring(0, 50)}...`);

    // Use OpenAI TTS
    const voice = (process.env.OPENAI_TTS_VOICE || 'alloy') as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    const model = process.env.OPENAI_TTS_MODEL || 'tts-1'; // Use tts-1 (faster) or tts-1-hd (higher quality)

    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
    });

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    console.log(`Successfully generated speech with OpenAI TTS, audio size: ${audioBuffer.length} bytes`);

    // Convert audio buffer to base64
    const base64Audio = audioBuffer.toString('base64');
    console.log(`TTS completed, base64 length: ${base64Audio.length}`);
    
    return base64Audio;
  } catch (error: any) {
    console.error('Error generating speech with OpenAI TTS:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
    });
    throw new Error(`Failed to generate speech: ${error?.message || 'Unknown error'}`);
  }
}

