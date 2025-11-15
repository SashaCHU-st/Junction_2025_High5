/**
 * Utility to match voice input with screen options
 */

export interface VoiceOption {
  keywords: string[]; // Keywords to match against
  value: string; // The option value to select
  label?: string; // Display label
}

/**
 * Match voice transcript to an option
 * Returns the matched option value or null
 */
export function matchVoiceOption(
  transcript: string,
  options: VoiceOption[]
): string | null {
  if (!transcript) return null;

  const lowerTranscript = transcript.toLowerCase().trim();

  // Try exact match first
  for (const option of options) {
    for (const keyword of option.keywords) {
      if (lowerTranscript === keyword.toLowerCase()) {
        return option.value;
      }
    }
  }

  // Try partial match (contains)
  for (const option of options) {
    for (const keyword of option.keywords) {
      if (lowerTranscript.includes(keyword.toLowerCase()) || 
          keyword.toLowerCase().includes(lowerTranscript)) {
        return option.value;
      }
    }
  }

  return null;
}

