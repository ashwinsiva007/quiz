import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import network from 'os';
import { registerSocketHandlers } from './socketHandlers.js';

const app = express();

// Allow all origins for deployed frontend (Vercel) to connect to backend (Railway)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
  /\.railway\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl) or matching origins
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(null, isAllowed ? origin : '*');
  },
  credentials: true,
}));

app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Performance options for 150+ concurrent WebSocket users
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io);

// Health check endpoint (also confirms server is running)
app.get('/', (_req, res) => {
  res.json({ status: 'ASI Quiz Arena Server is Running', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Railway injects PORT automatically; fallback to 3000 for local dev
const PORT = parseInt(process.env.PORT || '3000', 10);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n==================================================');
  console.log('🚀 ASI QUIZ ARENA SERVER IS LIVE');
  console.log('   Demystifying Artificial Intelligence');
  console.log('   Analytics Society of India - Student Chapter');
  console.log('==================================================');
  console.log(`\n✅ Backend Running on PORT: ${PORT}`);

  // Display LAN IPs for local Wi-Fi access during event
  const interfaces = network.networkInterfaces();
  console.log('\n📱 CONNECT STUDENT PHONES & HOST DEVICES VIA LAN:');
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   👉 Student Join URL: http://${net.address}:5173`);
        console.log(`   👉 Host Dashboard:  http://${net.address}:5173/host`);
      }
    }
  }
  console.log('==================================================\n');
});
