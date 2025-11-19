import { useState, useEffect, useCallback } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { Task, Message, User, DailyLog, ToastMessage } from '../types';
import { getMotivationQuote } from '../services/geminiService';

const useUserData = () => {
  const [user, setUser] = useState<User>({ name: 'Student', email: 'student@focus.ai', joined: new Date().toISOString() });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI Study Buddy. How can I help you focus today?", sender: 'ai' }
  ]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dailyLog, setDailyLog] = useState<DailyLog[]>([]);
  const [quote, setQuote] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const getLevel = (pts: number) => Math.floor(pts / 100) + 1; // 100 pts per level

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedUser = localStorage.getItem('focusBuddyUser');
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedTasks = localStorage.getItem('focusBuddyTasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    const savedPoints = localStorage.getItem('focusBuddyPoints');
    if (savedPoints) setPoints(JSON.parse(savedPoints));
    const savedStreak = localStorage.getItem('focusBuddyStreak');
    if (savedStreak) setStreak(JSON.parse(savedStreak));
    const savedLog = localStorage.getItem('focusBuddyLog');
    if (savedLog) setDailyLog(JSON.parse(savedLog));

    getMotivationQuote()
        .then(setQuote)
        .catch(err => {
            console.error("Failed to get quote", err);
            setQuote("The secret to getting ahead is getting started.");
        })
        .finally(() => setIsLoadingQuote(false));
  }, []);

  // Reflect Firebase Auth user into local user state (name/email)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser(prev => ({
          ...prev,
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : '') || prev.name || 'Student',
          email: fbUser.email || prev.email,
        }));
      }
    });
    return () => unsub();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => { localStorage.setItem('focusBuddyUser', JSON.stringify(user)) }, [user]);
  useEffect(() => { localStorage.setItem('focusBuddyTasks', JSON.stringify(tasks)) }, [tasks]);
  useEffect(() => { localStorage.setItem('focusBuddyPoints', JSON.stringify(points)) }, [points]);
  useEffect(() => { localStorage.setItem('focusBuddyStreak', JSON.stringify(streak)) }, [streak]);
  useEffect(() => { localStorage.setItem('focusBuddyLog', JSON.stringify(dailyLog)) }, [dailyLog]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newToast = { id: Date.now(), message, type };
    setToasts(prev => [...prev, newToast]);
  };

  const handleSessionComplete = useCallback((minutes: number) => {
    const today = new Date().toISOString().split('T')[0];
    const newPoints = minutes; // 1 point per minute of focus
    // Compute level-up against current points snapshot
    const prevLevel = getLevel(points);
    const nextTotal = points + newPoints;
    const nextLevel = getLevel(nextTotal);
    setPoints(p => p + newPoints);
    showToast(`Session complete! +${newPoints} points earned!`, 'success');
    if (nextLevel > prevLevel) {
      showToast(`Level up! You reached Level ${nextLevel} 🎉`, 'success');
    }

    const lastLog = dailyLog.length > 0 ? dailyLog.sort((a,b) => a.date.localeCompare(b.date))[dailyLog.length - 1] : null;
    
    setDailyLog(log => {
        const todayLog = log.find(d => d.date === today);
        if (todayLog) {
            return log.map(day => day.date === today ? {...day, focusTime: day.focusTime + minutes} : day);
        }
        return [...log, { date: today, focusTime: minutes, tasksCompleted: 0, distractionsDetected: 0 }];
    });
    
    if (!lastLog || lastLog.date !== today) { // First session of the day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastLog && lastLog.date === yesterday.toISOString().split('T')[0]) {
            setStreak(s => s + 1);
        } else if (!lastLog || new Date(today).getTime() - new Date(lastLog.date).getTime() > 86400000 * 1.5) {
            setStreak(1);
        }
    }
  }, [dailyLog, points]);

  const handleTaskComplete = useCallback(() => {
    const newPoints = 10;
    setPoints(p => p + newPoints);
    showToast(`Task completed! +${newPoints} points!`, 'success');
    const today = new Date().toISOString().split('T')[0];
    
    setDailyLog(log => {
        const todayLog = log.find(d => d.date === today);
        if(todayLog) {
            return log.map(day => day.date === today ? {...day, tasksCompleted: day.tasksCompleted + 1} : day);
        }
        return [...log, { date: today, focusTime: 0, tasksCompleted: 1, distractionsDetected: 0 }];
    });
  }, [dailyLog]);
  
  const handleDistraction = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
     setDailyLog(log => {
        const todayLog = log.find(d => d.date === today);
        if(todayLog) {
            return log.map(day => day.date === today ? {...day, distractionsDetected: day.distractionsDetected + 1} : day);
        }
        return [...log, { date: today, focusTime: 0, tasksCompleted: 0, distractionsDetected: 1 }];
    });
  }, [dailyLog]);

  const totalFocusTime = dailyLog.reduce((sum, day) => sum + day.focusTime, 0);
  const tasksCompletedCount = tasks.filter(t => t.completed).length;

  return {
    user, setUser,
    tasks, setTasks,
    messages, setMessages,
    points,
    streak,
    dailyLog,
    quote, isLoadingQuote,
    toasts, setToasts,
    showToast,
    handleSessionComplete,
    handleTaskComplete,
    handleDistraction,
    totalFocusTime,
    tasksCompletedCount,
  };
};

export default useUserData;