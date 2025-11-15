# HealthyBuddy - Quick Start Guide

## 🚀 Start the App (2 Terminals)

### Terminal 1: Backend
```bash
cd healthybuddy/backend
npm run dev
```

Wait for:
```
🎙️  HealthyBuddy Backend Server Running!
📡 API: http://localhost:3001
Ready to help elderly users find friends! 👵👴
```

### Terminal 2: Frontend
```bash
cd healthybuddy/frontend
npx expo start
```

Then press:
- **`w`** for web browser (easiest for testing)
- **`i`** for iOS simulator
- **`a`** for Android emulator

## 🧪 Test the Complete Flow

1. **Home Screen**: Click "Start Today's Voice Greeting"
2. **First Question**: System asks about your day
   - Type: `I walked 3000 steps today and I'm feeling great`
   - Click Send
   - Listen to voice response
   - (Click "← Back" in header to return home anytime)
3. **Second Question**: System asks about interests
   - Type: `I love walking and chatting with friends`
   - Click Send
4. **Friend Match**: See your matched friend!
   - View match score, common interests
   - Listen to voice announcement
   - Click "Repeat Match Info" to hear again
   - Click "← Home" to return to home screen
   - Or click "Start Another Conversation" to chat again

## 📝 Example Conversations

### High Activity User
```
Q: "How are you doing today?"
A: "I walked 5000 steps and I feel energetic"

Q: "Have you had any activities or interests?"
A: "I enjoy walking, cooking, and gardening"

Result: Matched with Bob (score: 72/100)
```

### Low Activity User
```
Q: "How are you doing today?"
A: "I only walked 1500 steps, feeling a bit tired"

Q: "Have you had any activities or interests?"
A: "I like reading, music, and chatting"

Result: Matched with Carol (score: 78/100)
```

## 🎯 Recognized Keywords

**Health Data:**
- Steps: "walked 3000 steps", "5000 steps today"
- Mood: "happy", "great", "good", "tired", "sad", "lonely"

**Interests:**
- walking, gardening, reading, cooking
- chatting, talking, friends
- music, singing, dancing, painting
- knitting, crafts, yoga, swimming

## 🐛 Troubleshooting

### Backend won't start
```bash
cd healthybuddy/backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend connection error
1. Make sure backend is running (Terminal 1)
2. Check backend shows: "Server listening at http://127.0.0.1:3001"
3. Check frontend `.env` has: `EXPO_PUBLIC_API_URL=http://localhost:3001`

### Voice not working
- Web browser: Works best in Chrome/Edge
- Mobile: Grant microphone permissions when prompted
- Fallback: Type your responses instead

## 📱 Testing on Phone

1. Install **Expo Go** app (iOS/Android)
2. Make sure phone and computer are on same WiFi
3. Scan QR code from terminal
4. Grant microphone permissions
5. Try voice interaction!

## 🎨 Customization

### Add More Mock Users
Edit `backend/src/services/matchingService.ts` and add to `mockUsers` array.

### Change Matching Weights
Edit `calculateMatchScore()` in `backend/src/services/matchingService.ts`:
- Interest overlap: 40%
- Activity level: 30%
- Age similarity: 20%
- Mood compatibility: 10%

### Add More Keywords
Edit `backend/src/services/voiceProcessor.ts` and add to `interestKeywords` array.

## 🏆 Demo Tips

1. **Start Clean**: Restart both backend and frontend before demo
2. **Test First**: Run through the flow once before presenting
3. **Prepare Examples**: Have 2-3 different conversation examples ready
4. **Show Voice**: Enable audio to demonstrate text-to-speech
5. **Explain Scores**: Point out the matching algorithm at work

## 📊 API Endpoints

Test manually with curl:

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Process Voice (Step 1):**
```bash
curl -X POST http://localhost:3001/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo1","transcript":"I walked 4000 steps today","conversationStep":1}'
```

**Process Voice (Step 2 - Get Match):**
```bash
curl -X POST http://localhost:3001/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo1","transcript":"I enjoy walking and reading","conversationStep":2}'
```

**Get Users:**
```bash
curl http://localhost:3001/api/users
```

## 💡 Next Steps

- [ ] Try different conversation patterns
- [ ] Test with different users (change interests)
- [ ] Observe how match scores change
- [ ] Test voice output on mobile device
- [ ] Add more mock users with varied profiles
- [ ] Experiment with the matching algorithm weights

Good luck with your demo! 🎉
