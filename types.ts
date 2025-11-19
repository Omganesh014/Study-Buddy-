import type React from 'react';

export interface Task {
  id: number;
  text: string;
  subject: string;
  completed: boolean;
  deadline: string;
}

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export interface User {
  name: string;
  email: string;
  joined: string;
  avatar?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  focusTime: number; // in minutes
  tasksCompleted: number;
  distractionsDetected: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    unlocked: boolean;
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error';
}

export enum TimerMode {
  Pomodoro = 25,
  ShortBreak = 5,
  LongFocus = 50,
}

export type AttentionStatus = 'focused' | 'distracted' | 'away' | 'initializing' | 'off' | 'error' | 'permission-needed' | 'permission-denied';

export type Theme = 'light' | 'dark';

export type Page = 'dashboard' | 'focus' | 'tasks' | 'chat' | 'community' | 'reports' | 'profile' | 'notes';

export interface EngagementRecord {
  time: number; // epoch ms
  score: number; // 0-100
}