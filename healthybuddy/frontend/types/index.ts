// Match backend types
export interface FriendMatch {
  candidateId: string;
  candidateName: string;
  candidateAge: number;
  matchScore: number;
  commonInterests: string[];
  reason: string;
}

export interface ProcessVoiceResponse {
  transcript?: string;
  extractedData: {
    steps?: number;
    mood?: string;
    interests?: string[];
    activities?: string[];
  };
  nextPrompt: string;
  friendMatch?: FriendMatch;
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
