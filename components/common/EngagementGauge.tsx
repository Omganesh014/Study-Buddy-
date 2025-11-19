import React, { useEffect, useRef, useState } from 'react';

interface EngagementGaugeProps {
  score: number; // 0-100
  isTracking: boolean;
}

export const EngagementGauge: React.FC<EngagementGaugeProps> = ({ score, isTracking }) => {
  // Normalize incoming score: support 0–1 (preferred) or 0–100 (backward-compatible)
  const normalizeToPercent = (s: number) => (s <= 1 ? Math.max(0, Math.min(1, s)) * 100 : Math.max(0, Math.min(100, s)));
  const initial = isTracking ? normalizeToPercent(score) : 100;
  // Smooth, live animation toward the latest score (percent)
  const [displayScore, setDisplayScore] = useState<number>(initial);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<number>(displayScore);

  useEffect(() => {
    const target = isTracking ? normalizeToPercent(score) : 100;
    targetRef.current = target;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = () => {
      setDisplayScore(prev => {
        const target = targetRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.2) return target; // snap when close
        return prev + diff * 0.15; // ease toward target
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score, isTracking]);

  // Visualize current displayScore (0–100) as ring fill amount
  const normalizedScore = Math.max(0, Math.min(100, displayScore)) / 100;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - normalizedScore * circumference;

  const getStrokeColor = () => {
    if (normalizedScore > 0.7) return 'text-green-500 dark:text-green-400';
    if (normalizedScore > 0.4) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col justify-center items-center p-0">
        <div className="w-full px-4 pt-4">
          <h3 className="font-bold text-lg mb-1">Engagement Level</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {isTracking ? 'Actively monitoring...' : 'Tracking paused'}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative w-40 h-40 max-w-full max-h-full">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              <circle
                className="text-gray-300 dark:text-gray-700"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
              />
              <circle
                className={`${getStrokeColor()} transition-all duration-500`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getStrokeColor()}`}>
                {Math.round(displayScore)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">/ 100</span>
            </div>
          </div>
        </div>
        <div className={`text-center font-semibold transition-opacity duration-300 ${isTracking ? 'animate-pulse' : 'opacity-50'} h-12 flex items-center justify-center w-full pb-4`}>
          {isTracking ? 'Stay Focused!' : 'Start a session to begin.'}
        </div>
      </div>
    </div>
  );
};

export default EngagementGauge;
