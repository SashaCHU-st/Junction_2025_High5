import { VoiceSession } from "../types";
import { generateResponse, extractDataFromTranscript } from "./openAIService";

// Store conversation history per user
const conversationHistory: Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
> = new Map();

/**
 * Extract health data and interests from voice transcript using AI
 */
export async function processVoiceTranscript(
  transcript: string
): Promise<VoiceSession["extractedData"]> {
  // Use OpenAI to extract structured data (includes fallback internally)
  return await extractDataFromTranscript(transcript);
}

/**
 * Generate next voice prompt using OpenAI GPT model
 */
export async function generateNextPrompt(
  userId: string,
  userMessage: string,
  extractedData: VoiceSession["extractedData"],
  conversationStep: number
): Promise<string> {
  try {
    // Get or create conversation history for this user
    let history = conversationHistory.get(userId) || [];

    // Note: Initial greeting is handled by frontend, so we don't add it to history here

    // Generate response using OpenAI GPT
    const response = await generateResponse(history, userMessage);

    // Update conversation history
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: response });

    // Keep only last 10 messages to avoid context overflow
    if (history.length > 10) {
      history = history.slice(-10);
    }

    conversationHistory.set(userId, history);

    return response;
  } catch (error) {
    console.error("Error generating prompt with AI, using fallback:", error);
    // Fallback to simple prompts
    return generateFallbackPrompt(extractedData, conversationStep);
  }
}

/**
 * Fallback prompt generation (used if AI fails)
 */
function generateFallbackPrompt(
  extractedData: VoiceSession["extractedData"],
  conversationStep: number
): string {
  switch (conversationStep) {
    case 1:
      return "Thank you for sharing! Have you had any activities or interests you'd like to do recently?";
    case 2:
      return "That's wonderful! Let me find a friend who shares your interests.";
    default:
      return "How are you doing today?";
  }
}
