import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { processVoiceTranscript, generateNextPrompt } from '../services/voiceProcessor';
import { findFriendMatch } from '../services/matchingService';
import { ProcessVoiceRequest, ProcessVoiceResponse } from '../types';

// Validation schema
const processVoiceSchema = z.object({
  userId: z.string(),
  transcript: z.string(),
  conversationStep: z.number().optional().default(1)
});

export async function voiceRoutes(fastify: FastifyInstance) {
  // Process voice transcript and extract data
  fastify.post<{ Body: ProcessVoiceRequest & { conversationStep?: number } }>(
    '/api/voice/process',
    async (request, reply) => {
      try {
        const { userId, transcript, conversationStep = 1 } = processVoiceSchema.parse(request.body);

        // Extract data from transcript
        const extractedData = processVoiceTranscript(transcript);

        // Generate next prompt
        const nextPrompt = generateNextPrompt(extractedData, conversationStep);

        // If we have enough data and on step 2, find a match
        let friendMatch = undefined;
        if (conversationStep === 2 && extractedData.interests && extractedData.interests.length > 0) {
          friendMatch = findFriendMatch(userId, extractedData.interests, extractedData.steps) || undefined;
        }

        const response: ProcessVoiceResponse = {
          extractedData,
          nextPrompt,
          friendMatch
        };

        return reply.code(200).send(response);
      } catch (error) {
        console.error('Error processing voice:', error);
        return reply.code(500).send({ error: 'Failed to process voice input' });
      }
    }
  );

  // Get all available users (for demo purposes)
  fastify.get('/api/users', async (request, reply) => {
    // Return mock data from matchingService
    return reply.code(200).send({
      users: [
        { id: 'user1', name: 'Alice', interests: ['walking', 'gardening', 'reading'] },
        { id: 'user2', name: 'Bob', interests: ['walking', 'chatting', 'cooking'] },
        { id: 'user3', name: 'Carol', interests: ['reading', 'music', 'chatting'] },
        { id: 'user4', name: 'David', interests: ['gardening', 'cooking', 'walking'] }
      ]
    });
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'healthybuddy-backend',
      timestamp: new Date().toISOString()
    });
  });
}
