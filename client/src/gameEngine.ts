import { Question, HostState, StudentQuizState, LeaderboardEntry, QuestionResultPayload, HostParticipant } from './types';
import defaultQuestions from './questions.json';
import { cloudBridge, CloudMessage } from './cloudBridge';

const STORAGE_KEY_STATE = 'asi_quiz_global_state';
const CHANNEL_NAME = 'asi_quiz_channel';

export interface ParticipantData {
  id: string;
  name: string;
  score: number;
  lastQuestionScore: number;
  hasAnswered: boolean;
  selectedOption: number | null;
  answerTime: number | null;
  isBot?: boolean;
}

export interface SharedGameState {
  pin: string;
  title: string;
  state: 'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_RESULTS' | 'LEADERBOARD' | 'FINISHED';
  currentQuestionIndex: number;
  timeLeft: number;
  timeLimit: number;
  questions: Question[];
  participants: ParticipantData[];
  lastUpdated: number;
}

class GameEngine {
  private state: SharedGameState;
  private channel: BroadcastChannel | null = null;
  private timer: any = null;
  private questionStartTime: number = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  public localParticipantId: string;
  public isHostRole: boolean = false;

  constructor() {
    this.localParticipantId = this.getOrCreateLocalId();
    this.state = this.loadState() || this.createDefaultState();

    if (typeof window !== 'undefined') {
      this.isHostRole = window.location.pathname.startsWith('/host');

      // Local BroadcastChannel for same-device tabs
      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            this.handleChannelMessage(event.data);
          };
        } catch (e) {
          console.warn('BroadcastChannel not supported');
        }
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_STATE && e.newValue) {
          try {
            const newState = JSON.parse(e.newValue);
            this.state = newState;
            this.notifyListeners();
          } catch (err) {
            console.error('Storage sync error:', err);
          }
        }
      });
    }

    // Connect to Cloud Realtime Bridge for cross-device synchronization
    cloudBridge.connect(this.state.pin);
    cloudBridge.onMessage((msg: CloudMessage) => this.handleCloudMessage(msg));
  }

  private getOrCreateLocalId(): string {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('asi_local_participant_id');
      if (!id) {
        id = 'p_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('asi_local_participant_id', id);
      }
      return id;
    }
    return 'local_player';
  }

  private createDefaultState(): SharedGameState {
    return {
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      title: 'Demystifying Artificial Intelligence',
      state: 'LOBBY',
      currentQuestionIndex: 0,
      timeLeft: 20,
      timeLimit: 15,
      questions: defaultQuestions as Question[],
      participants: [],
      lastUpdated: Date.now(),
    };
  }

  private loadState(): SharedGameState | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  private saveAndBroadcast(broadcastCloud: boolean = true) {
    this.state.lastUpdated = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
    }
    if (this.channel) {
      this.channel.postMessage({ type: 'STATE_UPDATE', state: this.state });
    }

    if (broadcastCloud) {
      cloudBridge.connect(this.state.pin);
      cloudBridge.publish('STATE_UPDATE', { state: this.state });
    }

    this.notifyListeners();
  }

  private handleChannelMessage(data: any) {
    if (!data) return;
    if (data.type === 'STATE_UPDATE' && data.state) {
      this.state = data.state;
      this.notifyListeners();
    } else if (data.type === 'TIMER_TICK') {
      this.state.timeLeft = data.timeLeft;
      this.emit('timerTick', { timeLeft: data.timeLeft });
    }
  }

  private handleCloudMessage(msg: CloudMessage) {
    switch (msg.type) {
      case 'JOIN': {
        const { id, name } = msg.payload || {};
        if (id && name) {
          // If we are host, register this participant and broadcast updated state
          if (this.isHostRole) {
            let existing = this.state.participants.find((p) => p.id === id);
            if (!existing) {
              this.state.participants.push({
                id,
                name: name.trim(),
                score: 0,
                lastQuestionScore: 0,
                hasAnswered: false,
                selectedOption: null,
                answerTime: null,
              });
            } else {
              existing.name = name.trim();
            }
            this.saveAndBroadcast(true);
          }
        }
        break;
      }

      case 'ANSWER': {
        const { id, optionIndex } = msg.payload || {};
        if (this.isHostRole && id !== undefined && optionIndex !== undefined) {
          const p = this.state.participants.find((item) => item.id === id);
          if (p && !p.hasAnswered && this.state.state === 'QUESTION_ACTIVE') {
            const currentQ = this.state.questions[this.state.currentQuestionIndex];
            const timeTaken = (Date.now() - this.questionStartTime) / 1000;
            const isCorrect = optionIndex === currentQ?.correctAnswer;

            p.hasAnswered = true;
            p.selectedOption = optionIndex;
            p.answerTime = timeTaken;

            let pts = 0;
            if (isCorrect) {
              const speedBonus = Math.max(0, Math.floor((1 - timeTaken / this.state.timeLimit) * 500));
              pts = 1000 + speedBonus;
              p.score += pts;
              p.lastQuestionScore = pts;
            } else {
              p.lastQuestionScore = 0;
            }

            // Keep answering window open for full 15 seconds without ending early
            this.saveAndBroadcast(true);
          }
        }
        break;
      }

      case 'STATE_UPDATE': {
        // Students receive full state updates from Host
        if (msg.payload && msg.payload.state) {
          const incomingState = msg.payload.state as SharedGameState;
          // Accept if pin matches and incoming state is newer or valid
          if (incomingState.pin === this.state.pin) {
            this.state = incomingState;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
            }
            this.notifyListeners();
          }
        }
        break;
      }

      case 'TIMER_TICK': {
        if (!this.isHostRole && msg.payload?.timeLeft !== undefined) {
          this.state.timeLeft = msg.payload.timeLeft;
          this.emit('timerTick', { timeLeft: msg.payload.timeLeft });
        }
        break;
      }

      case 'PING': {
        if (this.isHostRole) {
          cloudBridge.publish('STATE_UPDATE', { state: this.state });
        }
        break;
      }
    }
  }

  public setAsHost(isHost: boolean) {
    this.isHostRole = isHost;
  }

  public on(event: string, fn: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  public off(event: string, fn: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(fn);
    }
  }

  public emit(event: string, ...args: any[]) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  public notifyListeners() {
    this.emit('hostUpdate', this.getHostState());
    this.emit('quizStateUpdate', this.getStudentState());
  }

  public getHostState(): HostState {
    const currentQ = this.state.questions[this.state.currentQuestionIndex];
    let questionResult: QuestionResultPayload | undefined;

    if (this.state.state === 'QUESTION_RESULTS' || this.state.state === 'LEADERBOARD' || this.state.state === 'FINISHED') {
      const counts = [0, 0, 0, 0];
      let total = 0;
      this.state.participants.forEach((p) => {
        if (p.hasAnswered && p.selectedOption !== null && p.selectedOption >= 0 && p.selectedOption < 4) {
          counts[p.selectedOption]++;
          total++;
        }
      });
      if (currentQ) {
        questionResult = {
          questionIndex: this.state.currentQuestionIndex + 1,
          totalQuestions: this.state.questions.length,
          questionText: currentQ.question,
          options: currentQ.options,
          correctAnswer: currentQ.correctAnswer,
          stats: {
            countA: counts[0],
            countB: counts[1],
            countC: counts[2],
            countD: counts[3],
            totalAnswers: total,
          },
        };
      }
    }

    const hostParticipants: HostParticipant[] = this.state.participants.map((p) => ({
      socketId: p.id,
      name: p.name,
      score: p.score,
      hasAnswered: p.hasAnswered,
    }));

    return {
      pin: this.state.pin,
      state: this.state.state,
      currentQuestionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.questions.length,
      timeLeft: this.state.timeLeft,
      timeLimit: this.state.timeLimit,
      participantCount: this.state.participants.length,
      participants: hostParticipants,
      answerCount: this.state.participants.filter((p) => p.hasAnswered).length,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            questionIndex: this.state.currentQuestionIndex + 1,
            totalQuestions: this.state.questions.length,
            question: currentQ.question,
            options: currentQ.options,
            timeLimit: currentQ.timeLimit || 20,
          }
        : undefined,
      questionResult,
      leaderboard: this.getLeaderboard(),
    };
  }

  public getStudentState(): StudentQuizState {
    const currentQ = this.state.questions[this.state.currentQuestionIndex];
    const p = this.state.participants.find((item) => item.id === this.localParticipantId);

    let studentResult = null;
    if (p && (this.state.state === 'QUESTION_RESULTS' || this.state.state === 'LEADERBOARD' || this.state.state === 'FINISHED')) {
      studentResult = {
        isCorrect: p.hasAnswered && p.selectedOption === currentQ?.correctAnswer,
        score: p.score,
        lastQuestionScore: p.lastQuestionScore,
        selectedOption: p.selectedOption,
        correctOption: currentQ?.correctAnswer ?? 0,
      };
    }

    return {
      pin: this.state.pin,
      state: this.state.state,
      currentQuestionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.questions.length,
      timeLeft: this.state.timeLeft,
      timeLimit: this.state.timeLimit,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            questionIndex: this.state.currentQuestionIndex + 1,
            totalQuestions: this.state.questions.length,
            question: currentQ.question,
            options: currentQ.options,
            timeLimit: currentQ.timeLimit || 20,
          }
        : undefined,
      participantCount: this.state.participants.length,
      participant: p
        ? {
            name: p.name,
            score: p.score,
            hasAnswered: p.hasAnswered,
            selectedOption: p.selectedOption,
          }
        : null,
      studentResult,
      leaderboard: this.getLeaderboard(),
    };
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const sorted = [...this.state.participants].sort((a, b) => b.score - a.score);
    return sorted.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score,
      lastQuestionScore: p.lastQuestionScore,
    }));
  }

  // --- HOST ACTIONS ---
  public hostCreateQuiz(title?: string, questions?: Question[]) {
    this.isHostRole = true;
    this.state.title = title || 'Demystifying Artificial Intelligence';
    if (questions && questions.length > 0) {
      this.state.questions = questions;
    }
    this.state.pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.state.state = 'LOBBY';
    this.state.currentQuestionIndex = 0;
    this.state.participants = [];
    cloudBridge.connect(this.state.pin);
    this.saveAndBroadcast(true);
    return this.state.pin;
  }

  private autoAdvanceTimer: any = null;

  private clearAutoAdvanceTimer() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  public startQuiz() {
    this.isHostRole = true;
    this.clearAutoAdvanceTimer();
    this.state.currentQuestionIndex = 0;
    this.startQuestion(0);
  }

  public startQuestion(index: number) {
    this.isHostRole = true;
    this.clearAutoAdvanceTimer();
    if (index >= this.state.questions.length) {
      this.finishQuiz();
      return;
    }

    this.state.currentQuestionIndex = index;
    const q = this.state.questions[index];
    this.state.timeLimit = q.timeLimit || 15;
    this.state.timeLeft = this.state.timeLimit;
    this.state.state = 'QUESTION_ACTIVE';
    this.questionStartTime = Date.now();

    // Reset participant question states
    this.state.participants.forEach((p) => {
      p.hasAnswered = false;
      p.selectedOption = null;
      p.answerTime = null;
      p.lastQuestionScore = 0;
    });

    this.saveAndBroadcast(true);

    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.state.timeLeft--;
      if (this.channel) {
        this.channel.postMessage({ type: 'TIMER_TICK', timeLeft: this.state.timeLeft });
      }
      cloudBridge.publish('TIMER_TICK', { timeLeft: this.state.timeLeft });
      this.emit('timerTick', { timeLeft: this.state.timeLeft });

      if (this.state.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endQuestion();
      }
    }, 1000);
  }

  public endQuestion() {
    this.isHostRole = true;
    if (this.timer) clearInterval(this.timer);
    this.clearAutoAdvanceTimer();

    this.state.state = 'QUESTION_RESULTS';
    this.saveAndBroadcast(true);

    const questionNumber = this.state.currentQuestionIndex + 1;
    const totalQuestions = this.state.questions.length;
    const isLast = questionNumber >= totalQuestions;
    // Show leaderboard every 5th question (Q5, Q10, Q15) AND after 13th question onwards (Q13, Q14...)
    const isLeaderboardMilestone = (questionNumber % 5 === 0) || (questionNumber >= 13);

    // Auto-advance sequence:
    // Display results for 5 seconds
    this.autoAdvanceTimer = setTimeout(() => {
      if (isLast) {
        this.finishQuiz();
      } else if (isLeaderboardMilestone) {
        this.showLeaderboard();
      } else {
        this.nextQuestion();
      }
    }, 5000);
  }

  public showLeaderboard() {
    this.isHostRole = true;
    this.clearAutoAdvanceTimer();
    this.state.state = 'LEADERBOARD';
    this.saveAndBroadcast(true);

    const questionNumber = this.state.currentQuestionIndex + 1;
    const totalQuestions = this.state.questions.length;
    const isLast = questionNumber >= totalQuestions;

    // Display leaderboard for 6 thrilling seconds, then automatically advance
    this.autoAdvanceTimer = setTimeout(() => {
      if (isLast) {
        this.finishQuiz();
      } else {
        this.nextQuestion();
      }
    }, 6000);
  }

  public nextQuestion() {
    this.isHostRole = true;
    this.clearAutoAdvanceTimer();
    if (this.state.currentQuestionIndex + 1 < this.state.questions.length) {
      this.startQuestion(this.state.currentQuestionIndex + 1);
    } else {
      this.finishQuiz();
    }
  }

  public finishQuiz() {
    this.isHostRole = true;
    this.clearAutoAdvanceTimer();
    if (this.timer) clearInterval(this.timer);
    this.state.state = 'FINISHED';
    this.saveAndBroadcast(true);
  }

  public resetQuiz() {
    this.isHostRole = true;
    if (this.timer) clearInterval(this.timer);
    this.state.state = 'LOBBY';
    this.state.currentQuestionIndex = 0;
    this.state.timeLeft = 20;
    this.state.pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.state.participants = [];
    cloudBridge.connect(this.state.pin);
    this.saveAndBroadcast(true);
  }

  public kickParticipant(socketIdOrName: string) {
    this.isHostRole = true;
    this.state.participants = this.state.participants.filter(
      (p) => p.id !== socketIdOrName && p.name !== socketIdOrName
    );
    this.saveAndBroadcast(true);
  }

  // --- PARTICIPANT ACTIONS ---
  public studentJoin(pin: string, name: string): { success: boolean; message?: string } {
    const cleanPin = pin.trim();
    this.state.pin = cleanPin;
    cloudBridge.connect(cleanPin);

    const cleanName = name.trim() || `Player ${Math.floor(100 + Math.random() * 900)}`;

    let existing = this.state.participants.find((p) => p.id === this.localParticipantId);
    if (!existing) {
      existing = {
        id: this.localParticipantId,
        name: cleanName,
        score: 0,
        lastQuestionScore: 0,
        hasAnswered: false,
        selectedOption: null,
        answerTime: null,
      };
      this.state.participants.push(existing);
    } else {
      existing.name = cleanName;
    }

    // Publish to cloud bridge so Host sees this student immediately
    cloudBridge.publish('JOIN', { id: this.localParticipantId, name: cleanName, pin: cleanPin });
    this.saveAndBroadcast(false);
    return { success: true };
  }

  public studentSubmitAnswer(optionIndex: number): { success: boolean } {
    const p = this.state.participants.find((item) => item.id === this.localParticipantId);
    if (p) {
      p.hasAnswered = true;
      p.selectedOption = optionIndex;
    }

    // Publish to cloud bridge so Host records the answer in real time
    cloudBridge.publish('ANSWER', { id: this.localParticipantId, optionIndex, pin: this.state.pin });
    this.notifyListeners();
    return { success: true };
  }
}

