export type QuizState = 'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_RESULTS' | 'LEADERBOARD' | 'FINISHED';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0 for A, 1 for B, 2 for C, 3 for D
  timeLimit: number;
}

export interface Participant {
  socketId: string;
  name: string;
  score: number;
  lastQuestionScore: number;
  hasAnsweredCurrentQuestion: boolean;
  selectedOption: number | null; // 0..3
  answerTimeSec: number; // seconds taken to answer
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  lastQuestionScore: number;
}

export interface ClientQuestion {
  id: number;
  questionIndex: number;
  totalQuestions: number;
  question: string;
  options: string[];
  timeLimit: number;
}

export interface QuestionResultPayload {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  options: string[];
  correctAnswer: number; // 0..3
  stats: {
    countA: number;
    countB: number;
    countC: number;
    countD: number;
    totalAnswers: number;
  };
}

export interface HostCreatePayload {
  title: string;
  password: string;
  questions?: Question[];
}
