import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { StudentQuizState, HostState } from './types';
import { StudentJoin } from './components/StudentJoin';
import { StudentScreen } from './components/StudentScreen';
import { HostDashboard } from './components/HostDashboard';
import { HostLogin } from './components/HostLogin';
import { ConnectionStatus } from './components/ConnectionStatus';

export const App: React.FC = () => {
  const [isHost, setIsHost] = useState(false);
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hasJoined, setHasJoined] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPin, setStudentPin] = useState('');

  // Default empty student state
  const [studentState, setStudentState] = useState<StudentQuizState>({
    pin: '------',
    state: 'LOBBY',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    timeLeft: 20,
    timeLimit: 20,
    participantCount: 0,
    leaderboard: [],
  });

  // Default empty host state
  const [hostState, setHostState] = useState<HostState>({
    pin: '------',
    state: 'LOBBY',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    timeLeft: 20,
    timeLimit: 20,
    participantCount: 0,
    participants: [],
    answerCount: 0,
    leaderboard: [],
  });

  useEffect(() => {
    // Determine route from window.location.pathname
    if (window.location.pathname.startsWith('/host')) {
      setIsHost(true);
    } else {
      setIsHost(false);
      // Attempt auto-reconnect from session storage
      const savedPin = sessionStorage.getItem('asi_quiz_pin');
      const savedName = sessionStorage.getItem('asi_quiz_name');
      if (savedPin && savedName) {
        setStudentPin(savedPin);
        setStudentName(savedName);
        setHasJoined(true);
      }
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('getInitialState');

      const savedPin = sessionStorage.getItem('asi_quiz_pin');
      const savedName = sessionStorage.getItem('asi_quiz_name');
      if (savedPin && savedName && !window.location.pathname.startsWith('/host')) {
        socket.emit('student:reconnect', { pin: savedPin, name: savedName });
      }
    };

    const onDisconnect = () => setIsConnected(false);

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
    socket.on('disconnect', onDisconnect);
    socket.on('quizStateUpdate', onQuizStateUpdate);
    socket.on('hostUpdate', onHostUpdate);
    socket.on('timerTick', onTimerTick);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('quizStateUpdate', onQuizStateUpdate);
      socket.off('hostUpdate', onHostUpdate);
      socket.off('timerTick', onTimerTick);
    };
  }, []);

  const handleStudentJoined = (pin: string, name: string) => {
    setStudentPin(pin);
    setStudentName(name);
    setHasJoined(true);
  };

  const handleLeaveStudent = () => {
    sessionStorage.removeItem('asi_quiz_pin');
    sessionStorage.removeItem('asi_quiz_name');
    setHasJoined(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      {/* Sleek Floating Connection Status Pill (Non-blocking) */}
      <ConnectionStatus isConnected={isConnected} />

      {/* Render Host Dashboard, Host Login, or Student Screen */}
      {isHost ? (
        isHostAuthenticated ? (
          <HostDashboard hostState={hostState} />
        ) : (
          <HostLogin onHostAuthenticated={() => setIsHostAuthenticated(true)} />
        )
      ) : hasJoined ? (
        <StudentScreen
          quizState={studentState}
          studentName={studentName}
          onLeave={handleLeaveStudent}
        />
      ) : (
        <StudentJoin onJoined={handleStudentJoined} />
      )}
    </div>
  );
};
