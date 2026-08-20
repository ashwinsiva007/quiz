# ⚡ ASI Quiz Arena
### *Demystifying Artificial Intelligence* — Live Real-Time Quiz Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![MQTT](https://img.shields.io/badge/MQTT-Realtime_Bridge-660066?logo=eclipse-mosquitto&logoColor=white)](https://mqtt.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

**ASI Quiz Arena** is a modern, high-performance, real-time live interactive quiz platform engineered for high-concurrency college events, symposiums, and classroom competitions. Built for the **Analytics Society of India (ASI) - Student Chapter**, it enables 150+ students to join simultaneously with zero sign-in friction using mobile QR codes while hosts control the arena via a stunning projector-ready dashboard.

---

## 🎯 Key Highlights

* 🚀 **Zero Sign-In Friction:** Students scan a QR code or enter a 6-digit Game PIN, pick a name, and are instantly in the lobby.
* 📱 **Mobile-Optimized Player Screen:** Ultra-responsive touch UI with color-coded answer tiles, live 15-second countdown timer, real-time result animations, and personal score/rank trackers.
* 🖥️ **16:9 Projector-Ready Host Dashboard:** High-contrast dark arena UI with live participant counter, QR code projection, answer progress bars, question controls, and confetti podiums.
* ⏱️ **Synchronized Answering & Intermissions:** 
  * 15-second answering window with speed bonuses for quick thinking.
  * 5-second answer reveal intermission with dynamic countdown timers.
  * Milestone Leaderboard showcases (every 5 questions and after Q13).
* 🔄 **Dual-Mode Resilient Engine:**
  * **Live Mode:** Powered by a Node.js + Express + Socket.IO backend for dedicated high-scale hosting.
  * **Cloud Bridge Mode:** Decentralized WebSocket MQTT cloud synchronization that works out-of-the-box on serverless hosting (e.g. Vercel) without a dedicated backend.
* 🛡️ **Fault-Tolerant Reconnection & Mid-Game Entry:** Automatic 1.5s state heartbeats, lobby auto-sync polling, and mid-game entry support so no participant is left out due to network blips.

---

## 🏗️ Architecture & Realtime Synchronization

```
                           ┌────────────────────────┐
                           │   Host Dashboard       │
                           │   (/host route)        │
                           └───────────┬────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │   Socket.IO Server    │             │  Cloud Realtime Bridge│
        │   (Railway / Render)  │             │  (MQTT Broker Mesh)   │
        └───────────┬───────────┘             └───────────┬───────────┘
                    │                                     │
    ┌───────────────┼───────────────┐     ┌───────────────┼───────────────┐
    ▼               ▼               ▼     ▼               ▼               ▼
[Student 1]    [Student 2]    [Student N] [Student 1]    [Student 2]    [Student N]
```

### Protocol Flow
1. **Lobby & Join:** Host generates a room PIN. Students scan the QR code (`/join?pin=XXXXXX`), which auto-detects the PIN and registers the player.
2. **Game Loop:**
   - Host clicks `START QUIZ` $\rightarrow$ State broadcasts `QUESTION_ACTIVE` (15s limit).
   - Students tap their chosen option (A, B, C, D).
   - Once the timer expires, the server reveals correct answers (`QUESTION_RESULTS`, 5s countdown).
   - Milestone leaderboards auto-trigger at checkpoints.
   - Host crowns winners on the finale podium with interactive confetti.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | Component architecture, strict typing, high-performance rendering |
| **Build Tooling** | Vite 5 | Instant HMR, optimized production code-splitting |
| **Styling & Icons** | Tailwind CSS + Lucide React | Modern dark aesthetic, responsive grids, sleek iconography |
| **Visual Effects** | Canvas Confetti | Celebration effects for leaderboard transitions and winners |
| **QR Code Engine** | `qrcode.react` | High-definition SVG QR code rendering for projector screens |
| **Backend Runtime** | Node.js (v20+) + Express | Robust HTTP routing and health-check API |
| **WebSockets** | Socket.IO (v4) | Bidirectional event-driven client-server networking |
| **Cloud Bridge** | MQTT.js (WSS) | Multi-broker distributed publish/subscribe state mesh |

