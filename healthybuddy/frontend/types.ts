export interface FriendMatch {
  candidateName: string;
  candidateAge: number;
  commonInterests: string[];
  reason: string;
  matchScore: number;
}

export interface VoiceSessionState {
  conversationStep: number;
  userId: string;
  collectedData: {
    steps?: number;
    mood?: string;
    interests: string[];
  };
  friendMatch?: FriendMatch;
}

export interface ProcessVoiceResponse {
  transcript?: string;
  nextPrompt: string;
  extractedData: {
    steps?: number;
    mood?: string;
    interests?: string[];
  };
  friendMatch?: FriendMatch;
}
