import React, { useState } from 'react';
import { HomeIcon, TasksIcon, ChatIcon, UsersIcon, ChartBarIcon, ProfileIcon, PowerIcon, MoonIcon, SunIcon, NotesIcon } from '../constants';
import useUserData from '../hooks/useUserData';
import type { Theme, Page } from '../types';
import DashboardPage from './DashboardPage';
import FocusSessionPage from './FocusSessionPage';
import TasksPage from './TasksPage';
import ChatPage from './ChatPage';
import GroupStudyPage from './GroupStudyPage';
import ReportsPage from './ReportsPage';
import NotesPage from './NotesPage';
import ProfilePage from './ProfilePage';
import ToastContainer from '../components/common/ToastContainer';
import ProfileBadge from '../components/ProfileBadge';

interface MainLayoutProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${isActive ? 'text-violet-500' : 'text-gray-500 hover:text-violet-500 dark:text-gray-400 dark:hover:text-violet-400'}`}>
        {icon}
        <span className="text-xs font-bold">{label}</span>
        {isActive && <div className="w-8 h-1 bg-violet-500 rounded-full mt-1"></div>}
    </button>
);

const MainLayout: React.FC<MainLayoutProps> = ({ theme, setTheme, onLogout }) => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const userData = useUserData();
  
  const renderContent = () => {
    switch(activePage) {
      case 'dashboard': return <DashboardPage user={userData.user} quote={userData.quote} isLoadingQuote={userData.isLoadingQuote} tasks={userData.tasks} dailyLog={userData.dailyLog} points={userData.points} streak={userData.streak} setActivePage={setActivePage} />;
      case 'focus': return <FocusSessionPage handleSessionComplete={userData.handleSessionComplete} handleDistraction={userData.handleDistraction} showToast={userData.showToast} />;
      case 'tasks': return <TasksPage tasks={userData.tasks} setTasks={userData.setTasks} handleTaskComplete={userData.handleTaskComplete} />;
      case 'chat': return <ChatPage messages={userData.messages} setMessages={userData.setMessages} />;
      case 'community': return <GroupStudyPage />;
      case 'reports': return <ReportsPage dailyLog={userData.dailyLog} />;
      case 'notes': return <NotesPage />;
      case 'profile': return <ProfilePage user={userData.user} setUser={userData.setUser} totalFocusTime={userData.totalFocusTime} tasksCompletedCount={userData.tasksCompletedCount} points={userData.points} streak={userData.streak} />;
      default: return <div>Page not found</div>;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-500">
      <ToastContainer toasts={userData.toasts} setToasts={userData.setToasts} />
      <div className="flex">
        <aside className="w-20 lg:w-24 bg-white dark:bg-gray-800 h-screen flex flex-col justify-between shadow-lg border-r border-gray-200 dark:border-gray-700">
          <div>
            <div className="p-4 flex justify-center items-center">
                <button
                  onClick={() => setActivePage('profile')}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                  title="Open Profile"
                  aria-label="Open Profile"
                >
                  <ProfileBadge avatarOnly size="md" className="w-12 h-12" />
                </button>
            </div>
            <nav className="flex flex-col items-center mt-4">
              <NavItem icon={<HomeIcon />} label="Home" isActive={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
              <NavItem icon={<TasksIcon />} label="Tasks" isActive={activePage === 'tasks'} onClick={() => setActivePage('tasks')} />
              <NavItem icon={<ChatIcon />} label="AI Chat" isActive={activePage === 'chat'} onClick={() => setActivePage('chat')} />
              <NavItem icon={<UsersIcon />} label="Study" isActive={activePage === 'community'} onClick={() => setActivePage('community')} />
              <NavItem icon={<NotesIcon />} label="Notes" isActive={activePage === 'notes'} onClick={() => setActivePage('notes')} />
              <NavItem icon={<ChartBarIcon />} label="Reports" isActive={activePage === 'reports'} onClick={() => setActivePage('reports')} />
            </nav>
          </div>
          <div className="flex flex-col items-center mb-4 space-y-2 px-2">
             <NavItem icon={<ProfileIcon />} label="Profile" isActive={activePage === 'profile'} onClick={() => setActivePage('profile')} />
             <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors duration-200 
                ${theme === 'dark' 
                    ? 'bg-black text-white hover:bg-gray-900 border border-gray-600' 
                    : 'bg-white text-black hover:bg-gray-200 border border-gray-300'
                }`}
            >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                <span className="text-xs font-bold mt-1">{theme === 'dark' ? 'Light' : 'Dark'}</span>
             </button>
             <NavItem icon={<PowerIcon />} label="Logout" isActive={false} onClick={onLogout} />
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;