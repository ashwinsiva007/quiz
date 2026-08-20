import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { StudentQuizState, HostState } from './types';
import { StudentJoin } from './components/StudentJoin';
import { StudentScreen } from './components/StudentScreen';
import { HostDashboard } from './components/HostDashboard';
import { HostLogin } from './components/HostLogin';
import { ConnectionStatus } from './components/ConnectionStatus';

export const App: React.FC = () => {
  // ── Route detection ──────────────────────────────────────────────
  const path = window.location.pathname;
  const isHost = path.startsWith('/host');
  const isJoinRoute = path.startsWith('/join');

  // ── Auth (host only) ─────────────────────────────────────────────
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(false);

  // ── Student session state ─────────────────────────────────────────
  const [hasJoined, setHasJoined] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPin, setStudentPin] = useState('');

  // Use a ref so socket reconnect handler always has current values
  const sessionRef = useRef({ hasJoined: false, name: '', pin: '' });

  // ── Real-time quiz state (from Socket.IO server) ─────────────────
  const [studentState, setStudentState] = useState<StudentQuizState>({
    pin: '------',
    state: 'LOBBY',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    timeLeft: 15,
    timeLimit: 15,
    participantCount: 0,
    leaderboard: [],
  });

  const [hostState, setHostState] = useState<HostState>({
    pin: '------',
    state: 'LOBBY',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    timeLeft: 15,
    timeLimit: 15,
    participantCount: 0,
    participants: [],
    answerCount: 0,
    leaderboard: [],
  });

  // ── Session restore (root route only, not /join) ─────────────────
  useEffect(() => {
    if (!isHost && !isJoinRoute) {
      const savedPin = sessionStorage.getItem('asi_quiz_pin');
      const savedName = sessionStorage.getItem('asi_quiz_name');
      if (savedPin && savedName) {
        setStudentPin(savedPin);
        setStudentName(savedName);
        setHasJoined(true);
        sessionRef.current = { hasJoined: true, name: savedName, pin: savedPin };
      }
    }
  }, []);

  // ── Keep sessionRef in sync ────────────────────────────────────────
  useEffect(() => {
    sessionRef.current = { hasJoined, name: studentName, pin: studentPin };
  }, [hasJoined, studentName, studentPin]);

  // ── Socket.IO event listeners ──────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      // On reconnect: re-request initial state
      socket.emit('getInitialState');

      // If student was in a game, attempt reconnection
      const { hasJoined: joined, name, pin } = sessionRef.current;
      if (!isHost && joined && name && pin) {
        socket.emit('student:reconnect', { pin, name });
      }
    };

    const onQuizStateUpdate = (newState: StudentQuizState) => {
      setStudentState(newState);
    };

    const onHostUpdate = (newHostState: HostState) => {
      setHostState(newHostState);
    };

    const onTimerTick = (data: { timeLeft: number }) => {
      setStudentState((prev) => ({ ...prev, timeLeft: data.timeLeft }));
      setHostState((prev) => ({ ...prev, timeLeft: data.timeLeft }));
    };

    socket.on('connect', onConnect);
    socket.on('quizStateUpdate', onQuizStateUpdate);
    socket.on('hostUpdate', onHostUpdate);
    socket.on('timerTick', onTimerTick);

    // Request state immediately (covers case where socket was already connected)
    socket.emit('getInitialState');

    return () => {
      socket.off('connect', onConnect);
      socket.off('quizStateUpdate', onQuizStateUpdate);
      socket.off('hostUpdate', onHostUpdate);
      socket.off('timerTick', onTimerTick);
    };
  }, [isHost]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleStudentJoined = (pin: string, name: string) => {
    setStudentPin(pin);
    setStudentName(name);
    setHasJoined(true);
    sessionRef.current = { hasJoined: true, name, pin };
  };

  const handleLeaveStudent = () => {
    sessionStorage.removeItem('asi_quiz_pin');
    sessionStorage.removeItem('asi_quiz_name');
    setHasJoined(false);
    setStudentPin('');
    setStudentName('');
    sessionRef.current = { hasJoined: false, name: '', pin: '' };
  };

  // ── Render ─────────────────────────────────────────────────────────
  const renderStudent = () => {
    if (hasJoined) {
      return (
        <StudentScreen
          quizState={studentState}
          studentName={studentName}
          onLeave={handleLeaveStudent}
        />
      );
    }
    return <StudentJoin onJoined={handleStudentJoined} />;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      {/* Global connection status overlay */}
      <ConnectionStatus />

      {isHost ? (
        isHostAuthenticated ? (
          <HostDashboard hostState={hostState} />
        ) : (
          <HostLogin onHostAuthenticated={() => setIsHostAuthenticated(true)} />
        )
      ) : isJoinRoute ? (
        // /join route — always show join page (never restore session here)
        // After joining, transitions to StudentScreen
        hasJoined ? (
          <StudentScreen
            quizState={studentState}
            studentName={studentName}
            onLeave={handleLeaveStudent}
          />
        ) : (
          <StudentJoin onJoined={handleStudentJoined} />
        )
      ) : (
        renderStudent()
      )}
    </div>
  );
};
