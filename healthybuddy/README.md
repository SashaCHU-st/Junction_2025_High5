# HealthyBuddy - Voice-Only Elderly Wellness App

A mobile app where all interaction happens through voice-only UI, designed to improve elderly people's life happiness and physical health by connecting them with compatible friends.

## 🎯 MVP Features

- **Voice Interaction**: Users interact via voice to share daily life, interests, and health data
- **Friend Matching**: System recommends friend match candidates based on collected interests and health data
- **Voice-First Design**: Voice as the primary interaction interface with minimal screen display
- **Simple Matching Algorithm**: Basic scoring system matching users by interests, activity level, age, and mood

## 🏗️ Project Structure

```
healthybuddy/
├── backend/           # Node.js + Fastify API
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── routes/           # API endpoints
│   │   │   └── voice.ts      # Voice processing endpoints
│   │   ├── services/         # Business logic
│   │   │   ├── voiceProcessor.ts    # Keyword extraction
│   │   │   └── matchingService.ts   # Friend matching algorithm
│   │   └── types/            # TypeScript types
│   └── .env                  # Backend config (PORT=3001)
│
└── frontend/          # React Native + Expo App
    ├── screens/              # UI screens
    │   ├── HomeScreen.tsx           # Welcome screen
    │   ├── VoiceChatScreen.tsx      # Voice conversation
    │   └── FriendMatchScreen.tsx    # Match results
    ├── services/             # API & voice services
    │   ├── api.ts                   # Backend API calls
    │   └── voiceService.ts          # Text-to-speech
    ├── types/                # TypeScript types
    └── .env                  # Frontend config (API URL)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- iOS Simulator, Android Emulator, or Expo Go app on phone

### 1. Setup Backend

```bash
cd backend
npm install
npm run dev
```

Backend will run on **http://localhost:3001**

**API Endpoints:**
- `GET /health` - Health check
- `POST /api/voice/process` - Process voice transcript and get friend matches
- `GET /api/users` - Get all available users (demo)

### 2. Setup Frontend

```bash
cd frontend
npm install
npx expo start
```

**Options:**
- Press `w` - Open in web browser
- Press `a` - Open Android emulator
- Press `i` - Open iOS simulator
- Scan QR code - Open on physical device with Expo Go

## 📱 User Journey

1. **Home Screen**: User taps "Start Today's Voice Greeting"
2. **Voice Chat Screen**:
   - System greets: "Good morning! How are you doing today?"
   - User responds with voice/text (e.g., "I walked 400 steps today, feeling tired")
   - System extracts: steps=400, mood=tired
   - System asks: "Have you had any activities or interests you'd like to do?"
   - User responds: "I want to walk with someone"
   - System extracts: interests=[walking]
3. **Friend Match Screen**:
   - System shows best friend match based on collected data
   - Displays match score, common interests, and reason
   - Voice announcement of the match
   - Option to start new conversation

## 🎙️ Voice Features

- **Text-to-Speech**: Uses Expo Speech API for voice output
- **Speech-to-Text**: MVP uses text input as fallback (easily upgradeable to real STT)
- **Keyword Extraction**: Simple pattern matching for:
  - Health data (steps, mood)
  - Interests (walking, chatting, reading, etc.)
  - Activities (exercise, gardening, etc.)

## 🧮 Matching Algorithm

The system calculates match scores (0-100) based on:
- **Common Interests** (40%): Overlap in shared activities
- **Activity Level** (30%): Similar daily step counts
- **Age Similarity** (20%): Close in age
- **Mood Compatibility** (10%): Complementary emotional states

## 🧪 Testing

### Test the Complete Flow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npx expo start
# Press 'w' for web or 'i' for iOS simulator
```

**Test Conversation:**
1. Tap "Start Today's Voice Greeting"
2. Type: "I walked 3000 steps today and I'm feeling good"
3. Wait for system response
4. Type: "I enjoy walking and chatting with friends"
5. See friend match result!

### Test Health Check
```bash
curl http://localhost:3001/health
```

## 🎯 Tech Stack

**Backend:**
- Fastify (web framework)
- TypeScript
- Zod (validation)
- In-memory data (MVP - ready for PostgreSQL)

**Frontend:**
- React Native + Expo
- Expo Speech (TTS)
- Expo AV (audio recording)
- TypeScript
- Multi-platform (iOS, Android, Web)

## 📝 Next Steps for Production

- [ ] Integrate real Speech-to-Text (Google Cloud Speech, OpenAI Whisper, or Azure)
- [ ] Add user authentication
- [ ] Connect to database (PostgreSQL) for persistent user data
- [ ] Implement real-time chat between matched friends
- [ ] Add more sophisticated NLP for better intent extraction
- [ ] Implement privacy controls and data encryption
- [ ] Add health tracking integrations (Apple Health, Google Fit)
- [ ] Deploy backend and frontend to cloud

## 🏆 Hackathon Notes

- Built for **Junction 2025 Hackathon**
- **Team**: Hive5
- **Challenge**: Voice-only app for elderly wellness
- **Time**: One-day MVP
- **Focus**: Friend matching through voice interaction

## 📄 License

Junction Hackathon 2025 - Team Hive5
