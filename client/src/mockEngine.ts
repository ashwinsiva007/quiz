import { Question, HostState, StudentQuizState, HostParticipant, LeaderboardEntry, QuestionResultPayload } from './types';
import defaultQuestions from './questions.json';

const HOST_PASSWORD = 'asi2026';

const SIMULATED_NAMES = [
  'Arun Kumar',
  'Priya Sharma',
  'Karthik R',
  'Divya M',
  'Siddharth V',
  'Ananya Iyer',
  'Rahul Nair',
  'Sneha Patel',
];

interface MockParticipant {
  id: string;
  name: string;
  score: number;
  lastQuestionScore: number;
  hasAnswered: boolean;
  selectedOption: number | null;
  answerTime: number | null;
  isBot?: boolean;
}

export class MockQuizEngine {
  public pin: string;
  public state: 'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_RESULTS' | 'LEADERBOARD' | 'FINISHED' = 'LOBBY';
  public title: string = 'Demystifying Artificial Intelligence';
  public questions: Question[] = defaultQuestions as Question[];
  public currentQuestionIndex: number = 0;
  public timeLeft: number = 20;
  public timeLimit: number = 20;
  public participants: Map<string, MockParticipant> = new Map();
  private timer: any = null;
  private questionStartTime: number = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  public localStudentId: string = 'mock-student-local';

