import React, { useState } from 'react';
import StatCard from './StatCard';
import TreeIcon from './icons/TreeIcon';
import Modal from './common/Modal';
import type { User, Achievement } from '../types';

interface ProfileProps {
    user: User;
    setUser: React.Dispatch<React.SetStateAction<User>>;
    focusTime: number; // in minutes
    tasksCompleted: number;
    points: number;
    streak: number;
}

const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => (
    <div className={`flex items-center gap-4 p-4 rounded-lg transition-all ${achievement.unlocked ? 'bg-green-500/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${achievement.unlocked ? 'bg-yellow-400 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'}`}>
            {achievement.icon}
        </div>
        <div>
            <h4 className={`font-bold ${achievement.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{achievement.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
        </div>
    </div>
);


const Profile: React.FC<ProfileProps> = ({ user, setUser, focusTime, tasksCompleted, points, streak }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const hours = Math.floor(focusTime / 60);
    const growth = Math.min(100, Math.floor(focusTime / 60));
    const level = Math.floor(points / 100) + 1;
    const ptsIntoLevel = points % 100;
    const progressPct = Math.min(100, Math.round((ptsIntoLevel / 100) * 100));

    const allAchievements: Omit<Achievement, 'unlocked'>[] = [
        { id: 'streak5', name: 'Focused Week', description: 'Maintain a 5-day streak.', icon: <span>🔥</span> },
        { id: 'points1000', name: 'Point Collector', description: 'Earn 1000 focus points.', icon: <span>💎</span> },
        { id: 'hours10', name: 'Deep Diver', description: 'Focus for 10 total hours.', icon: <span>🕰️</span> },
        { id: 'tasks25', name: 'Task Master', description: 'Complete 25 tasks.', icon: <span>✅</span> },
        { id: 'hours1', name: 'Getting Started', description: 'Focus for 1 total hour.', icon: <span>🌱</span> },
        { id: 'points100', name: 'Point Earner', description: 'Earn 100 focus points.', icon: <span>💰</span> },
    ];

    const achievements: Achievement[] = allAchievements.map(ach => {
        let unlocked = false;
        if (ach.id === 'streak5' && streak >= 5) unlocked = true;
        if (ach.id === 'points1000' && points >= 1000) unlocked = true;
        if (ach.id === 'hours10' && hours >= 10) unlocked = true;
        if (ach.id === 'tasks25' && tasksCompleted >= 25) unlocked = true;
        if (ach.id === 'hours1' && hours >= 1) unlocked = true;
        if (ach.id === 'points100' && points >= 100) unlocked = true;
        return { ...ach, unlocked };
    }).sort((a,b) => Number(b.unlocked) - Number(a.unlocked));

    const handleSaveProfile = () => {
        setUser(prev => ({ ...prev, name: editedName }));
        setIsEditModalOpen(false);
    };

    return (
        <>
            <div className="space-y-8">
                <header className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-violet-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <span className="text-4xl font-bold">{user.name.charAt(0)}</span>
                    </div>
                    <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                            <h1 className="text-4xl font-bold">{user.name}</h1>
                            <span title="Your current level (100 points per level)" className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Level {level}</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Joined: {new Date(user.joined).toLocaleDateString()}</p>
                        <div className="mt-3">
                            <div className="h-2 w-64 max-w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600" style={{ width: `${progressPct}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ptsIntoLevel}/100 pts to next level</p>
                        </div>
                    </div>
                    <button onClick={() => setIsEditModalOpen(true)} className="ml-auto bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600">
                        Edit Profile
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Focus Streak" value={`${streak} day${streak === 1 ? '' : 's'} 🔥`} />
                    <StatCard title="Focus Points" value={`${points} 💎`} />
                    <StatCard title="Total Focus Time" value={`${hours}h ${focusTime % 60}m`} />
                    <StatCard title="Tasks Completed" value={tasksCompleted.toString()} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold mb-4">Achievements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {achievements.map(ach => <AchievementBadge key={ach.id} achievement={ach} />)}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
                        <h3 className="text-xl font-bold mb-4">Focus Tree</h3>
                        <TreeIcon growth={growth} />
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">You've nurtured your tree for {hours} hours!</p>
                    </div>
                </div>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Display Name</label>
                        <input 
                            type="text" 
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full p-3 mt-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                     <div className="flex justify-end gap-4">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button onClick={handleSaveProfile} className="px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700">Save Changes</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Profile;