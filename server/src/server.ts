import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import network from 'os';
import { registerSocketHandlers } from './socketHandlers.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Performance options for 150+ concurrent websocket users
  pingInterval: 10000,
  pingTimeout: 5000,
});

registerSocketHandlers(io);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🚀 ASI QUIZ ARENA SERVER IS LIVE');
  console.log('   Demystifying Artificial Intelligence');
  console.log('   Analytics Society of India - Student Chapter');
  console.log('==================================================');
  console.log(`\nLocal Backend:   http://localhost:${PORT}`);

  // Display LAN IPs for quick student connections
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
