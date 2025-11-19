import React from 'react';
import Profile from '../components/Profile';
import type { User } from '../types';

interface ProfilePageProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  totalFocusTime: number;
  tasksCompletedCount: number;
  points: number;
  streak: number;
}

const ProfilePage: React.FC<ProfilePageProps> = (props) => {
  return <Profile user={props.user} setUser={props.setUser} focusTime={props.totalFocusTime} tasksCompleted={props.tasksCompletedCount} points={props.points} streak={props.streak} />;
};

export default ProfilePage;