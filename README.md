# Junction 2025 - Matcha Shop (Bye Migraine)

A full-stack application for a migraine relief café built for Junction Hackathon 2025.

## 🏗️ Project Structure

```
junction_2025/
├── backend/           # Node.js + Fastify API
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── routes/           # API endpoints
│   │   │   ├── menu.ts       # Menu endpoints
│   │   │   └── orders.ts     # Order endpoints
│   │   └── schema/           # Validation schemas
│   └── .env                  # Backend environment variables
│
└── matcha_shop/      # Expo + React Native App
    ├── app/                  # Screens (file-based routing)
    ├── services/             # API communication layer
    │   └── api.ts           # Backend API calls
    ├── constants/            # App constants & data
    └── .env                 # Frontend environment variables
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### 1. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file (already created):
```env
PORT=3000
NODE_ENV=development
```

Start the backend server:
```bash
npm run dev
```

Backend will run on **http://localhost:3000**

**API Endpoints:**
- `GET /health` - Health check
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get single menu item
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order

### 2. Setup Frontend

```bash
cd matcha_shop
npm install
```

Create `.env` file (already created):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Start the Expo app:
```bash
npx expo start
```

Frontend will run on **http://localhost:8081**

**Options:**
- Press `w` - Open in web browser
- Press `a` - Open Android emulator
- Press `i` - Open iOS simulator
- Scan QR code - Open on physical device

## 📱 App Screens

1. **Home** (`/`) - Welcome screen with "Bye Migraine" branding
2. **Menu** (`/menu`) - Display menu items (now fetches from backend!)
3. **Contact** (`/contact`) - Contact information

## 🔄 API Integration

The frontend automatically connects to the backend using the API service layer:

**Frontend (`matcha_shop/services/api.ts`):**
- Handles all HTTP requests to backend
- Includes error handling and fallback to local data
- TypeScript typed for safety

**Backend (`backend/src/routes/`):**
- RESTful API with Fastify
- CORS enabled for Expo
- In-memory data storage (will connect to PostgreSQL later)

## 🧪 Testing the Integration

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### Test 2: Get Menu
```bash
curl http://localhost:3000/api/menu
```
Expected: Array of 3 menu items

### Test 3: Frontend Loading
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd matcha_shop && npx expo start`
3. Open app in browser (press `w`)
4. Navigate to Menu screen
5. Should see menu items loaded from backend!

## 🎯 Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server auto-reloads on file changes
```

**Terminal 2 - Frontend:**
```bash
cd matcha_shop
npx expo start
# App auto-refreshes on file changes
```

## 📝 Next Steps

- [ ] Connect to PostgreSQL database
- [ ] Implement authentication (Suomi.fi mentioned in commits)
- [ ] Add order placement functionality
- [ ] Deploy backend and frontend
- [ ] Add more menu items and categories

## 🛠️ Tech Stack

**Backend:**
- Fastify (web framework)
- TypeScript
- PostgreSQL (planned)
- Zod (validation)

**Frontend:**
- React Native + Expo
- Expo Router (file-based routing)
- TypeScript
- Multi-platform (iOS, Android, Web)

## 📄 License

Junction Hackathon 2025 - Team High5