---

## 📂 Project Structure

```bash
quiz/
├── client/                     # Frontend React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── BrandingHeader.tsx      # ASI Chapter branding & banner
│   │   │   ├── ConnectionStatus.tsx    # Offline/reconnection indicators
│   │   │   ├── HostDashboard.tsx       # 16:9 Host controller & projector view
│   │   │   ├── HostLogin.tsx           # Secure host password authentication
│   │   │   ├── StudentJoin.tsx         # QR PIN auto-detection & name entry
│   │   │   └── StudentScreen.tsx       # Interactive mobile player arena
│   │   ├── cloudBridge.ts              # Multi-broker MQTT realtime synchronization
│   │   ├── gameEngine.ts               # Resilient local state engine & fallback
│   │   ├── questions.json              # 15 curated AI & ML competition questions
│   │   ├── socket.ts                   # Unified WebSocket / CloudBridge switcher
│   │   ├── types.ts                    # Shared TypeScript interfaces
│   │   ├── App.tsx                     # Route management & event orchestrator
│   │   └── main.tsx                    # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend Node.js Server
│   ├── src/
│   │   ├── questions.json              # Source question bank
│   │   ├── quizEngine.ts               # Core server-side game state machine
│   │   ├── server.ts                   # Express & Socket.IO HTTP/WS server
│   │   ├── socketHandlers.ts           # Socket event listeners & broadcast routines
│   │   └── types.ts                    # Backend data types
│   ├── package.json
│   └── tsconfig.json
├── package.json                # Root automation scripts
├── vercel.json                 # Vercel SPA routing configuration
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** `>= 20.0.0`
- **npm** `>= 9.0.0`

### 2. Clone the Repository
```bash
git clone https://github.com/ashwinsiva007/quiz.git
cd quiz
```

### 3. Install Dependencies
```bash
# Install root, client, and server dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 4. Run Both Client and Server Concurrently
```bash
npm run dev
```

* **Student View:** [http://localhost:5173](http://localhost:5173)
* **Host Dashboard:** [http://localhost:5173/host](http://localhost:5173/host) *(Default Password: `asi2026`)*
* **Backend Health API:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🌐 Deployment Guide

### Deploying Frontend (Vercel)
1. Import this repository into [Vercel](https://vercel.com).
2. Set **Framework Preset** to `Vite`.
3. Set **Root Directory** to `client` (or use the root `vercel.json`).
4. **Important (Public Access):**
   * Go to **Project Settings** $\rightarrow$ **Deployment Protection**.
   * Ensure **Vercel Authentication** is set to **Disabled / Off** so participants scanning the QR code enter the game directly without login prompts.
5. *(Optional for Live Server Mode)*: Under **Environment Variables**, add:
   ```env
   VITE_SOCKET_URL=https://your-quiz-backend.up.railway.app
   ```

### Deploying Backend (Railway / Render)
1. Deploy the `server/` directory as a Node.js web service.
2. Build command: `npm run build`
3. Start command: `npm start`
4. Set optional environment variable:
   ```env
   HOST_PASSWORD=your_custom_password
   PORT=3000
   ```

---

## 📝 Customizing Questions

You can easily replace the competition questions by updating `client/src/questions.json` and `server/src/questions.json`:

```json
[
  {
    "id": 1,
    "question": "What algorithm is primarily used to train deep neural networks by computing gradients?",
    "options": [
      "A. Backpropagation",
      "B. Breadth-First Search",
      "C. Dijkstra's Algorithm",
      "D. K-Means Clustering"
    ],
    "correctAnswer": 0,
    "timeLimit": 15
  }
]
```

---

## 🏆 Credits & Organization

* **Organized by:** Analytics Society of India (ASI) — Student Chapter
* **Event:** *Demystifying Artificial Intelligence* Live Arena
* **Maintained by:** [@ashwinsiva007](https://github.com/ashwinsiva007)

---

<p align="center">Made with ❤️ for competitive coding, machine learning enthusiasts, and interactive classrooms.</p>
