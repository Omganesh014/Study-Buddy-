import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

export default StatCard;