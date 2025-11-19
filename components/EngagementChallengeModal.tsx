import React, { useState, useEffect, FormEvent } from 'react';
import { getEngagementChallenge } from '../services/geminiService';
import type { EngagementChallenge, CountingChallenge, JokeChallenge, FunFactChallenge } from '../types';

// --- PROPS ---
interface EngagementChallengeModalProps {
  isOpen: boolean;
  onClose: (success: boolean) => void;
}

// --- ICONS ---
const LightbulbIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const SparkleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><path d="M9.93 2.07 12 7l2.07-4.93M2.07 9.93 7 12l-4.93 2.07M16 12l4.93-2.07L16 12l4.93 2.07L16 12Zm-4 4.07L7 12v0l4.93-2.07L12 16.07Z"/></svg>);
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-300"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);

// --- SUB-COMPONENTS for each challenge type ---

const CountingUI: React.FC<{ challenge: CountingChallenge; onComplete: (success: boolean) => void }> = ({ challenge, onComplete }) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isCorrect !== null) return;
    const success = parseInt(userAnswer, 10) === challenge.correctAnswer;
    setIsCorrect(success);
    setTimeout(() => onComplete(success), success ? 1500 : 2000);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <p className="text-medium-text mb-4">{challenge.question}</p>
      <div className="bg-dark-bg rounded-md overflow-hidden aspect-video flex items-center justify-center my-4">
        <img src={challenge.imageUrl} alt="Counting Challenge" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Enter count..." className="bg-dark-bg border border-dark-border rounded-lg px-4 py-2 w-full sm:w-auto text-center text-lg focus:ring-2 focus:ring-brand-primary focus:outline-none" disabled={isCorrect !== null} required autoFocus />
        <button type="submit" className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-lg transition-colors w-full sm:w-auto disabled:bg-gray-500" disabled={isCorrect !== null || !userAnswer}>Submit</button>
      </div>
      {isCorrect === true && <p className="text-center text-green-400 mt-4 font-semibold">Correct! ✨</p>}
      {isCorrect === false && <p className="text-center text-red-400 mt-4">Better luck next time... 😢</p>}
    </form>
  );
};

const JokeUI: React.FC<{ challenge: any; onComplete: (success: boolean) => void }> = ({ challenge, onComplete }) => {
  return (
    <div className="text-center">
      <p className="text-lg text-medium-text min-h-[6rem] flex items-center justify-center">{challenge.question}</p>
      <p className="text-xl font-semibold text-light-text my-4">{challenge.punchline}</p>
      <button onClick={() => onComplete(true)} className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-lg transition-colors mt-4">
        Done
      </button>
    </div>
  );
};

const FunFactUI: React.FC<{ challenge: FunFactChallenge; onComplete: (success: boolean) => void }> = ({ challenge, onComplete }) => {
  return (
    <div className="text-center">
      <p className="text-lg text-medium-text min-h-[6rem] flex items-center justify-center">{challenge.fact}</p>
      <button onClick={() => onComplete(true)} className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-lg transition-colors mt-4">
        Interesting!
      </button>
    </div>
  );
};


// --- MAIN MODAL COMPONENT ---
export const EngagementChallengeModal: React.FC<EngagementChallengeModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [challenge, setChallenge] = useState<EngagementChallenge | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getEngagementChallenge().then(result => {
        setChallenge(result);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderChallenge = () => {
    if (!challenge) return null;
    switch (challenge.type) {
      case 'counting': return <CountingUI challenge={challenge} onComplete={onClose} />;
      case 'joke': return <JokeUI challenge={challenge} onComplete={onClose} />;
      case 'fun_fact': return <FunFactUI challenge={challenge} onComplete={onClose} />;
      default: return <p>Something went wrong.</p>;
    }
  };

  const getIcon = () => {
    if (!challenge) return <EyeIcon />;
    switch (challenge.type) {
      case 'counting': return <EyeIcon />;
      case 'joke': return <SparkleIcon />;
      case 'fun_fact': return <LightbulbIcon />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity p-4">
      <div className="bg-dark-card rounded-lg border border-dark-border p-6 sm:p-8 max-w-lg w-full transform transition-all shadow-2xl">
        <div className="flex items-center mb-4">
            {getIcon()}
            <h2 className="text-xl sm:text-2xl font-bold ml-3">Quick Focus Check!</h2>
        </div>
        
        {isLoading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="text-medium-text">Thinking of a new challenge...</p>
            </div>
        ) : (
            renderChallenge()
        )}
      </div>
    </div>
  );
};

export default EngagementChallengeModal;
