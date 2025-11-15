import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  processVoiceTranscript,
  generateNextPrompt,
} from "../services/voiceProcessor";
import { findFriendMatch } from "../services/matchingService";
import { transcribeAudio, textToSpeech } from "../services/openAIService";
import { ProcessVoiceRequest, ProcessVoiceResponse } from "../types";

// Validation schema
const processVoiceSchema = z.object({
  userId: z.string(),
  transcript: z.string(),
  conversationStep: z.number().optional().default(1),
});

const processAudioSchema = z.object({
  userId: z.string(),
  audioBase64: z.string(),
  conversationStep: z.number().optional().default(1),
});

export async function voiceRoutes(fastify: FastifyInstance) {
  // Process audio: transcribe and generate response
  fastify.post<{ Body: z.infer<typeof processAudioSchema> }>(
    "/api/voice/process-audio",
    async (request, reply) => {
      try {
        const {
          userId,
          audioBase64,
          conversationStep = 1,
        } = processAudioSchema.parse(request.body);

        // Transcribe audio using OpenAI Whisper
        const transcript = await transcribeAudio(audioBase64);

        if (!transcript || transcript.trim().length === 0) {
          return reply
            .code(400)
            .send({ error: "Could not transcribe audio. Please try again." });
        }

        // Extract data from transcript using AI
        const extractedData = await processVoiceTranscript(transcript);

        // Generate next prompt using OpenAI GPT
        const nextPrompt = await generateNextPrompt(
          userId,
          transcript,
          extractedData,
          conversationStep
        );

        // If we have enough data and on step 2, find a match
        let friendMatch = undefined;
        if (
          conversationStep === 2 &&
          extractedData.interests &&
          extractedData.interests.length > 0
        ) {
          friendMatch =
            findFriendMatch(
              userId,
              extractedData.interests,
              extractedData.steps
            ) || undefined;
        }

        const response: ProcessVoiceResponse = {
          transcript,
          extractedData,
          nextPrompt,
          friendMatch,
        };

        return reply.code(200).send(response);
      } catch (error: any) {
        console.error("Error processing audio:", error);
        console.error("Error stack:", error?.stack);
        const errorMessage = error?.message || "Failed to process audio input";
        return reply.code(500).send({
          error: errorMessage,
          details:
            process.env.NODE_ENV === "development" ? error?.stack : undefined,
        });
      }
    }
  );

  // Process voice transcript and extract data
  fastify.post<{ Body: ProcessVoiceRequest & { conversationStep?: number } }>(
    "/api/voice/process",
    async (request, reply) => {
      try {
        const {
          userId,
          transcript,
          conversationStep = 1,
        } = processVoiceSchema.parse(request.body);

        // Extract data from transcript using AI
        const extractedData = await processVoiceTranscript(transcript);

        // Generate next prompt using OpenAI GPT
        const nextPrompt = await generateNextPrompt(
          userId,
          transcript,
          extractedData,
          conversationStep
        );

        // If we have enough data and on step 2, find a match
        let friendMatch = undefined;
        if (
          conversationStep === 2 &&
          extractedData.interests &&
          extractedData.interests.length > 0
        ) {
          friendMatch =
            findFriendMatch(
              userId,
              extractedData.interests,
              extractedData.steps
            ) || undefined;
        }

        const response: ProcessVoiceResponse = {
          transcript,
          extractedData,
          nextPrompt,
          friendMatch,
        };

        return reply.code(200).send(response);
      } catch (error) {
        console.error("Error processing voice:", error);
        return reply.code(500).send({ error: "Failed to process voice input" });
      }
    }
  );

  // Get all available users (for demo purposes)
  fastify.get("/api/users", async (request, reply) => {
    // Return mock data from matchingService
    return reply.code(200).send({
      users: [
        {
          id: "user1",
          name: "Alice",
          interests: ["walking", "gardening", "reading"],
        },
        {
          id: "user2",
          name: "Bob",
          interests: ["walking", "chatting", "cooking"],
        },
        {
          id: "user3",
          name: "Carol",
          interests: ["reading", "music", "chatting"],
        },
        {
          id: "user4",
          name: "David",
          interests: ["gardening", "cooking", "walking"],
        },
      ],
    });
  });

  // Weather alert endpoint
  fastify.get("/api/weather/alert", async (request, reply) => {
    try {
      const { checkWeatherAlert } = await import(
        "../services/weatherAlertService"
      );
      const alert = await checkWeatherAlert();

      if (alert) {
        return reply.code(200).send(alert);
      }

      return reply.code(200).send({ show: false });
    } catch (error) {
      console.error("Error checking weather alert:", error);
      return reply.code(500).send({ error: "Failed to check weather alert" });
    }
  });

  // Text-to-Speech endpoint using OpenAI TTS
  fastify.post<{ Body: { text: string } }>(
    "/api/voice/tts",
    async (request, reply) => {
      try {
        const { text } = request.body;

        if (!text || text.trim().length === 0) {
          return reply.code(400).send({ error: "Text is required" });
        }

        // Generate speech using OpenAI TTS
        const audioBase64 = await textToSpeech(text);

        return reply.code(200).send({
          audioBase64,
          format: "mp3", // OpenAI TTS outputs MP3 format
        });
      } catch (error: any) {
        console.error("Error generating TTS:", error);

        // Check if it's a rate limit error (429)
        const isRateLimit =
          error?.status === 429 ||
          error?.code === "rate_limit_exceeded" ||
          error?.message?.includes("Rate limit") ||
          error?.message?.includes("rate_limit");

        if (isRateLimit) {
          // Return 429 status code for rate limit errors
          return reply.code(429).send({
            error: "Rate limit exceeded. Please try again later.",
            retryAfter: error?.headers?.["retry-after"] || "20",
          });
        }

        // For other errors, return 500
        return reply.code(500).send({
          error: error?.message || "Failed to generate speech",
        });
      }
    }
  );

  // Health check
  fastify.get("/health", async (request, reply) => {
    return reply.code(200).send({
      status: "ok",
      service: "healthybuddy-backend",
      timestamp: new Date().toISOString(),
    });
  });
}
