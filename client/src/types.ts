export type QuizState = 'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_RESULTS' | 'LEADERBOARD' | 'FINISHED';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

export interface ClientQuestion {

  id: number;
  questionIndex: number;
  totalQuestions: number;
  question: string;
  options: string[];
  timeLimit: number;
}

export interface StudentResult {
  isCorrect: boolean;
  score: number;
  lastQuestionScore: number;
  selectedOption: number | null;
  correctOption: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  lastQuestionScore: number;
}

export interface HostParticipant {
  socketId: string;
  name: string;
  score: number;
  hasAnswered: boolean;
}

export interface QuestionResultPayload {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  stats: {
    countA: number;
    countB: number;
    countC: number;
    countD: number;
    totalAnswers: number;
  };
}

export interface HostState {
  pin: string;
  state: QuizState;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  timeLimit: number;
  participantCount: number;
  participants: HostParticipant[];
  answerCount: number;
  currentQuestion?: ClientQuestion;
  questionResult?: QuestionResultPayload;
  leaderboard: LeaderboardEntry[];
}

export interface StudentQuizState {
  pin: string;
  state: QuizState;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  timeLimit: number;
  currentQuestion?: ClientQuestion;
  participantCount: number;
  participant?: {
    name: string;
    score: number;
    hasAnswered: boolean;
    selectedOption: number | null;
  } | null;
  studentResult?: StudentResult | null;
  leaderboard: LeaderboardEntry[];
}
