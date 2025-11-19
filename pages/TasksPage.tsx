import React from 'react';
import TaskManager from '../components/TaskManager';
import type { Task } from '../types';

interface TasksPageProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  handleTaskComplete: () => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ tasks, setTasks, handleTaskComplete }) => {
  return <TaskManager tasks={tasks} setTasks={setTasks} onTaskComplete={handleTaskComplete} />;
};

export default TasksPage;