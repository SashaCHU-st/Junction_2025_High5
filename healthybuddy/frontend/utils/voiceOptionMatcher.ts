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
  console.log('Matching transcript:', lowerTranscript, 'against options:', options);

  // Try exact match first
  for (const option of options) {
    for (const keyword of option.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerTranscript === lowerKeyword) {
        console.log('Exact match found:', lowerKeyword, '->', option.value);
        return option.value;
      }
    }
  }

  // Try partial match (contains) - prioritize longer matches
  // Sort options by keyword length (longest first) to match "physical activities" before "physical"
  const sortedOptions = [...options].map(opt => ({
    ...opt,
    sortedKeywords: [...opt.keywords].sort((a, b) => b.length - a.length)
  }));

  for (const option of sortedOptions) {
    for (const keyword of option.sortedKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      // Check if transcript contains the keyword or keyword contains transcript
      if (lowerTranscript.includes(lowerKeyword) || lowerKeyword.includes(lowerTranscript)) {
        console.log('Partial match found:', lowerKeyword, '->', option.value);
        return option.value;
      }
    }
  }

  console.log('No match found for:', lowerTranscript);
  return null;
}

