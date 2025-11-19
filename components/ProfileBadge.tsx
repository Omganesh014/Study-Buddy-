import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

interface ProfileBadgeProps {
  className?: string;
  compact?: boolean; // deprecated in favor of size
  size?: 'xs' | 'sm' | 'md'; // xs=w-6, sm=w-8, md=w-10
  avatarOnly?: boolean; // if true, only show the circle avatar
}

const ProfileBadge: React.FC<ProfileBadgeProps> = ({ className = '', compact = false, size = 'md', avatarOnly = false }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const initials = user?.displayName?.split(' ').map(p => p[0]).slice(0, 2).join('') || 'U';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const doSignOut = async () => {
    setLoading(true);
    try { await signOut(auth); } finally { setLoading(false); }
  };

  // Backward-compat: compact=true -> size='sm'
  const resolvedSize = compact ? 'sm' : size;
  const sizeClass = resolvedSize === 'xs' ? 'w-6 h-6' : resolvedSize === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const nameClass = resolvedSize === 'xs' ? 'text-xs' : resolvedSize === 'sm' ? 'text-sm' : 'text-base';
  const emailClass = resolvedSize === 'xs' ? 'text-[11px]' : resolvedSize === 'sm' ? 'text-xs' : 'text-sm';

  if (avatarOnly) {
    return (
      <div className={`inline-flex ${className}`} title={user?.displayName || user?.email || 'User'}>
        <div className={`${sizeClass} rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200`}>
          {user?.photoURL ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img src={user.photoURL} alt="User photo" className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-xs">{initials}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClass} rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200`}
           title={user?.displayName || user?.email || 'User'}>
        {user?.photoURL ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={user.photoURL} alt="User photo" className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold">{initials}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className={`${nameClass} font-semibold text-gray-900 dark:text-white truncate`}>
          {user?.displayName || user?.email || 'Guest'}
        </div>
        {user?.email && (
          <div className={`${emailClass} text-gray-500 dark:text-gray-400 truncate`}>{user.email}</div>
        )}
      </div>
      {user && (
        <button
          onClick={doSignOut}
          disabled={loading}
          className={`ml-auto px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          title="Sign out"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
;

export default ProfileBadge;
