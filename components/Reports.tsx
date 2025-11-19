import React from 'react';
import type { DailyLog } from '../types';
import StatCard from './StatCard';

interface ReportsProps {
    dailyLog: DailyLog[];
}

const Chart: React.FC<{data: {label: string, value: number}[], max: number, color: string, title: string}> = ({data, max, color, title}) => (
    <div className="h-64 flex justify-around items-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 mt-4">
        {data.map(({ label, value }) => {
            const heightPercentage = max > 0 ? (value / max) * 100 : 0;
            return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2" title={`${title}: ${value}`}>
                    <div className="w-full h-full flex items-end">
                        <div 
                            className={`w-full rounded-t-lg hover:opacity-80 transition-all ${color}`}
                            style={{ height: `${heightPercentage}%`}}
                        ></div>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
                </div>
            )
        })}
    </div>
);

const Reports: React.FC<ReportsProps> = ({ dailyLog }) => {
    // Get data for the last 7 days
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        const log = dailyLog.find(l => l.date === dateString);
        return {
            date: d,
            focusTime: log?.focusTime || 0,
            tasksCompleted: log?.tasksCompleted || 0,
            distractionsDetected: log?.distractionsDetected || 0,
        };
    }).reverse();

    const totalFocusLastWeek = last7DaysData.reduce((sum, day) => sum + day.focusTime, 0);
    const totalTasksLastWeek = last7DaysData.reduce((sum, day) => sum + day.tasksCompleted, 0);
    const totalDistractions = last7DaysData.reduce((sum, day) => sum + day.distractionsDetected, 0);
    const avgFocus = totalFocusLastWeek / 7;

    const maxFocusTime = Math.max(...last7DaysData.map(d => d.focusTime), 60);
    const maxTasks = Math.max(...last7DaysData.map(d => d.tasksCompleted), 5);
    const maxDistractions = Math.max(...last7DaysData.map(d => d.distractionsDetected), 5);

    const chartData = (key: keyof typeof last7DaysData[0]) => {
        return last7DaysData.map(d => ({
            label: d.date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: typeof d[key] === 'number' ? (d[key] as number) : 0,
        }));
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold">Weekly Report</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">An overview of your productivity this past week.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Focus (7 Days)" value={`${Math.floor(totalFocusLastWeek / 60)}h ${totalFocusLastWeek % 60}m`} />
                <StatCard title="Tasks Completed (7 Days)" value={totalTasksLastWeek.toString()} />
                <StatCard title="Daily Average Focus" value={`${Math.floor(avgFocus / 60)}h ${Math.round(avgFocus % 60)}m`} />
                <StatCard title="Distractions Detected" value={totalDistractions.toString()} />
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold">Focus Time Distribution (minutes)</h3>
                <Chart data={chartData('focusTime')} max={maxFocusTime} color="bg-violet-400" title="Minutes" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold">Tasks Completed</h3>
                     <Chart data={chartData('tasksCompleted')} max={maxTasks} color="bg-green-400" title="Tasks" />
                </div>
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold">Distractions Detected</h3>
                     <Chart data={chartData('distractionsDetected')} max={maxDistractions} color="bg-amber-400" title="Distractions" />
                </div>
            </div>
        </div>
    );
};

export default Reports;