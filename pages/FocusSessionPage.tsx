import React from 'react';
import Timer from '../components/Timer';

interface FocusSessionPageProps {
  handleSessionComplete: (minutes: number) => void;
  handleDistraction: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const FocusSessionPage: React.FC<FocusSessionPageProps> = ({ handleSessionComplete, handleDistraction, showToast }) => {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold">Focus Session</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Minimize distractions. The journey to mastery begins now.</p>
      </header>
      <Timer onSessionComplete={handleSessionComplete} onDistraction={handleDistraction} showToast={showToast} />
    </div>
  );
};

export default FocusSessionPage;