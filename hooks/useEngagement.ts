import { useState, useEffect, useRef, useCallback } from 'react';
import type { EngagementRecord } from '../types';
import { ENGAGEMENT_DECAY_RATE, ACTIVITY_BUMP, MAX_ENGAGEMENT_SCORE } from '../constants';
import { calculateIdlePenalty } from '../services/geminiService';

interface UseEngagementProps {
  isTracking: boolean; // camera ON (attention shield active)
  threshold: number;
  onThresholdBreach: () => void;
  isDistracted?: boolean; // from AttentionDetector (distracted or away)
  isAway?: boolean; // specifically 'away' (face not shown)
}

export const useEngagement = ({ isTracking, threshold, onThresholdBreach, isDistracted = false, isAway = false }: UseEngagementProps) => {
  const [engagementScore, setEngagementScore] = useState(MAX_ENGAGEMENT_SCORE);
  const [engagementHistory, setEngagementHistory] = useState<EngagementRecord[]>([]);
  
  const scoreRef = useRef(engagementScore);
  scoreRef.current = engagementScore;

  const thresholdBreached = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastMouseActivityRef = useRef(Date.now());
  const lastScrollActivityRef = useRef(Date.now());
  const windowFocusedRef = useRef<boolean>(true);
  const idlePenaltyAppliedRef = useRef(false);
  const awayPenaltyAppliedRef = useRef(false);
  const noMoveTriggeredRef = useRef(false);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    lastMouseActivityRef.current = Date.now();
    if (idlePenaltyAppliedRef.current) {
        idlePenaltyAppliedRef.current = false; // Reset penalty flag on new activity
    }
    if (awayPenaltyAppliedRef.current) {
        awayPenaltyAppliedRef.current = false;
    }
    // If a 10s no-movement period was active, reset back to 100 and restart tracking on first activity
    if (noMoveTriggeredRef.current) {
      noMoveTriggeredRef.current = false;
      setEngagementScore(MAX_ENGAGEMENT_SCORE);
      setEngagementHistory([]);
      thresholdBreached.current = false;
      idlePenaltyAppliedRef.current = false;
      awayPenaltyAppliedRef.current = false;
      return;
    }
    setEngagementScore(prev => Math.min(prev + ACTIVITY_BUMP, MAX_ENGAGEMENT_SCORE));
  }, []);

  const startTracking = useCallback(() => {
    setEngagementScore(MAX_ENGAGEMENT_SCORE);
    setEngagementHistory([]);
    thresholdBreached.current = false;
    lastActivityRef.current = Date.now();
    idlePenaltyAppliedRef.current = false;
  }, []);

  const stopTracking = useCallback(() => {
    setEngagementScore(MAX_ENGAGEMENT_SCORE);
    setEngagementHistory([]);
  }, []);
  
  const resetEngagement = useCallback(() => {
    setEngagementScore(MAX_ENGAGEMENT_SCORE);
    thresholdBreached.current = false;
    lastActivityRef.current = Date.now();
    lastMouseActivityRef.current = Date.now();
    idlePenaltyAppliedRef.current = false;
    awayPenaltyAppliedRef.current = false;
  }, []);

  useEffect(() => {
    // Always attach listeners when the hook is in use

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      windowFocusedRef.current = !hidden;
      if (hidden) {
        setEngagementScore(prev => Math.max(0, prev - 0.5));
      }
    };

    const onMouse = () => { lastMouseActivityRef.current = Date.now(); };
    const onScroll = () => { lastScrollActivityRef.current = Date.now(); };
    const onFocus = () => { windowFocusedRef.current = true; };
    const onBlur = () => { windowFocusedRef.current = false; };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);


    const decayInterval = setInterval(() => {
      const now = Date.now();
      const noRecentKeys = now - lastActivityRef.current > 2000; // 2s
      const noRecentMouse = now - lastMouseActivityRef.current > 2000; // 2s
      const noRecentScroll = now - lastScrollActivityRef.current > 3000; // 3s
      const noInputs = noRecentKeys && noRecentMouse && noRecentScroll && windowFocusedRef.current;

      // Global 7s no-movement rule (no keys AND no mouse AND no scroll)
      const noMove7s =
        (now - lastActivityRef.current > 7000) &&
        (now - lastMouseActivityRef.current > 7000) &&
        (now - lastScrollActivityRef.current > 7000);
      if (noMove7s) noMoveTriggeredRef.current = true;

      let nextScore = scoreRef.current;

      // Debounce state for camera-based engagement
      // Use refs to track last camera state and when it changed
      const cameraStateRef = useRef<'focused' | 'distracted' | 'away' | 'none'>('none');
      const cameraStateChangeTsRef = useRef<number>(Date.now());
      let cameraState: 'focused' | 'distracted' | 'away' | 'none' = 'none';
      if (isTracking) {
        if (!isDistracted && !isAway) cameraState = 'focused';
        else if (isAway) cameraState = 'away';
        else cameraState = 'distracted';
      } else {
        cameraState = 'none';
      }
      if (cameraState !== cameraStateRef.current) {
        cameraStateRef.current = cameraState;
        cameraStateChangeTsRef.current = now;
      }
      // Only update engagement after 2s in the same camera state
      const cameraDelayMs = 2000;
      if (isTracking) {
        const cameraDelayPassed = now - cameraStateChangeTsRef.current >= cameraDelayMs;
        if (cameraState === 'focused' && cameraDelayPassed) {
          // Smoothly rise toward 100 (bounce back)
          nextScore = Math.min(MAX_ENGAGEMENT_SCORE, scoreRef.current + 10);
        } else if ((cameraState === 'distracted' || cameraState === 'away') && cameraDelayPassed) {
          nextScore = Math.max(0, scoreRef.current - ENGAGEMENT_DECAY_RATE * 4);
        } else {
          // During the delay, decay at the normal rate
          nextScore = Math.max(0, scoreRef.current - ENGAGEMENT_DECAY_RATE);
        }
      } else {
        // Camera OFF: use input fallback
        const shouldDecay = noMove7s || noInputs;
        nextScore = shouldDecay
          ? Math.max(0, scoreRef.current - ENGAGEMENT_DECAY_RATE)
          : Math.min(scoreRef.current + ACTIVITY_BUMP, MAX_ENGAGEMENT_SCORE);
      }

      if (nextScore < threshold && !thresholdBreached.current) {
        thresholdBreached.current = true;
        onThresholdBreach();
      }

      setEngagementScore(nextScore);
      setEngagementHistory(prevHistory => {
         const newRecord = { time: Date.now(), score: nextScore };
         const last100 = prevHistory.slice(-99);
         return [...last100, newRecord];
      });
    }, 1000);

    return () => {
      clearInterval(decayInterval);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, isDistracted, threshold, onThresholdBreach, handleActivity]);
  
  useEffect(() => {
    // Apply idle penalty only in a decay-eligible state

    const idleCheckInterval = setInterval(async () => {
        const now = Date.now();
        const idleTime = now - lastActivityRef.current;
        const mouseIdleTime = now - lastMouseActivityRef.current;
        const noRecentKeys = idleTime > 2000;
        const canDecay = (!isTracking && noRecentKeys) || (isTracking && isDistracted);

        // Generic idle penalty (for decay-eligible state)
        if (canDecay && idleTime > 13000 && !idlePenaltyAppliedRef.current) {
            idlePenaltyAppliedRef.current = true;
            const newScore = await calculateIdlePenalty(scoreRef.current);
            setEngagementScore(newScore);
        }

        // Special rule: Face AWAY >=13s and no mouse activity >=13s => decrease by 2 points once
        if (isTracking && isAway && mouseIdleTime >= 13000 && !awayPenaltyAppliedRef.current) {
            awayPenaltyAppliedRef.current = true;
            setEngagementScore(prev => Math.max(0, prev - 2));
        }

        // Reset the away penalty flag when user returns or moves mouse
        if (!isAway || mouseIdleTime < 13000) {
            awayPenaltyAppliedRef.current = false;
        }

    }, 1000);

    return () => clearInterval(idleCheckInterval);
  }, [isTracking, isDistracted, isAway]);

  return { engagementScore, engagementHistory, resetEngagement, stopTracking, startTracking, handleActivity };
};
