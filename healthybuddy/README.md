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
```

**Configure Hugging Face API:**
1. Get your Hugging Face API key from https://huggingface.co/settings/tokens
2. Create a `.env` file in the `backend` directory:
```bash
HUGGINGFACE_API_KEY=your_api_key_here
HUGGINGFACE_LLAMA_MODEL=meta-llama/Llama-2-7b-chat-hf
PORT=3001
```

**Note:** Some Llama models may require special access. You can use alternative models like:
- `mistralai/Mistral-7B-Instruct-v0.1`
- `microsoft/Phi-3-mini-4k-instruct`
- Or any other compatible model from Hugging Face

```bash
npm run dev
```

Backend will run on **http://localhost:3001**

**API Endpoints:**
- `GET /health` - Health check
- `POST /api/voice/process` - Process voice transcript and get friend matches
- `POST /api/voice/process-audio` - Process audio file (transcribe + generate response)
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
- **Voice Recording**: Record audio directly from the app using the microphone button
- **Speech-to-Text**: Uses Hugging Face's Whisper model for automatic speech recognition
- **AI-Powered Responses**: Uses Hugging Face Llama model for intelligent conversation
- **Data Extraction**: AI-powered extraction of:
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
2. **Option A - Voice Input:**
   - Tap the microphone button (🎤)
   - Speak: "I walked 3000 steps today and I'm feeling good"
   - Tap the stop button (⏹️) when done
   - Wait for AI transcription and response
3. **Option B - Text Input:**
   - Type: "I walked 3000 steps today and I'm feeling good"
   - Tap "Send"
4. Wait for AI-generated response
5. Continue conversation (voice or text)
6. Type/Speak: "I enjoy walking and chatting with friends"
7. See friend match result!

### Test Health Check
```bash
curl http://localhost:3001/health
```

## 🎯 Tech Stack

**Backend:**
- Fastify (web framework)
- TypeScript
- Zod (validation)
- Hugging Face Inference API (Llama for text generation, Whisper for speech-to-text)
- In-memory data (MVP - ready for PostgreSQL)

**Frontend:**
- React Native + Expo
- Expo Speech (TTS)
- Expo AV (audio recording)
- Expo File System (audio file handling)
- TypeScript
- Multi-platform (iOS, Android, Web)

## 📝 Next Steps for Production

- [x] Integrate real Speech-to-Text (Hugging Face Whisper)
- [x] Integrate AI for intelligent responses (Hugging Face Llama)
- [ ] Add user authentication
- [ ] Connect to database (PostgreSQL) for persistent user data
- [ ] Implement real-time chat between matched friends
- [ ] Fine-tune Llama model for better elderly care conversations
- [ ] Implement privacy controls and data encryption
- [ ] Add health tracking integrations (Apple Health, Google Fit)
- [ ] Deploy backend and frontend to cloud
- [ ] Add error handling for API rate limits

## 🏆 Hackathon Notes

- Built for **Junction 2025 Hackathon**
- **Team**: Hive5
- **Challenge**: Voice-only app for elderly wellness
- **Time**: One-day MVP
- **Focus**: Friend matching through voice interaction

## 📄 License

Junction Hackathon 2025 - Team Hive5
