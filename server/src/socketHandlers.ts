import { Server, Socket } from 'socket.io';
import { QuizEngine } from './quizEngine.js';

const HOST_PASSWORD = process.env.HOST_PASSWORD || 'asi2026';

let activeQuiz: QuizEngine | null = null;

export function registerSocketHandlers(io: Server) {
  // If no active quiz, create one by default
  if (!activeQuiz) {
    activeQuiz = new QuizEngine();
    setupEngineCallbacks(io);
  }

  io.on('connection', (socket: Socket) => {
    // Send initial status check
    socket.on('getInitialState', () => {
      if (activeQuiz) {
        socket.emit('quizStateUpdate', getSanitizedStateForSocket(socket, activeQuiz));
      }
    });

    // --- HOST AUTHENTICATION & CREATION ---
    socket.on('host:login', (data: { password: string }, callback?: (res: { success: boolean; message?: string }) => void) => {
      if (data && data.password === HOST_PASSWORD) {
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false, message: 'INVALID HOST PASSWORD. Default is: asi2026' });
      }
    });

    socket.on('host:createQuiz', (data: { title?: string; password?: string; questions?: any[] }, callback?: (res: { success: boolean; pin?: string; message?: string }) => void) => {
      if (data && data.password && data.password !== HOST_PASSWORD) {
        if (callback) callback({ success: false, message: 'INVALID HOST PASSWORD' });
        return;
      }

      activeQuiz = new QuizEngine(data?.questions, data?.title);
      setupEngineCallbacks(io);
      broadcastUpdate(io);

      if (callback) callback({ success: true, pin: activeQuiz.pin });
    });


    socket.on('host:startQuiz', () => {
      if (activeQuiz && activeQuiz.state === 'LOBBY') {
        activeQuiz.startQuiz();
      }
    });

    socket.on('host:endQuestion', () => {
      if (activeQuiz && activeQuiz.state === 'QUESTION_ACTIVE') {
        activeQuiz.endQuestion();
      }
    });

    socket.on('host:showLeaderboard', () => {
      if (activeQuiz && activeQuiz.state === 'QUESTION_RESULTS') {
        activeQuiz.showLeaderboard();
      }
    });

    socket.on('host:nextQuestion', () => {
      if (activeQuiz && (activeQuiz.state === 'LEADERBOARD' || activeQuiz.state === 'QUESTION_RESULTS')) {
        activeQuiz.nextQuestion();
      }
    });

    socket.on('host:kickParticipant', (data: { socketIdOrName: string }) => {
      if (activeQuiz) {
        const removed = activeQuiz.removeParticipant(data.socketIdOrName);
        if (removed) {
          broadcastUpdate(io);
        }
      }
    });

    socket.on('host:resetQuiz', () => {
      if (activeQuiz) {
        activeQuiz.resetQuiz();
        broadcastUpdate(io);
      }
    });

    // --- STUDENT EVENTS ---

    // PIN validation — called before showing the name entry form
    socket.on('student:checkPin', (data: { pin: string }, callback?: (res: { exists: boolean; gameState?: string; participantCount?: number; message?: string }) => void) => {
      if (!activeQuiz) {
        if (callback) callback({ exists: false, message: 'NO ACTIVE QUIZ ROOM' });
        return;
      }
      if (!data || data.pin.trim() !== activeQuiz.pin) {
        if (callback) callback({ exists: false, message: 'INVALID GAME PIN' });
        return;
      }
      if (callback) callback({
        exists: true,
        gameState: activeQuiz.state,
        participantCount: activeQuiz.participants.size,
      });
    });

    socket.on('student:join', (data: { pin: string; name: string }) => {
      if (!activeQuiz) {
        socket.emit('student:joinResponse', { success: false, message: 'NO ACTIVE QUIZ ROOM' });
        return;
      }

      if (data.pin.trim() !== activeQuiz.pin) {
        socket.emit('student:joinResponse', { success: false, message: 'INVALID GAME PIN. Check projector screen.' });
        return;
      }

      const res = activeQuiz.joinParticipant(socket.id, data.name);
      if (!res.success) {
        socket.emit('student:joinResponse', { success: false, message: res.message });
        return;
      }

      socket.join('participants');
      socket.emit('student:joinResponse', {
        success: true,
        participant: res.participant,
        pin: activeQuiz.pin,
      });

      broadcastUpdate(io);
    });

    socket.on('student:reconnect', (data: { pin: string; name: string }) => {
      if (!activeQuiz || data.pin.trim() !== activeQuiz.pin) {
        socket.emit('student:reconnectResponse', { success: false });
        return;
      }

      const reconnectedP = activeQuiz.reconnectParticipant(socket.id, socket.id, data.name);
      if (reconnectedP) {
        socket.join('participants');
        socket.emit('student:reconnectResponse', {
          success: true,
          participant: reconnectedP,
        });
        broadcastUpdate(io);
      } else {
        socket.emit('student:reconnectResponse', { success: false });
      }
    });

    socket.on('student:submitAnswer', (data: { optionIndex: number }) => {
      if (!activeQuiz) return;
      const res = activeQuiz.submitAnswer(socket.id, data.optionIndex);
      socket.emit('student:answerResponse', res);
    });

    socket.on('disconnect', () => {
      // Keep participant in memory for reconnection grace, but update count if needed
    });
  });
}

function setupEngineCallbacks(io: Server) {
  if (!activeQuiz) return;

  activeQuiz.setCallbacks(
    () => {
      broadcastUpdate(io);
    },
    (timeLeft: number) => {
      io.emit('timerTick', { timeLeft });
    }
  );
}

function broadcastUpdate(io: Server) {
  if (!activeQuiz) return;

  // Send host full status
  io.emit('hostUpdate', activeQuiz.getHostState());

  // Broadcast state updates to each socket customized for student view
  io.sockets.sockets.forEach((socket) => {
    socket.emit('quizStateUpdate', getSanitizedStateForSocket(socket, activeQuiz!));
  });
}

function getSanitizedStateForSocket(socket: Socket, engine: QuizEngine) {
  const p = engine.participants.get(socket.id);
  const qResult = engine.getQuestionResult();
  const currentQ = engine.questions[engine.currentQuestionIndex];

  let studentResult = null;
  if (p && (engine.state === 'QUESTION_RESULTS' || engine.state === 'LEADERBOARD' || engine.state === 'FINISHED')) {
    studentResult = {
      isCorrect: p.hasAnsweredCurrentQuestion && p.selectedOption === currentQ?.correctAnswer,
      score: p.score,
      lastQuestionScore: p.lastQuestionScore,
      selectedOption: p.selectedOption,
      correctOption: currentQ?.correctAnswer,
    };
  }

  return {
    pin: engine.pin,
    state: engine.state,
    currentQuestionIndex: engine.currentQuestionIndex,
    totalQuestions: engine.questions.length,
    timeLeft: engine.timeLeft,
    timeLimit: engine.timeLimit,
    currentQuestion: engine.getCurrentClientQuestion(),
    participantCount: engine.participants.size,
    participant: p ? {
      name: p.name,
      score: p.score,
      hasAnswered: p.hasAnsweredCurrentQuestion,
      selectedOption: p.selectedOption,
    } : null,
    studentResult,
    leaderboard: engine.getLeaderboard(),
  };
}
