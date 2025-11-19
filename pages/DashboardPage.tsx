import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import StatCard from '../components/StatCard';
import EngagementGauge from '../components/common/EngagementGauge';
import AttentionDetector from '../components/AttentionDetector';
import { useEngagement } from '../hooks/useEngagement';
import type { User, Task, DailyLog, Page } from '../types';

interface DashboardPageProps {
    user: User;
    quote: string;
    isLoadingQuote: boolean;
    tasks: Task[];
    dailyLog: DailyLog[];
    points: number;
    streak: number;
    setActivePage: (page: Page) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, quote, isLoadingQuote, tasks, dailyLog, points, streak, setActivePage }) => {
  const upcomingTasks = tasks.filter(t => !t.completed).slice(0, 3);
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLog.find(l => l.date === today);
  const todayFocusTime = todayLog?.focusTime || 0;

  const ActionButton: React.FC<{label: string, icon: string, onClick: () => void, className?: string}> = ({label, icon, onClick, className}) => (
      <button onClick={onClick} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all transform ${className}`}>
          <span className="text-4xl">{icon}</span>
          <span className="font-semibold text-lg">{label}</span>
      </button>
  );

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setFbUser);
    return () => unsub();
  }, []);
  const displayName = ((fbUser?.displayName) || user.name || '').trim();
  const firstName = displayName ? displayName.split(' ')[0] : 'Friend';
  // Attention / engagement state for the dashboard widget
  const [isAttentionShieldActive, setIsAttentionShieldActive] = useState<boolean>(false);
  const [attentionStatus, setAttentionStatus] = useState<string>('off');

  const { engagementScore, startTracking, stopTracking, handleActivity } = useEngagement({
    isTracking: isAttentionShieldActive,
    threshold: 40,
    onThresholdBreach: () => {
      // Simple in-dashboard feedback; the main Timer handles session interruptions
      // We could show a toast here if Dashboard had access to it.
      console.log('Engagement threshold breached on dashboard');
    },
  });
  const [showStartOptions, setShowStartOptions] = useState<boolean>(false);
  const [startWithShield, setStartWithShield] = useState<boolean>(false);
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Ready for another productive session?</p>
      </header>
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg text-center">
        {isLoadingQuote ? (
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded-full w-3/4 mx-auto animate-pulse"></div>
        ) : (
          <p className="text-lg italic text-gray-700 dark:text-gray-300">"{quote}"</p>
        )}
      </div>

      {showStartOptions && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl w-11/12 max-w-md">
            <h3 className="text-lg font-bold mb-3">Start Focus Session</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose whether to enable Attention Shield (camera monitoring) for this session.</p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">Enable Attention Shield</span>
              </div>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={startWithShield} onChange={() => setStartWithShield(s => !s)} />
                <div className={`block w-12 h-7 rounded-full transition-colors ${startWithShield ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`absolute left-0 top-0 ml-1 mt-1 bg-white w-5 h-5 rounded-full transition-transform ${startWithShield ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStartOptions(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={() => {
                // persist preference for Timer to pick up
                try { sessionStorage.setItem('startWithAttentionShield', startWithShield ? '1' : '0'); } catch {}
                setShowStartOptions(false);
                setActivePage('focus');
              }} className="px-4 py-2 rounded-lg bg-violet-600 text-white">Start</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Focus" value={`${Math.floor(todayFocusTime / 60)}h ${todayFocusTime % 60}m`} />
        <StatCard title="Focus Streak" value={`${streak} day${streak === 1 ? '' : 's'} 🔥`} />
        <StatCard title="Focus Points" value={`${points} 💎`} />
        <StatCard title="Tasks Completed" value={tasks.filter(t=>t.completed).length.toString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionButton label="Start Focus Session" icon="⏳" onClick={() => setShowStartOptions(true)} className="md:col-span-3 text-violet-500"/>
          <ActionButton label="To-Do List" icon="📋" onClick={() => setActivePage('tasks')} className="text-green-500"/>
          <ActionButton label="Live Group Study" icon="👥" onClick={() => setActivePage('community')} className="text-blue-500"/>
          <ActionButton label="View Reports" icon="📊" onClick={() => setActivePage('reports')} className="text-amber-500"/>
      </div>
      
  <div className="grid grid-cols-1 md:gap-6 gap-6 md:grid-cols-[2fr_1fr]">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg h-full md:h-72 flex flex-col">
          <h3 className="text-xl font-bold mb-4">Up Next</h3>
          <div className="space-y-3 flex-1 overflow-auto">
            {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
              <div key={task.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{task.text}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{task.subject} - Due: {task.deadline}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-violet-600 text-white rounded-full">TODO</span>
              </div>
            )) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming tasks. Add some in the Tasks tab!</p>
            )}
          </div>
        </div>

        <div className="h-full md:h-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col justify-between items-stretch p-0">
          <div className="flex-1 flex flex-col justify-center items-center w-full h-full">
            <EngagementGauge score={engagementScore} isTracking={isAttentionShieldActive} />
          </div>
          {/* Hidden attention detector feed for camera-based signals (keeps dashboard compact) */}
          {isAttentionShieldActive && (
            <div className="sr-only" aria-hidden>
              <AttentionDetector isActive={isAttentionShieldActive} onStatusChange={(s) => {
                setAttentionStatus(s);
                if (s === 'focused' || s === 'distracted') {
                  try { handleActivity(); } catch {}
                }
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;