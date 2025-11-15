import { VoiceSession } from '../types';

/**
 * Extract health data and interests from voice transcript using simple keyword matching
 */
export function processVoiceTranscript(transcript: string): VoiceSession['extractedData'] {
  const lowerTranscript = transcript.toLowerCase();
  const extractedData: VoiceSession['extractedData'] = {};

  // Extract steps
  const stepsMatch = lowerTranscript.match(/(\d+)\s*(steps?|walked)/);
  if (stepsMatch) {
    extractedData.steps = parseInt(stepsMatch[1]);
  }

  // Extract mood
  if (lowerTranscript.includes('tired') || lowerTranscript.includes('exhausted')) {
    extractedData.mood = 'tired';
  } else if (lowerTranscript.includes('happy') || lowerTranscript.includes('great') || lowerTranscript.includes('good')) {
    extractedData.mood = 'happy';
  } else if (lowerTranscript.includes('sad') || lowerTranscript.includes('down') || lowerTranscript.includes('lonely')) {
    extractedData.mood = 'sad';
  } else {
    extractedData.mood = 'neutral';
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
      // Normalize to base form
      if (keyword.includes('walk')) foundInterests.push('walking');
      else if (keyword.includes('garden')) foundInterests.push('gardening');
      else if (keyword.includes('read')) foundInterests.push('reading');
      else if (keyword.includes('cook')) foundInterests.push('cooking');
      else if (keyword.includes('chat') || keyword.includes('talk')) foundInterests.push('chatting');
      else if (keyword.includes('exercise')) foundActivities.push('exercise');
      else foundInterests.push(keyword);
    }
  });

  extractedData.interests = [...new Set(foundInterests)];
  extractedData.activities = [...new Set(foundActivities)];

  return extractedData;
}

/**
 * Generate next voice prompt based on extracted data
 */
export function generateNextPrompt(extractedData: VoiceSession['extractedData'], conversationStep: number): string {
  switch (conversationStep) {
    case 1:
      return "Thank you for sharing! Have you had any activities or interests you'd like to do recently?";
    case 2:
      return "That's wonderful! Let me find a friend who shares your interests.";
    default:
      return "How are you doing today?";
  }
}
