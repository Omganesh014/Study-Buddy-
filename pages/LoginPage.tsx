import React, { useEffect, useState } from 'react';
import type { Theme } from '../types';
import { BrainIcon, ShieldIcon } from '../constants';
import { auth, googleProvider } from '../services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';

interface LoginPageProps {
  onLogin: () => void;
  theme: Theme;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme }) => {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (e: any) {
      console.error('Google sign-in failed', e);
      setError(e?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (e: any) {
      console.error('Sign out failed', e);
      setError(e?.message || 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-500 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl text-center border border-gray-200 dark:border-gray-700">
        <div className="flex justify-center">
          <BrainIcon className="w-16 h-16 text-violet-600 dark:text-violet-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">FocusFlow Ai</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">Your AI-powered study partner to conquer distractions and achieve your goals.</p>
        
        <div className="space-y-4 text-left p-4 bg-gray-100 dark:bg-white-700 rounded-lg">
            <p className="flex items-center gap-3"><ShieldIcon className="w-5 h-5 text-green-500"/> AI Attention Shield to keep you on track.</p>
            <p className="flex items-center gap-3"><BrainIcon className="w-5 h-5 text-blue-500"/> AI Chat for summaries & explanations.</p>
        </div>

        <div className="space-y-3">
          {user && (
            <div className="flex items-center gap-3 justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left">
                <div className="text-sm text-gray-600 dark:text-gray-300">Signed in as</div>
                <div className="font-semibold text-gray-900 dark:text-white">{user.displayName || user.email}</div>
              </div>
            </div>
          )}

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`w-full py-3 px-4 font-bold text-white rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-violet-500/50 ${loading ? 'bg-violet-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
          >
            {user ? `Continue as ${user.displayName || user.email || 'you'}` : 'Continue with Google'}
          </button>

          {user && (
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Sign out
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-500 bg-red-100/20 border border-red-300/30 rounded p-2">{error}</div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">Google Sign-In is used to authenticate your session securely.</p>
      </div>
    </div>
  );
};

export default LoginPage;