  constructor() {
    this.pin = this.generatePin();
    this.initSimulatedParticipants();
  }

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private initSimulatedParticipants() {
    this.participants.clear();
    // Add 4-6 realistic AI peers in demo mode
    SIMULATED_NAMES.forEach((name, idx) => {
      const id = `bot-${idx + 1}`;
      this.participants.set(id, {
        id,
        name,
        score: 0,
        lastQuestionScore: 0,
        hasAnswered: false,
        selectedOption: null,
        answerTime: null,
        isBot: true,
      });
    });
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
          console.error(`Error in mock event listener for ${event}:`, e);
        }
      });
    }
  }

  public broadcast() {
    this.emit('hostUpdate', this.getHostState());
    this.emit('quizStateUpdate', this.getStudentState(this.localStudentId));
  }

  public getHostState(): HostState {
    const currentQ = this.questions[this.currentQuestionIndex];
    let questionResult: QuestionResultPayload | undefined;

    if (this.state === 'QUESTION_RESULTS' || this.state === 'LEADERBOARD' || this.state === 'FINISHED') {
      const counts = [0, 0, 0, 0];
      let total = 0;
      this.participants.forEach((p) => {
        if (p.hasAnswered && p.selectedOption !== null && p.selectedOption >= 0 && p.selectedOption < 4) {
          counts[p.selectedOption]++;
          total++;
        }
      });
      if (currentQ) {
        questionResult = {
          questionIndex: this.currentQuestionIndex + 1,
          totalQuestions: this.questions.length,
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

    const hostParts: HostParticipant[] = Array.from(this.participants.values()).map((p) => ({
      socketId: p.id,
      name: p.name,
      score: p.score,
      hasAnswered: p.hasAnswered,
    }));

    return {
      pin: this.pin,
      state: this.state,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      timeLeft: this.timeLeft,
      timeLimit: this.timeLimit,
      participantCount: this.participants.size,
      participants: hostParts,
      answerCount: Array.from(this.participants.values()).filter((p) => p.hasAnswered).length,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            questionIndex: this.currentQuestionIndex + 1,
            totalQuestions: this.questions.length,
            question: currentQ.question,
            options: currentQ.options,
            timeLimit: currentQ.timeLimit || 20,
          }
        : undefined,
      questionResult,
      leaderboard: this.getLeaderboard(),
    };
  }

  public getStudentState(studentId: string): StudentQuizState {
    const currentQ = this.questions[this.currentQuestionIndex];
    const p = this.participants.get(studentId);

    let studentResult = null;
    if (p && (this.state === 'QUESTION_RESULTS' || this.state === 'LEADERBOARD' || this.state === 'FINISHED')) {
      studentResult = {
        isCorrect: p.hasAnswered && p.selectedOption === currentQ?.correctAnswer,
        score: p.score,
        lastQuestionScore: p.lastQuestionScore,
        selectedOption: p.selectedOption,
        correctOption: currentQ?.correctAnswer ?? 0,
      };
    }

    return {
      pin: this.pin,
      state: this.state,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      timeLeft: this.timeLeft,
      timeLimit: this.timeLimit,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            questionIndex: this.currentQuestionIndex + 1,
            totalQuestions: this.questions.length,
            question: currentQ.question,
            options: currentQ.options,
            timeLimit: currentQ.timeLimit || 20,
          }
        : undefined,
      participantCount: this.participants.size,
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
    const sorted = Array.from(this.participants.values()).sort((a, b) => b.score - a.score);
    return sorted.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score,
      lastQuestionScore: p.lastQuestionScore,
    }));
  }

  public hostLogin(password: string, cb?: (res: { success: boolean; message?: string }) => void) {
    if (password === HOST_PASSWORD) {
      if (cb) cb({ success: true });
    } else {
      if (cb) cb({ success: false, message: 'Invalid host password. Default: asi2026' });
    }
  }

  public hostCreateQuiz(
    data: { title?: string; password?: string; questions?: Question[] },
    cb?: (res: { success: boolean; pin?: string; message?: string }) => void
  ) {
    if (data.password && data.password !== HOST_PASSWORD) {
      if (cb) cb({ success: false, message: 'Invalid host password' });
      return;
    }
    this.title = data.title || 'Demystifying Artificial Intelligence';
    if (data.questions && data.questions.length > 0) {
      this.questions = data.questions;
    }
    this.pin = this.generatePin();
    this.state = 'LOBBY';
    this.currentQuestionIndex = 0;
    this.initSimulatedParticipants();
    this.broadcast();
    if (cb) cb({ success: true, pin: this.pin });
  }

  public startQuiz() {
    this.currentQuestionIndex = 0;
    this.startQuestion(0);
  }

  public startQuestion(index: number) {
    if (index >= this.questions.length) {
      this.state = 'FINISHED';
      this.broadcast();
      return;
    }

    this.currentQuestionIndex = index;
    const q = this.questions[index];
    this.timeLimit = q.timeLimit || 20;
    this.timeLeft = this.timeLimit;
    this.state = 'QUESTION_ACTIVE';
    this.questionStartTime = Date.now();

    // Reset answer state for all participants
    this.participants.forEach((p) => {
      p.hasAnswered = false;
      p.selectedOption = null;
      p.answerTime = null;
      p.lastQuestionScore = 0;
    });

    this.broadcast();

    // Clear existing timer
    if (this.timer) clearInterval(this.timer);

    // Simulate bot answers with realistic random human delays
    this.simulateBotAnswers(q);

    // Countdown interval
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.emit('timerTick', { timeLeft: this.timeLeft });

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endQuestion();
      }
    }, 1000);
  }

  private simulateBotAnswers(currentQ: Question) {
    this.participants.forEach((p) => {
      if (p.isBot) {
        const delay = Math.floor(Math.random() * (Math.min(this.timeLimit, 8) * 1000 - 1000)) + 1500;
        setTimeout(() => {
          if (this.state === 'QUESTION_ACTIVE' && !p.hasAnswered) {
            // 75% chance of picking correct answer
            const isSmart = Math.random() < 0.75;
            const chosenOption = isSmart ? currentQ.correctAnswer : Math.floor(Math.random() * 4);
            const timeTaken = (Date.now() - this.questionStartTime) / 1000;
            p.hasAnswered = true;
            p.selectedOption = chosenOption;
            p.answerTime = timeTaken;

            if (chosenOption === currentQ.correctAnswer) {
              const speedBonus = Math.max(0, Math.floor((1 - timeTaken / this.timeLimit) * 500));
              const pts = 1000 + speedBonus;
              p.score += pts;
              p.lastQuestionScore = pts;
            } else {
              p.lastQuestionScore = 0;
            }
            this.broadcast();
          }
        }, delay);
      }
    });
  }

  public endQuestion() {
    if (this.timer) clearInterval(this.timer);
    this.state = 'QUESTION_RESULTS';
    this.broadcast();
  }

  public showLeaderboard() {
    this.state = 'LEADERBOARD';
    this.broadcast();
  }

  public nextQuestion() {
    if (this.currentQuestionIndex + 1 < this.questions.length) {
      this.startQuestion(this.currentQuestionIndex + 1);
    } else {
      this.state = 'FINISHED';
      this.broadcast();
    }
  }

  public resetQuiz() {
    if (this.timer) clearInterval(this.timer);
    this.state = 'LOBBY';
    this.currentQuestionIndex = 0;
    this.timeLeft = 20;
    this.pin = this.generatePin();
    this.initSimulatedParticipants();
    this.broadcast();
  }

  public kickParticipant(socketIdOrName: string) {
    let foundKey: string | null = null;
    this.participants.forEach((p, key) => {
      if (key === socketIdOrName || p.name === socketIdOrName) {
        foundKey = key;
      }
    });
    if (foundKey) {
      this.participants.delete(foundKey);
      this.broadcast();
    }
  }

  public studentJoin(pin: string, name: string, cb?: (res: { success: boolean; message?: string; pin?: string }) => void) {
    if (pin.trim() !== this.pin) {
      if (cb) cb({ success: false, message: `Invalid Game PIN. Active Demo PIN is: ${this.pin}` });
      return;
    }

    const id = this.localStudentId;
    this.participants.set(id, {
      id,
      name,
      score: 0,
      lastQuestionScore: 0,
      hasAnswered: false,
      selectedOption: null,
      answerTime: null,
      isBot: false,
    });

    this.broadcast();
    if (cb) cb({ success: true, pin: this.pin });
  }

  public studentReconnect(pin: string, name: string, cb?: (res: { success: boolean }) => void) {
    if (pin.trim() !== this.pin) {
      if (cb) cb({ success: false });
      return;
    }
    const id = this.localStudentId;
    if (!this.participants.has(id)) {
      this.participants.set(id, {
        id,
        name,
        score: 0,
        lastQuestionScore: 0,
        hasAnswered: false,
        selectedOption: null,
        answerTime: null,
        isBot: false,
      });
    }
    this.broadcast();
    if (cb) cb({ success: true });
  }

  public studentSubmitAnswer(optionIndex: number, cb?: (res: { success: boolean; isCorrect?: boolean; score?: number }) => void) {
    if (this.state !== 'QUESTION_ACTIVE') {
      if (cb) cb({ success: false });
      return;
    }

    const p = this.participants.get(this.localStudentId);
    if (!p || p.hasAnswered) {
      if (cb) cb({ success: false });
      return;
    }

    const currentQ = this.questions[this.currentQuestionIndex];
    const timeTaken = (Date.now() - this.questionStartTime) / 1000;
    const isCorrect = optionIndex === currentQ?.correctAnswer;

    p.hasAnswered = true;
    p.selectedOption = optionIndex;
    p.answerTime = timeTaken;

    let pts = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, Math.floor((1 - timeTaken / this.timeLimit) * 500));
      pts = 1000 + speedBonus;
      p.score += pts;
      p.lastQuestionScore = pts;
    } else {
      p.lastQuestionScore = 0;
    }

    this.broadcast();
    if (cb) cb({ success: true, isCorrect, score: p.score });
  }
}
