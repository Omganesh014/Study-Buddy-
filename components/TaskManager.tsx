
import React, { useState, useCallback } from 'react';
import type { Task } from '../types';
import { getPrioritizedTasks } from '../services/geminiService';
import { SparklesIcon } from '../constants';

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onTaskComplete: () => void;
}

const TaskItem: React.FC<{ task: Task; onToggle: (id: number) => void; onDelete: (id: number) => void; }> = ({ task, onToggle, onDelete }) => (
    <div className={`flex items-center p-3 rounded-lg transition-all duration-300 ${task.completed ? 'bg-green-500/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
      <input 
        type="checkbox" 
        checked={task.completed} 
        onChange={() => onToggle(task.id)} 
        className="form-checkbox h-5 w-5 rounded text-violet-500 bg-transparent border-gray-400 focus:ring-violet-500"
      />
      <div className="ml-4 flex-grow">
        <p className={`font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{task.text}</p>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 mt-1">
            <span>Subject: <span className="font-semibold text-violet-600 dark:text-violet-300">{task.subject}</span></span>
            <span>Due: <span className="font-semibold text-amber-600 dark:text-amber-300">{task.deadline}</span></span>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="text-gray-400 hover:text-red-500 ml-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </div>
  );

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks, onTaskComplete }) => {
  const [newTask, setNewTask] = useState({ text: '', subject: '', deadline: ''});
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.text.trim()) {
      const task: Task = {
        id: Date.now(),
        ...newTask,
        completed: false
      };
      setTasks([...tasks, task]);
      setNewTask({ text: '', subject: '', deadline: ''});
    }
  };

  const handleToggleTask = useCallback((id: number) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
        onTaskComplete();
    }
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  }, [tasks, setTasks, onTaskComplete]);

  const handleDeleteTask = useCallback((id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  }, [tasks, setTasks]);

  const handlePrioritize = async () => {
    setIsLoading(true);
    try {
        const prioritized = await getPrioritizedTasks(tasks.filter(t => !t.completed));
        const completedTasks = tasks.filter(t => t.completed);
        setTasks([...prioritized, ...completedTasks]);
    } catch (error) {
        console.error("Failed to prioritize tasks:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Your Tasks</h2>
                <button 
                    onClick={handlePrioritize}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-transform transform hover:scale-105 shadow-lg shadow-violet-600/50 disabled:bg-violet-800 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Prioritizing...' : 'AI Prioritize'}
                </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {tasks.length > 0 ? tasks.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                )) : (
                     <p className="text-gray-500 dark:text-gray-400 text-center py-10">No tasks yet. Add one to get started!</p>
                )}
            </div>
        </div>
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <input type="text" value={newTask.text} onChange={(e) => setNewTask({...newTask, text: e.target.value})} placeholder="Task description" className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus:ring-violet-500 focus:border-violet-500" />
                    <input type="text" value={newTask.subject} onChange={(e) => setNewTask({...newTask, subject: e.target.value})} placeholder="Subject" className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus:ring-violet-500 focus:border-violet-500" />
                    <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus:ring-violet-500 focus:border-violet-500" />
                    <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">Add Task</button>
                </form>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg text-center">
                <h3 className="text-xl font-bold mb-4">Overall Progress</h3>
                <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="text-gray-200 dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                        <path className="text-violet-500" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">{Math.round(progress)}%</div>
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-300">{completedTasks} of {totalTasks} tasks completed.</p>
            </div>
        </div>
    </div>
  );
};

export default TaskManager;