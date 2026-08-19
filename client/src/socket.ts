import { io, Socket } from 'socket.io-client';
import { MockQuizEngine } from './mockEngine';

export type ConnectionMode = 'connected' | 'connecting' | 'disconnected' | 'demo';

const DEMO_STORAGE_KEY = 'asi_demo_mode_active';
const BACKEND_STORAGE_KEY = 'asi_backend_url';

export const mockEngine = new MockQuizEngine();

let currentMode: ConnectionMode = 'connecting';
const statusListeners = new Set<(mode: ConnectionMode, details?: string) => void>();

export const getStoredBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check user-configured URL in localStorage
    const custom = localStorage.getItem(BACKEND_STORAGE_KEY);
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }

    // 2. Check environment variable (Vercel / Vite build)
    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
      return envUrl.trim();
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // 3. Local/LAN development
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return `${protocol}//${hostname}:3000`;
    }

    // 4. Default for production deployed domains (try same origin / proxy, or empty)
    return '';
  }

  return 'http://localhost:3000';
};

const initialUrl = getStoredBackendUrl();
const isInitiallyDemo = typeof window !== 'undefined' && localStorage.getItem(DEMO_STORAGE_KEY) === 'true';

// Create underlying real socket
export const realSocket: Socket = io(initialUrl || 'http://localhost:3000', {
  autoConnect: !isInitiallyDemo && initialUrl.length > 0,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 5000,
  transports: ['websocket', 'polling'],
});

function notifyStatus(mode: ConnectionMode, details?: string) {
  currentMode = mode;
  statusListeners.forEach((fn) => fn(mode, details));
}

// Check initial mode
if (isInitiallyDemo) {
  currentMode = 'demo';
} else if (!initialUrl && typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  // On a deployed remote host (e.g. Vercel) without a specified backend URL, default to disconnected so the user is guided
  currentMode = 'disconnected';
} else {
  currentMode = realSocket.connected ? 'connected' : 'connecting';
}

// Socket event listeners for real connection
realSocket.on('connect', () => {
  if (currentMode !== 'demo') {
    notifyStatus('connected', 'Live backend connected');
  }
});

realSocket.on('disconnect', (reason) => {
  if (currentMode !== 'demo') {
    notifyStatus('disconnected', `Disconnected: ${reason}`);
  }
});

realSocket.on('connect_error', (err) => {
  if (currentMode !== 'demo') {
    notifyStatus('disconnected', err.message || 'Cannot reach backend server');
  }
});

// If still in 'connecting' after 4s, fallback to 'disconnected' to give user clear actionable options
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (currentMode === 'connecting' && !realSocket.connected) {
      notifyStatus('disconnected', 'Backend connection timed out');
    }
  }, 4000);
}

// Unified socket proxy that seamlessly supports both real socket and offline demo mode
const eventSubscribers = new Map<string, Set<Function>>();

export const socket = {
  get connected(): boolean {
    if (currentMode === 'demo') return true;
    return realSocket.connected;
  },

  get id(): string {
    if (currentMode === 'demo') return mockEngine.localStudentId;
    return realSocket.id || 'client-socket-id';
  },

  on(event: string, callback: (...args: any[]) => void) {
    if (!eventSubscribers.has(event)) {
      eventSubscribers.set(event, new Set());
    }
    eventSubscribers.get(event)!.add(callback);

    // Register with real socket
    realSocket.on(event, callback);

    // Register with mock engine
    mockEngine.on(event, callback);
    return this;
  },

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      if (eventSubscribers.has(event)) {
        eventSubscribers.get(event)!.delete(callback);
      }
      realSocket.off(event, callback);
      mockEngine.off(event, callback);
    } else {
      eventSubscribers.delete(event);
      realSocket.off(event);
    }
    return this;
  },

  emit(event: string, ...args: any[]) {
    if (currentMode === 'demo') {
      // Route through mock engine
      handleMockEmit(event, ...args);
      return this;
    }

    // Normal real socket emit
    realSocket.emit(event, ...args);
    return this;
  },

  disconnect() {
    realSocket.disconnect();
    return this;
  },

  connect() {
    if (currentMode !== 'demo') {
      realSocket.connect();
    }
    return this;
  },
};

function handleMockEmit(event: string, ...args: any[]) {
  const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
  const data = args.length > 0 && typeof args[0] !== 'function' ? args[0] : {};

  switch (event) {
    case 'getInitialState':
      mockEngine.broadcast();
      break;

    case 'host:login':
      mockEngine.hostLogin(data.password, cb);
      break;

    case 'host:createQuiz':
      mockEngine.hostCreateQuiz(data, cb);
      break;

    case 'host:startQuiz':
      mockEngine.startQuiz();
      break;

    case 'host:endQuestion':
      mockEngine.endQuestion();
      break;

    case 'host:showLeaderboard':
      mockEngine.showLeaderboard();
      break;

    case 'host:nextQuestion':
      mockEngine.nextQuestion();
      break;

    case 'host:resetQuiz':
      mockEngine.resetQuiz();
      break;

    case 'host:kickParticipant':
      mockEngine.kickParticipant(data.socketIdOrName);
      break;

    case 'student:join':
      mockEngine.studentJoin(data.pin, data.name, cb);
      break;

    case 'student:reconnect':
      mockEngine.studentReconnect(data.pin, data.name, cb);
      break;

    case 'student:submitAnswer':
      mockEngine.studentSubmitAnswer(data.optionIndex, cb);
      break;

    default:
      console.warn(`[MockEngine] Unhandled event: ${event}`, data);
  }
}

export const subscribeConnectionStatus = (fn: (mode: ConnectionMode, details?: string) => void) => {
  statusListeners.add(fn);
  fn(currentMode);
  return () => {
    statusListeners.delete(fn);
  };
};

export const getConnectionMode = (): ConnectionMode => currentMode;

export const setDemoMode = (enableDemo: boolean) => {
  if (enableDemo) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    }
    realSocket.disconnect();
    notifyStatus('demo', 'Interactive In-Browser Demo Mode Enabled');
    // Trigger initial state update
    setTimeout(() => {
      mockEngine.broadcast();
    }, 100);
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    notifyStatus('connecting', 'Connecting to real backend server...');
    const url = getStoredBackendUrl();
    if (url) {
      (realSocket.io as any).uri = url;
      realSocket.connect();
    } else {
      notifyStatus('disconnected', 'No backend URL configured');
    }
  }
};

export const updateSocketBackendUrl = (newUrl: string) => {
  const cleanUrl = newUrl.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    localStorage.setItem(BACKEND_STORAGE_KEY, cleanUrl);
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }

  notifyStatus('connecting', `Connecting to ${cleanUrl}...`);

  (realSocket.io as any).uri = cleanUrl || 'http://localhost:3000';
  realSocket.disconnect().connect();
};

export const testBackendConnection = async (
  targetUrl: string
): Promise<{ ok: boolean; latencyMs?: number; message: string }> => {
  const url = targetUrl.trim().replace(/\/$/, '');
  if (!url) {
    return { ok: false, message: 'URL is required' };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return { ok: true, latencyMs, message: `Server is active & healthy (${latencyMs}ms latency)` };
    } else {
      return { ok: false, message: `Server returned HTTP ${res.status}: ${res.statusText}` };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Connection timed out after 4 seconds' };
    }
    return { ok: false, message: err.message || 'Failed to reach server. Check CORS/HTTPS.' };
  }
};
