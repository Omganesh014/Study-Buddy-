import React from 'react';
import Reports from '../components/Reports';
import type { DailyLog } from '../types';

interface ReportsPageProps {
  dailyLog: DailyLog[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ dailyLog }) => {
  return <Reports dailyLog={dailyLog} />;
};

export default ReportsPage;