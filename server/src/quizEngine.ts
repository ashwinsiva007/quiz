import { Question, Participant, QuizState, LeaderboardEntry, ClientQuestion, QuestionResultPayload } from './types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let questionsPath = path.join(__dirname, 'questions.json');
if (!fs.existsSync(questionsPath)) {
  questionsPath = path.join(__dirname, '..', 'src', 'questions.json');
}
const questionsData: Question[] = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));



export class QuizEngine {
  public pin: string;
  public title: string = 'Demystifying Artificial Intelligence';
  public state: QuizState = 'LOBBY';
  public currentQuestionIndex: number = 0;
  public questions: Question[];
  public participants: Map<string, Participant> = new Map(); // socketId -> Participant
  public timer: NodeJS.Timeout | null = null;
  public timeLeft: number = 0;
  public timeLimit: number = 20;
  private onStateChangeCallback: (() => void) | null = null;
  private onTimerTickCallback: ((timeLeft: number) => void) | null = null;

  constructor(customQuestions?: Question[], customTitle?: string) {
    this.pin = this.generatePin();
    if (customTitle && customTitle.trim()) {
      this.title = customTitle.trim();
    }
    this.questions = customQuestions && customQuestions.length > 0 ? customQuestions : (questionsData as Question[]);
  }


  public setCallbacks(
    onStateChange: () => void,
    onTimerTick: (timeLeft: number) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onTimerTickCallback = onTimerTick;
  }

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public joinParticipant(socketId: string, name: string): { success: boolean; message?: string; participant?: Participant } {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Name cannot be empty' };
    }

    if (trimmedName.length > 30) {
      return { success: false, message: 'Name is too long (max 30 characters)' };
    }

    // Check duplicate names (case-insensitive)
    for (const [existingSocketId, p] of this.participants.entries()) {
      if (p.name.toLowerCase() === trimmedName.toLowerCase()) {
        // If exact name exists under a different socket, check if old socket was disconnected or allow re-binding
        if (existingSocketId === socketId) {
          return { success: true, participant: p };
        }
        return { success: false, message: 'NAME ALREADY TAKEN. Please choose another name.' };
      }
    }

    const newParticipant: Participant = {
      socketId,
      name: trimmedName,
      score: 0,
      lastQuestionScore: 0,
      hasAnsweredCurrentQuestion: false,
      selectedOption: null,
      answerTimeSec: 0,
    };

