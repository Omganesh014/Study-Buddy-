import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimerMode, AttentionStatus } from '../types';
import AttentionDetector from './AttentionDetector';
import { ShieldIcon } from '../constants';
import Modal from './common/Modal';
import EngagementChallengeModal from './EngagementChallengeModal';
import { useEngagement } from '../hooks/useEngagement';
import EngagementGauge from './common/EngagementGauge';

interface TimerProps {
  onSessionComplete: (minutes: number) => void;
  onDistraction: () => void;
  showToast: (message: string, type: 'info' | 'success' | 'error') => void;
}

const Timer: React.FC<TimerProps> = ({ onSessionComplete, onDistraction, showToast }) => {
  // Customizable durations (in minutes)
  const [pomodoroLength, setPomodoroLength] = useState<number>(TimerMode.Pomodoro);
  const [shortBreakLength, setShortBreakLength] = useState<number>(TimerMode.ShortBreak);

  const [currentMode, setCurrentMode] = useState<TimerMode>(TimerMode.Pomodoro);
  const [timeLeft, setTimeLeft] = useState<number>(TimerMode.Pomodoro * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAttentionShieldActive, setIsAttentionShieldActive] = useState<boolean>(false);
  const [attentionStatus, setAttentionStatus] = useState<AttentionStatus>('off');
  const [isPausedByAttention, setIsPausedByAttention] = useState(false);
  // Long break & cycles
  const [longBreakLength, setLongBreakLength] = useState<number>(15);
  const [cyclesUntilLongBreak, setCyclesUntilLongBreak] = useState<number>(4);
  const [completedFocusCount, setCompletedFocusCount] = useState<number>(0);
  const [sessionHistory, setSessionHistory] = useState<Array<{ type: 'focus'|'break'; duration: number; at: string }>>([]);

  // Alerts customization
  const [playAlarm, setPlayAlarm] = useState<boolean>(true);
  const [playDistraction, setPlayDistraction] = useState<boolean>(true);
  const [visualAlert, setVisualAlert] = useState<boolean>(true);
  const [alarmUrl, setAlarmUrl] = useState<string>("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
  const [distractionUrl, setDistractionUrl] = useState<string>("https://actions.google.com/sounds/v1/alarms/notification_sound.ogg");
  
  const intervalRef = useRef<number | null>(null);
  const alarmRef = useRef<HTMLAudioElement>(null);
  const distractionSoundRef = useRef<HTMLAudioElement>(null);
  const distractionAlertedRef = useRef(false);
  const [flash, setFlash] = useState<boolean>(false);
  const [celebrate, setCelebrate] = useState<boolean>(false);
  const bellRef = useRef<HTMLAudioElement>(null);
  const [stillnessCount, setStillnessCount] = useState<number>(0);
  const sessionStartIdxRef = useRef<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{ avg: number; belowSecs: number; stills: number }>({ avg: 0, belowSecs: 0, stills: 0 });

  // Hook-based engagement tracking
  const { engagementScore, engagementHistory, startTracking, stopTracking } = useEngagement({
    isTracking: isAttentionShieldActive,
    isDistracted: isAttentionShieldActive && (attentionStatus !== 'focused'),
    isAway: isAttentionShieldActive && (attentionStatus === 'away'),
    threshold: 30,
    onThresholdBreach: () => {
      bellRef.current?.play().catch(() => {});
      showToast('Engagement low — quick reset and refocus!', 'info');
    },
  });

  // Challenge modal state
  const [showChallenge, setShowChallenge] = useState(false);

  const prevEngagementRef = useRef<number>(100);
  useEffect(() => {
    const prev = prevEngagementRef.current;
    // Trigger when engagement falls below 85 (downward crossing)
    if (prev >= 85 && engagementScore < 85) {
      setShowChallenge(true);
    }
    prevEngagementRef.current = engagementScore;
  }, [engagementScore]);

  const handleChallengeClose = (success: boolean) => {
    setShowChallenge(false);
    if (success) {
      // reward: reset engagement to max
      // resetEngagement is available from the hook but not currently destructured; call directly via startTracking reset behavior
      try { stopTracking(); startTracking(); } catch {}
    }
  };

  const startNextSession = useCallback(() => {
    if (playAlarm) {
      if (alarmRef.current) {
        alarmRef.current.volume = 1.0;
        alarmRef.current.play().catch(e => console.error("Error playing alarm:", e));
      }
    }
    if (visualAlert) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
    const now = new Date().toLocaleTimeString();
    if (currentMode === TimerMode.Pomodoro) {
        onSessionComplete(pomodoroLength);
        // Build per-session summary from engagement history since session start
        const slice = engagementHistory.slice(sessionStartIdxRef.current);
        if (slice.length > 0) {
          const sum = slice.reduce((acc, r) => acc + r.score, 0);
          const avg = Math.round(sum / slice.length);
          const belowSecs = slice.filter(r => r.score < 30).length; // 1 record ~= 1s
          setSummaryData({ avg, belowSecs, stills: stillnessCount });
          setShowSummary(true);
        }
        // reset stillness counter and move start index for next session
        setStillnessCount(0);
        sessionStartIdxRef.current = engagementHistory.length;
        setCompletedFocusCount((c) => c + 1);
        setSessionHistory(h => [...h, { type: 'focus', duration: pomodoroLength, at: now }]);
        // celebration burst on completing a focus session
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1500);
        // decide next break length
        const willBeLong = ((completedFocusCount + 1) % cyclesUntilLongBreak) === 0;
        setCurrentMode(TimerMode.ShortBreak);
        setTimeLeft((willBeLong ? longBreakLength : shortBreakLength) * 60);
        showToast(willBeLong ? "Long break time! Recharge well." : "Focus session over. Time for a short break!", 'info');
    } else {
        // logging the break that just ended
        const lastBreak = (completedFocusCount % cyclesUntilLongBreak === 0) ? longBreakLength : shortBreakLength;
        setSessionHistory(h => [...h, { type: 'break', duration: lastBreak, at: now }]);
        setCurrentMode(TimerMode.Pomodoro);
        setTimeLeft(pomodoroLength * 60);
        showToast("Break's over. Let's get back to it!", 'info');
    }
    setIsActive(true);
  }, [currentMode, onSessionComplete, showToast, pomodoroLength, shortBreakLength, longBreakLength, cyclesUntilLongBreak, completedFocusCount, playAlarm, visualAlert]);

  useEffect(() => {
    if (isActive && !isPausedByAttention) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            startNextSession();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPausedByAttention, startNextSession]);

  useEffect(() => {
    if (isAttentionShieldActive) {
      if (attentionStatus === 'distracted' || attentionStatus === 'away') {
        if (isActive && !isPausedByAttention) {
          setIsPausedByAttention(true);
          onDistraction();
          if (playDistraction) {
            if (distractionSoundRef.current) {
              distractionSoundRef.current.volume = 1.0;
              distractionSoundRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
          }
          if (!distractionAlertedRef.current) {
            const prompts = [
              "Wake up — stay focused!",
              "Eyes on the goal! You got this.",
              "Let’s refocus. Your future self will thank you.",
              "Tiny break? Snap back to focus mode.",
              "Stay sharp — distraction detected!",
              "Deep breath, back to the task.",
              "Keep going — momentum matters!",
            ];
            const msg = prompts[Math.floor(Math.random() * prompts.length)];
            showToast(msg, 'info');
            if (visualAlert) {
              setFlash(true);
              setTimeout(() => setFlash(false), 500);
            }
            distractionAlertedRef.current = true;
          }
        }
      } else if (attentionStatus === 'focused') {
        if (isActive && isPausedByAttention) {
          setIsPausedByAttention(false);
          distractionAlertedRef.current = false; // Reset alert
        }
      }
    } else {
      if (isPausedByAttention) setIsPausedByAttention(false);
    }
  }, [attentionStatus, isActive, isAttentionShieldActive, isPausedByAttention, showToast, onDistraction]);

  // Respond to 10s stillness events from AttentionDetector
  useEffect(() => {
    const onStill = (e: Event) => {
      if (bellRef.current) {
        bellRef.current.volume = 1.0;
        bellRef.current.play().catch(() => {});
      }
      showToast("You've been still for 10s — quick stretch and refocus!", 'info');
      setStillnessCount(c => c + 1);
    };
    window.addEventListener('attention:still', onStill as EventListener);
    return () => window.removeEventListener('attention:still', onStill as EventListener);
  }, [showToast]);

  // Manage tracking start/stop when shield toggles
  useEffect(() => {
    if (isAttentionShieldActive) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isAttentionShieldActive, startTracking, stopTracking]);

  // Check sessionStorage flag set by Dashboard start options
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('startWithAttentionShield');
      if (flag === '1') {
        setIsAttentionShieldActive(true);
      }
      // clear it so it only applies once
      sessionStorage.removeItem('startWithAttentionShield');
    } catch {}
  }, []);

  const toggleTimer = () => {
    setIsActive(!isActive);
    if (isPausedByAttention) {
        setIsPausedByAttention(false);
    }
    // When starting a Pomodoro, mark the session start index and reset stillness count
    if (!isActive && currentMode === TimerMode.Pomodoro) {
      sessionStartIdxRef.current = engagementHistory.length;
      setStillnessCount(0);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPausedByAttention(false);
    setCurrentMode(TimerMode.Pomodoro);
    setTimeLeft(pomodoroLength * 60);
    sessionStartIdxRef.current = engagementHistory.length;
    setStillnessCount(0);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg flex flex-col lg:flex-row gap-6">
      {flash && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-violet-300/20 animate-pulse"></div>
      )}
      {celebrate && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          {[...Array(24)].map((_, i) => (
            <span
              key={i}
              className="absolute inline-block w-2 h-2 rounded-sm"
              style={{
                left: `${(i * 41) % 100}%`,
                top: '-8px',
                backgroundColor: ['#8b5cf6','#f59e0b','#10b981','#3b82f6','#ef4444'][i % 5],
                transform: `rotate(${(i*37)%360}deg)`,
                animation: `drop${i%3} 1.2s ease-out forwards`,
              }}
            />
          ))}
          <style>{`
            @keyframes drop0 { to { transform: translateY(180px) rotate(360deg); opacity: 0.9; } }
            @keyframes drop1 { to { transform: translateY(220px) rotate(300deg); opacity: 0.9; } }
            @keyframes drop2 { to { transform: translateY(260px) rotate(420deg); opacity: 0.9; } }
          `}</style>
        </div>
      )}
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {currentMode === TimerMode.ShortBreak ? 'Break Time' : 'Focus Time'}
            </h2>
            <div className={`px-4 py-1 text-sm rounded-full font-semibold ${currentMode === TimerMode.ShortBreak ? 'bg-blue-200 text-blue-800' : 'bg-violet-200 text-violet-800'}`}>
              {currentMode === TimerMode.ShortBreak ? `${shortBreakLength} min` : `${pomodoroLength} min`}
            </div>
        </div>
        <div className="text-center my-8">
            <p className="text-8xl font-mono font-bold tracking-tighter">{formatTime(timeLeft)}</p>
        </div>
        <div className="flex justify-center gap-4">
            <button title={isActive ? 'Pause the current session' : 'Start the current session'} onClick={toggleTimer} className={`px-10 py-3 rounded-lg font-semibold text-lg text-white transition-colors w-32 ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}>
                {isActive ? 'Pause' : 'Start'}
            </button>
            <button title="Reset to the beginning of a focus session" onClick={resetTimer} className="px-10 py-3 bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition-colors w-32">
                Reset
            </button>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Focus (minutes) <span title="Set how long each focus session lasts" className="text-gray-500">ℹ️</span></label>
            <input
              type="number"
              min={1}
              max={180}
              value={pomodoroLength}
              onChange={(e) => {
                const val = Math.max(1, Math.min(180, Number(e.target.value)));
                setPomodoroLength(val);
                if (currentMode === TimerMode.Pomodoro && !isActive) setTimeLeft(val * 60);
              }}
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Short Break (minutes) <span title="Set the duration of short breaks between focus sessions" className="text-gray-500">ℹ️</span></label>
            <input
              type="number"
              min={1}
              max={60}
              value={shortBreakLength}
              onChange={(e) => {
                const val = Math.max(1, Math.min(60, Number(e.target.value)));
                setShortBreakLength(val);
                if (currentMode === TimerMode.ShortBreak && !isActive) setTimeLeft(val * 60);
              }}
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Long Break (minutes) <span title="Every few focus sessions, take a long break" className="text-gray-500">💡</span></label>
            <input
              type="number"
              min={5}
              max={90}
              value={longBreakLength}
              onChange={(e) => {
                const val = Math.max(5, Math.min(90, Number(e.target.value)));
                setLongBreakLength(val);
                if (currentMode === TimerMode.ShortBreak && !isActive && (completedFocusCount % cyclesUntilLongBreak === 0)) setTimeLeft(val * 60);
              }}
              className="w-full rounded-md p-2 text-black"
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Presets <span title="Quickly set common focus/break durations" className="text-gray-500">⚙️</span></label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setPomodoroLength(25);
                  setShortBreakLength(5);
                  if (!isActive) setTimeLeft((currentMode === TimerMode.Pomodoro ? 25 : 5) * 60);
                }}
                className="px-3 py-1 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-700"
              >25/5</button>
              <button
                onClick={() => {
                  setPomodoroLength(50);
                  setShortBreakLength(10);
                  if (!isActive) setTimeLeft((currentMode === TimerMode.Pomodoro ? 50 : 10) * 60);
                }}
                className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >50/10</button>
              <button
                onClick={() => {
                  setPomodoroLength(TimerMode.Pomodoro);
                  setShortBreakLength(TimerMode.ShortBreak);
                  if (!isActive) setTimeLeft((currentMode === TimerMode.Pomodoro ? TimerMode.Pomodoro : TimerMode.ShortBreak) * 60);
                }}
                className="px-3 py-1 text-sm rounded-md bg-gray-500 text-white hover:bg-gray-600"
              >Default</button>
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Cycles Until Long Break <span title="Number of completed focus sessions before a long break" className="text-gray-500">🔁</span></label>
            <input
              type="number"
              min={2}
              max={10}
              value={cyclesUntilLongBreak}
              onChange={(e) => setCyclesUntilLongBreak(Math.max(2, Math.min(10, Number(e.target.value))))}
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold mb-2">Alerts <span title="Customize sound and visual alerts" className="text-gray-500">🔔</span></label>
            <div className="flex items-center gap-2 mb-2">
              <input id="alarm-toggle" type="checkbox" checked={playAlarm} onChange={() => setPlayAlarm(!playAlarm)} />
              <label htmlFor="alarm-toggle" title="Play sound when a session ends">Session End Sound</label>
            </div>
            <select title="Choose the session end sound" value={alarmUrl} onChange={(e)=> setAlarmUrl(e.target.value)} className="w-full rounded-md p-2 text-black mb-3">
              <option value="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg">Classic Alarm</option>
              <option value="https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg">Digital Watch</option>
              <option value="https://actions.google.com/sounds/v1/alarms/beep_short.ogg">Short Beep</option>
            </select>
            <div className="flex items-center gap-2 mb-2">
              <input id="distraction-toggle" type="checkbox" checked={playDistraction} onChange={() => setPlayDistraction(!playDistraction)} />
              <label htmlFor="distraction-toggle" title="Play sound when distraction is detected">Distraction Sound</label>
            </div>
            <select title="Choose the distraction alert sound" value={distractionUrl} onChange={(e)=> setDistractionUrl(e.target.value)} className="w-full rounded-md p-2 text-black mb-3">
              <option value="https://actions.google.com/sounds/v1/alarms/notification_sound.ogg">Notification</option>
              <option value="https://actions.google.com/sounds/v1/alarms/beep_short.ogg">Short Beep</option>
              <option value="https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg">Boing</option>
            </select>
            <div className="flex items-center gap-2">
              <input id="visual-toggle" type="checkbox" checked={visualAlert} onChange={() => setVisualAlert(!visualAlert)} />
              <label htmlFor="visual-toggle" title="Flash the panel when alerts trigger">Visual Flash</label>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300" title="Number of completed focus sessions in this run">Cycles Completed: <span className="font-semibold">{completedFocusCount}</span></div>
        </div>
        <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-h-40 overflow-auto">
          <div className="text-sm font-semibold mb-2">Session Log <span title="A lightweight log of recent focus and break sessions" className="text-gray-500">🗒️</span></div>
          {sessionHistory.length === 0 ? (
            <p className="text-xs text-gray-500">No sessions yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {sessionHistory.slice(-10).map((s, idx) => (
                <li key={idx} className="flex justify-between">
                  <span className="capitalize">{s.type}</span>
                  <span>{s.duration} min</span>
                  <span className="text-gray-500">{s.at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="lg:w-1/3 lg:border-l lg:border-gray-200 dark:lg:border-gray-700 lg:pl-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><ShieldIcon className="w-5 h-5"/> Attention Shield</h3>
            <label htmlFor="attention-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                    <input type="checkbox" id="attention-toggle" className="sr-only" checked={isAttentionShieldActive} onChange={() => setIsAttentionShieldActive(!isAttentionShieldActive)} />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${isAttentionShieldActive ? 'bg-violet-600' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isAttentionShieldActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </label>
        </div>
        {isAttentionShieldActive ? (
          <>
            <AttentionDetector isActive={isAttentionShieldActive} onStatusChange={setAttentionStatus} />
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 h-5">
              {isPausedByAttention ? 'Timer paused due to distraction.' : 'Monitoring focus...'}
            </p>
            <div className="mt-4">
              <EngagementGauge score={engagementScore} isTracking={true} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2" title="Data source for engagement">
              Source: AI Camera
            </p>
          </>
        ) : (
          <EngagementGauge score={engagementScore} isTracking={false} />
        )}
        {!isAttentionShieldActive && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2" title="Data source for engagement">
            Source: Input-only (keyboard/mouse/scroll)
          </p>
        )}
      </div>
       <audio ref={alarmRef} src={alarmUrl} preload="auto" />
       <audio ref={distractionSoundRef} src={distractionUrl} preload="auto" />
       <audio ref={bellRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />
      {/* Session Summary Modal */}
      <Modal isOpen={showSummary} onClose={() => setShowSummary(false)} title="Session Summary">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Avg Engagement</div>
              <div className="text-2xl font-bold">{summaryData.avg}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Time &lt; 30%</div>
              <div className="text-2xl font-bold">{Math.floor(summaryData.belowSecs/60)}m {summaryData.belowSecs%60}s</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Stillness Alerts</div>
              <div className="text-2xl font-bold">{summaryData.stills}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setShowSummary(false)} className="px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700">Close</button>
          </div>
        </div>
      </Modal>
      <EngagementChallengeModal isOpen={showChallenge} onClose={handleChallengeClose} />
    </div>
  );
};

export default Timer;