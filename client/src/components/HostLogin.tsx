import React, { useState } from 'react';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { Question } from '../types';
import defaultQuestionsData from '../../../server/src/questions.json';
import { KeyRound, Plus, Trash2, Upload, FileText, CheckCircle2, ShieldCheck, AlertCircle, Play, Sparkles } from 'lucide-react';

interface HostLoginProps {
  onHostAuthenticated: () => void;
}

export const HostLogin: React.FC<HostLoginProps> = ({ onHostAuthenticated }) => {
  const [password, setPassword] = useState('asi2026');
  const [title, setTitle] = useState('Demystifying Artificial Intelligence');
  const [questions, setQuestions] = useState<Question[]>(defaultQuestionsData as Question[]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'json' | 'preset'>('editor');
  const [jsonInput, setJsonInput] = useState('');

  // New question form state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(20);

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setError('Please fill in question text and all 4 options (A, B, C, D).');
      return;
    }

    const formattedQuestion: Question = {
      id: editingIndex !== null ? questions[editingIndex].id : Date.now(),
      question: qText.trim(),
      options: [
        `A. ${optA.replace(/^[A-D]\.\s*/, '').trim()}`,
        `B. ${optB.replace(/^[A-D]\.\s*/, '').trim()}`,
        `C. ${optC.replace(/^[A-D]\.\s*/, '').trim()}`,
        `D. ${optD.replace(/^[A-D]\.\s*/, '').trim()}`,
      ],
      correctAnswer: correctIdx,
      timeLimit: timeLimit,
    };

    if (editingIndex !== null) {
      const updated = [...questions];
      updated[editingIndex] = formattedQuestion;
      setQuestions(updated);
      setEditingIndex(null);
    } else {
      setQuestions([...questions, formattedQuestion]);
    }

    // Clear form
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectIdx(0);
    setError(null);
  };

  const handleEditClick = (idx: number) => {
    const q = questions[idx];
    setEditingIndex(idx);
    setQText(q.question);
    setOptA(q.options[0]?.replace(/^[A-D]\.\s*/, '') || '');
    setOptB(q.options[1]?.replace(/^[A-D]\.\s*/, '') || '');
    setOptC(q.options[2]?.replace(/^[A-D]\.\s*/, '') || '');
    setOptD(q.options[3]?.replace(/^[A-D]\.\s*/, '') || '');
    setCorrectIdx(q.correctAnswer);
    setTimeLimit(q.timeLimit || 20);
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('Invalid JSON format. Must be an array of question objects.');
        return;
      }
      setQuestions(parsed);
      setError(null);
      setActiveTab('editor');
    } catch (err: any) {
      setError('JSON Parse Error: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
          setError(null);
          setActiveTab('editor');
        } else {
          setError('File does not contain a valid non-empty question array.');
        }
      } catch (err: any) {
        setError('File Read Error: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateAndHost = () => {
    if (questions.length === 0) {
      setError('Please add at least 1 question to host the quiz.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter Host Password.');
      return;
    }

    socket.emit('host:createQuiz', { title, password, questions }, (res: { success: boolean; message?: string }) => {
      if (res.success) {
        onHostAuthenticated();
      } else {
        setError(res.message || 'Host authentication failed.');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0b0f19] text-white">
      <BrandingHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 my-auto">
        <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black font-['Outfit']">Host Control Portal</h2>
                <p className="text-xs text-slate-400">Password protected setup & question management</p>
              </div>
            </div>

            <button
              onClick={handleCreateAndHost}
              className="py-3.5 px-6 rounded-2xl font-extrabold text-base bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-xl shadow-rose-900/30 flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              CREATE & HOST QUIZ ({questions.length} QUESTIONS)
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Form Settings: Password & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" /> Host Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: asi2026)"
                className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default test password: <strong className="text-slate-300 font-mono">asi2026</strong></span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" /> Quiz / Event Subtitle
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Demystifying Artificial Intelligence"
                className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm font-semibold"
              />
            </div>
          </div>

          {/* Question Builder Tabs */}
          <div className="pt-2">
            <div className="flex border-b border-slate-800 gap-2 mb-4">
              <button
                onClick={() => setActiveTab('editor')}
                className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'editor' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" /> Manual Question Builder ({questions.length})
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'json' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" /> Import JSON File / Code
              </button>
            </div>

            {/* TAB 1: MANUAL BUILDER */}
            {activeTab === 'editor' && (
              <div className="space-y-6">
                {/* Form to Add / Edit Question */}
                <form onSubmit={handleSaveQuestion} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {editingIndex !== null ? `Edit Question #${editingIndex + 1}` : 'Add New Question'}
                  </h3>

                  <div>
                    <input
                      type="text"
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Enter question prompt text..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={optA}
                      onChange={(e) => setOptA(e.target.value)}
                      placeholder="Option A text"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={optB}
                      onChange={(e) => setOptB(e.target.value)}
                      placeholder="Option B text"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      placeholder="Option C text"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      placeholder="Option D text"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <label className="text-slate-400">Correct Answer:</label>
                      <select
                        value={correctIdx}
                        onChange={(e) => setCorrectIdx(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-400 font-bold focus:outline-none"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>

                      <label className="text-slate-400 ml-2">Time Limit:</label>
                      <select
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
                      >
                        <option value={10}>10s</option>
                        <option value={15}>15s</option>
                        <option value={20}>20s</option>
                        <option value={30}>30s</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="py-2 px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md"
                    >
                      {editingIndex !== null ? 'UPDATE QUESTION' : '+ ADD QUESTION'}
                    </button>
                  </div>
                </form>

                {/* List of Existing Questions */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-rose-400 text-xs font-bold px-2 py-0.5 rounded">#{idx + 1}</span>
                          <h4 className="text-sm font-bold text-white">{q.question}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                          {q.options.map((opt: string, oIdx: number) => (
                            <span key={oIdx} className={oIdx === q.correctAnswer ? 'text-emerald-400 font-semibold' : ''}>
                              {opt} {oIdx === q.correctAnswer ? '✓' : ''}
                            </span>
                          ))}
                        </div>

                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditClick(idx)}
                          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(idx)}
                          className="text-xs text-rose-500 hover:text-rose-400 bg-slate-800 px-2.5 py-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: JSON IMPORT */}
            {activeTab === 'json' && (
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Upload .JSON File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-600 file:text-white hover:file:bg-rose-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Or Paste JSON Array Code
                  </label>
                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='[&#10;  {&#10;    "id": 1,&#10;    "question": "Sample Question?",&#10;    "options": ["A. Opt 1", "B. Opt 2", "C. Opt 3", "D. Opt 4"],&#10;    "correctAnswer": 0,&#10;    "timeLimit": 20&#10;  }&#10;]'
                    className="w-full bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={handleImportJson}
                    className="py-2.5 px-5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> PARSE & IMPORT QUESTIONS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
