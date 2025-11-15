// User profile with health and interest data
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  healthData: HealthData;
  interests: string[];
  activityLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Health data collected from voice interactions
export interface HealthData {
  steps?: number;
  mood?: 'happy' | 'neutral' | 'tired' | 'sad';
  energy?: 'high' | 'medium' | 'low';
  lastUpdate: Date;
}

// Voice interaction session
export interface VoiceSession {
  userId: string;
  transcript: string;
  extractedData: {
    steps?: number;
    mood?: string;
    interests?: string[];
    activities?: string[];
  };
  timestamp: Date;
}

// Friend match result
export interface FriendMatch {
  candidateId: string;
  candidateName: string;
  candidateAge: number;
  matchScore: number;
  commonInterests: string[];
  reason: string;
}

// Request/Response types
export interface ProcessVoiceRequest {
  userId: string;
  transcript: string;
}

export interface ProcessVoiceResponse {
  extractedData: VoiceSession['extractedData'];
  nextPrompt: string;
  friendMatch?: FriendMatch;
}
