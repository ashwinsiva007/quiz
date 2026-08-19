import { io } from 'socket.io-client';

const TARGET_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NUM_STUDENTS = parseInt(process.argv[2] || '150', 10);

console.log(`\n🤖 Launching load test simulation with ${NUM_STUDENTS} students against ${TARGET_URL}...`);

let joinedCount = 0;
let hasSpawned = false;

const firstSocket = io(TARGET_URL);

firstSocket.on('connect', () => {
  firstSocket.emit('getInitialState');
});

firstSocket.on('quizStateUpdate', (state) => {
  if (state.pin && !hasSpawned) {
    hasSpawned = true;
    console.log(`\n📌 Found Active Game PIN: ${state.pin}`);
    console.log(`🚀 Spawning ${NUM_STUDENTS} simulated student connections...\n`);
    spawnStudents(state.pin);
  }

  if (state.state === 'QUESTION_ACTIVE' && state.currentQuestion) {
    console.log(`⚡ [Simulated Load] Question #${state.currentQuestion.questionIndex} Active! Simulated students submitting answers...`);
  }
});

function spawnStudents(pin) {
  for (let i = 1; i <= NUM_STUDENTS; i++) {
    const studentName = `Student ${i.toString().padStart(3, '0')}`;
    const clientSocket = io(TARGET_URL, { reconnection: true });

    clientSocket.on('connect', () => {
      clientSocket.emit('student:join', { pin, name: studentName });
    });

    clientSocket.on('student:joinResponse', (res) => {
      if (res.success) {
        joinedCount++;
        if (joinedCount % 25 === 0 || joinedCount === NUM_STUDENTS) {
          console.log(`✅ [Simulation Progress] ${joinedCount}/${NUM_STUDENTS} students successfully joined room ${pin}`);
        }
      }
    });

    clientSocket.on('quizStateUpdate', (state) => {
      if (state.state === 'QUESTION_ACTIVE' && state.participant && !state.participant.hasAnswered) {
        const delay = Math.floor(Math.random() * 4000) + 500;
        setTimeout(() => {
          const randomOption = Math.floor(Math.random() * 4);
          clientSocket.emit('student:submitAnswer', { optionIndex: randomOption });
        }, delay);
      }
    });
  }
}