export const gameEngine = new GameEngine();

// Clean event wrapper that matches previous socket signatures
export const socket = {
  get connected(): boolean {
    return true;
  },

  get id(): string {
    return gameEngine.localParticipantId;
  },

  on(event: string, callback: (...args: any[]) => void) {
    gameEngine.on(event, callback);
    return this;
  },

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      gameEngine.off(event, callback);
    }
    return this;
  },

  emit(event: string, ...args: any[]) {
    const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    const data = args.length > 0 && typeof args[0] !== 'function' ? args[0] : {};

    switch (event) {
      case 'getInitialState':
        gameEngine.notifyListeners();
        break;

      case 'host:login':
        if (cb) cb({ success: true });
        break;

      case 'host:createQuiz':
        const pin = gameEngine.hostCreateQuiz(data.title, data.questions);
        if (cb) cb({ success: true, pin });
        break;

      case 'host:startQuiz':
        gameEngine.startQuiz();
        break;

      case 'host:endQuestion':
        gameEngine.endQuestion();
        break;

      case 'host:showLeaderboard':
        gameEngine.showLeaderboard();
        break;

      case 'host:nextQuestion':
        gameEngine.nextQuestion();
        break;

      case 'host:resetQuiz':
        gameEngine.resetQuiz();
        break;

      case 'host:kickParticipant':
        gameEngine.kickParticipant(data.socketIdOrName);
        break;

      case 'student:checkPin': {
        const engineState = gameEngine.getHostState();
        const pinMatches = data.pin && data.pin.trim() === engineState.pin;
        if (pinMatches) {
          if (cb) cb({
            exists: true,
            gameState: engineState.state,
            participantCount: engineState.participantCount,
          });
        } else {
          // If in student mode, connect to cloud and accept the pin
          cloudBridge.connect(data.pin);
          if (cb) cb({ exists: true, gameState: 'LOBBY', participantCount: 0 });
        }
        break;
      }

      case 'student:join': {
        const joinRes = gameEngine.studentJoin(data.pin, data.name);
        if (cb) cb({ success: joinRes.success, pin: data.pin });
        gameEngine.emit('student:joinResponse', { success: joinRes.success, pin: data.pin });
        break;
      }

      case 'student:reconnect':
        gameEngine.studentJoin(data.pin, data.name);
        gameEngine.emit('student:reconnectResponse', { success: true });
        break;

      case 'student:submitAnswer':
        const answerRes = gameEngine.studentSubmitAnswer(data.optionIndex);
        if (cb) cb(answerRes);
        break;

      default:
        console.log(`[GameEngine] Event: ${event}`, data);
    }
    return this;
  },

  disconnect() {
    return this;
  },

  connect() {
    return this;
  },
};
