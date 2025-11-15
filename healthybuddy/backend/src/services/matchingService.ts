import { UserProfile, FriendMatch } from '../types';

/**
 * Simple in-memory user database for MVP
 */
const mockUsers: UserProfile[] = [
  {
    id: 'user1',
    name: 'Alice',
    age: 72,
    healthData: {
      steps: 3500,
      mood: 'happy',
      energy: 'medium',
      lastUpdate: new Date()
    },
    interests: ['walking', 'gardening', 'reading'],
    activityLevel: 'medium',
    createdAt: new Date()
  },
  {
    id: 'user2',
    name: 'Bob',
    age: 68,
    healthData: {
      steps: 5000,
      mood: 'happy',
      energy: 'high',
      lastUpdate: new Date()
    },
    interests: ['walking', 'chatting', 'cooking'],
    activityLevel: 'high',
    createdAt: new Date()
  },
  {
    id: 'user3',
    name: 'Carol',
    age: 75,
    healthData: {
      steps: 2000,
      mood: 'neutral',
      energy: 'low',
      lastUpdate: new Date()
    },
    interests: ['reading', 'music', 'chatting'],
    activityLevel: 'low',
    createdAt: new Date()
  },
  {
    id: 'user4',
    name: 'David',
    age: 70,
    healthData: {
      steps: 4000,
      mood: 'happy',
      energy: 'medium',
      lastUpdate: new Date()
    },
    interests: ['gardening', 'cooking', 'walking'],
    activityLevel: 'medium',
    createdAt: new Date()
  }
];

/**
 * Calculate match score between two users based on:
 * - Common interests (40%)
 * - Similar activity level (30%)
 * - Similar age (20%)
 * - Complementary mood (10%)
 */
function calculateMatchScore(user: UserProfile, candidate: UserProfile): number {
  let score = 0;

  // Interest overlap (40 points max)
  const commonInterests = user.interests.filter(interest =>
    candidate.interests.includes(interest)
  );
  const interestScore = (commonInterests.length / Math.max(user.interests.length, 1)) * 40;
  score += interestScore;

  // Activity level similarity (30 points max)
  const activityLevels = { low: 1, medium: 2, high: 3 };
  const activityDiff = Math.abs(
    activityLevels[user.activityLevel] - activityLevels[candidate.activityLevel]
  );
  const activityScore = Math.max(0, 30 - (activityDiff * 15));
  score += activityScore;

  // Age similarity (20 points max)
  const ageDiff = Math.abs(user.age - candidate.age);
  const ageScore = Math.max(0, 20 - ageDiff);
  score += ageScore;

  // Mood compatibility (10 points max)
  // Happy people can cheer up sad people, neutral is flexible
  if (user.healthData.mood === candidate.healthData.mood) {
    score += 10;
  } else if (
    (user.healthData.mood === 'happy' && candidate.healthData.mood === 'sad') ||
    (user.healthData.mood === 'sad' && candidate.healthData.mood === 'happy') ||
    user.healthData.mood === 'neutral' || candidate.healthData.mood === 'neutral'
  ) {
    score += 5;
  }

  return Math.round(score);
}

/**
 * Find best friend match for a user
 */
export function findFriendMatch(
  userId: string,
  userInterests: string[],
  userSteps?: number
): FriendMatch | null {
  // Determine activity level based on steps
  let activityLevel: 'low' | 'medium' | 'high' = 'medium';
  if (userSteps !== undefined) {
    if (userSteps < 2500) activityLevel = 'low';
    else if (userSteps > 4000) activityLevel = 'high';
  }

  // Create temporary user profile for matching
  const tempUser: UserProfile = {
    id: userId,
    name: 'Current User',
    age: 70, // Default
    healthData: {
      steps: userSteps,
      mood: 'neutral',
      energy: 'medium',
      lastUpdate: new Date()
    },
    interests: userInterests,
    activityLevel,
    createdAt: new Date()
  };

  // Find best match from mock users
  let bestMatch: FriendMatch | null = null;
  let bestScore = 0;

  for (const candidate of mockUsers) {
    if (candidate.id === userId) continue; // Skip self

    const score = calculateMatchScore(tempUser, candidate);
    const commonInterests = tempUser.interests.filter(interest =>
      candidate.interests.includes(interest)
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateAge: candidate.age,
        matchScore: score,
        commonInterests,
        reason: generateMatchReason(commonInterests, candidate, tempUser)
      };
    }
  }

  return bestMatch;
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(
  commonInterests: string[],
  candidate: UserProfile,
  user: UserProfile
): string {
  const reasons: string[] = [];

  if (commonInterests.length > 0) {
    reasons.push(`you both enjoy ${commonInterests.join(' and ')}`);
  }

  if (candidate.activityLevel === user.activityLevel) {
    reasons.push(`you have similar activity levels`);
  }

  if (candidate.healthData.mood === 'happy') {
    reasons.push(`${candidate.name} has a cheerful personality`);
  }

  return reasons.length > 0
    ? reasons.join(', and ')
    : 'you might enjoy each other\'s company';
}