    this.participants.set(socketId, newParticipant);
    return { success: true, participant: newParticipant };
  }

  public reconnectParticipant(oldSocketId: string, newSocketId: string, name: string): Participant | null {
    const trimmedName = name.trim().toLowerCase();
    for (const [sId, p] of this.participants.entries()) {
      if (p.name.toLowerCase() === trimmedName) {
        // Re-bind to new socket
        this.participants.delete(sId);
        p.socketId = newSocketId;
        this.participants.set(newSocketId, p);
        return p;
      }
    }
    return null;
  }

  public removeParticipant(socketIdOrName: string): boolean {
    // Try matching socket ID first
    if (this.participants.has(socketIdOrName)) {
      this.participants.delete(socketIdOrName);
      return true;
    }

    // Match by name
    const trimmed = socketIdOrName.trim().toLowerCase();
    for (const [sId, p] of this.participants.entries()) {
      if (p.name.toLowerCase() === trimmed) {
        this.participants.delete(sId);
        return true;
      }
    }
    return false;
  }

  public startQuiz(): boolean {
    if (this.state !== 'LOBBY') return false;
    this.currentQuestionIndex = 0;
    this.startQuestion(0);
    return true;
  }

  private startQuestion(index: number) {
    if (index >= this.questions.length) {
      this.finishQuiz();
      return;
    }

    this.currentQuestionIndex = index;
    this.state = 'QUESTION_ACTIVE';
    const q = this.questions[index];
    this.timeLimit = q.timeLimit || 20;
    this.timeLeft = this.timeLimit;

    // Reset participant question states
    for (const p of this.participants.values()) {
      p.hasAnsweredCurrentQuestion = false;
      p.selectedOption = null;
      p.answerTimeSec = 0;
      p.lastQuestionScore = 0;
    }

    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeLeft -= 1;
      if (this.onTimerTickCallback) {
        this.onTimerTickCallback(this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.endQuestion();
      }
    }, 1000);

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  public submitAnswer(socketId: string, optionIndex: number): { success: boolean; message?: string } {
    if (this.state !== 'QUESTION_ACTIVE') {
      return { success: false, message: 'Question is not active' };
    }

    const participant = this.participants.get(socketId);
    if (!participant) {
      return { success: false, message: 'Participant not found in quiz' };
    }

    if (participant.hasAnsweredCurrentQuestion) {
      return { success: false, message: 'Answer already submitted' };
    }

    if (optionIndex < 0 || optionIndex > 3) {
      return { success: false, message: 'Invalid option selected' };
    }

    participant.hasAnsweredCurrentQuestion = true;
    participant.selectedOption = optionIndex;
    participant.answerTimeSec = this.timeLimit - this.timeLeft;

    // Check if ALL participants have answered
    const totalAnswered = Array.from(this.participants.values()).filter(p => p.hasAnsweredCurrentQuestion).length;
    if (totalAnswered > 0 && totalAnswered >= this.participants.size) {
      // Early auto-end if everyone submitted!
      this.endQuestion();
    } else {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback();
      }
    }

    return { success: true };
  }

  public endQuestion() {
    if (this.state !== 'QUESTION_ACTIVE') return;
    this.stopTimer();
    this.state = 'QUESTION_RESULTS';

    // Calculate scores for this question
    const currentQ = this.questions[this.currentQuestionIndex];
    for (const p of this.participants.values()) {
      if (p.hasAnsweredCurrentQuestion && p.selectedOption === currentQ.correctAnswer) {
        // Base score = 100
        // Speed bonus max 50 points based on fraction of remaining time
        const timeFraction = Math.max(0, (this.timeLimit - p.answerTimeSec) / this.timeLimit);
        const speedBonus = Math.round(50 * timeFraction);
        const questionScore = 100 + speedBonus;

        p.lastQuestionScore = questionScore;
        p.score += questionScore;
      } else {
        p.lastQuestionScore = 0;
      }
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  public showLeaderboard() {
    if (this.state !== 'QUESTION_RESULTS') return;
    this.state = 'LEADERBOARD';
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  public nextQuestion() {
    if (this.state !== 'LEADERBOARD' && this.state !== 'QUESTION_RESULTS') return;
    const nextIdx = this.currentQuestionIndex + 1;
    if (nextIdx >= this.questions.length) {
      this.finishQuiz();
    } else {
      this.startQuestion(nextIdx);
    }
  }

  public finishQuiz() {
    this.stopTimer();
    this.state = 'FINISHED';
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  public resetQuiz() {
    this.stopTimer();
    this.state = 'LOBBY';
    this.currentQuestionIndex = 0;
    this.participants.clear();
    this.pin = this.generatePin();
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getCurrentClientQuestion(): ClientQuestion | null {
    if (this.state !== 'QUESTION_ACTIVE') return null;
    const q = this.questions[this.currentQuestionIndex];
    return {
      id: q.id,
      questionIndex: this.currentQuestionIndex + 1,
      totalQuestions: this.questions.length,
      question: q.question,
      options: q.options,
      timeLimit: this.timeLimit,
    };
  }

  public getQuestionResult(): QuestionResultPayload | null {
    if (this.state !== 'QUESTION_RESULTS' && this.state !== 'LEADERBOARD' && this.state !== 'FINISHED') return null;
    const q = this.questions[this.currentQuestionIndex];

    let countA = 0, countB = 0, countC = 0, countD = 0;
    let totalAnswers = 0;

    for (const p of this.participants.values()) {
      if (p.hasAnsweredCurrentQuestion && p.selectedOption !== null) {
        totalAnswers++;
        if (p.selectedOption === 0) countA++;
        else if (p.selectedOption === 1) countB++;
        else if (p.selectedOption === 2) countC++;
        else if (p.selectedOption === 3) countD++;
      }
    }

    return {
      questionIndex: this.currentQuestionIndex + 1,
      totalQuestions: this.questions.length,
      questionText: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      stats: { countA, countB, countC, countD, totalAnswers }
    };
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const list = Array.from(this.participants.values())
      .sort((a, b) => b.score - a.score);

    return list.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score,
      lastQuestionScore: p.lastQuestionScore,
    }));
  }

  public getHostState() {
    return {
      pin: this.pin,
      title: this.title,
      state: this.state,
      currentQuestionIndex: this.currentQuestionIndex,

      totalQuestions: this.questions.length,
      timeLeft: this.timeLeft,
      timeLimit: this.timeLimit,
      participantCount: this.participants.size,
      participants: Array.from(this.participants.values()).map(p => ({
        socketId: p.socketId,
        name: p.name,
        score: p.score,
        hasAnswered: p.hasAnsweredCurrentQuestion,
      })),
      answerCount: Array.from(this.participants.values()).filter(p => p.hasAnsweredCurrentQuestion).length,
      currentQuestion: this.getCurrentClientQuestion(),
      questionResult: this.getQuestionResult(),
      leaderboard: this.getLeaderboard(),
    };
  }
}
