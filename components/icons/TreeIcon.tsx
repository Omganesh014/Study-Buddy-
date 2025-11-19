
import React from 'react';

interface TreeIconProps {
  growth: number; // Percentage from 0 to 100
}

const TreeIcon: React.FC<TreeIconProps> = ({ growth }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (growth / 100) * circumference;

  const saplingOpacity = Math.min(1, Math.max(0.2, growth / 50));
  const midTreeOpacity = Math.min(1, Math.max(0, (growth - 30) / 50));
  const fullTreeOpacity = Math.min(1, Math.max(0, (growth - 60) / 40));

  return (
    <div className="relative w-[150px] h-[150px] flex items-center justify-center">
      <svg className="absolute inset-0" width="150" height="150" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-current text-gray-700"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {/* Tree in the middle that grows */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        className="relative z-10"
      >
        <g className="transition-opacity duration-500" style={{ opacity: saplingOpacity }}>
          {/* Trunk */}
          <path d="M48 60 V 90 H 52 V 60 Z" fill="#8B4513" />
          {/* Sapling Leaves */}
          <circle cx="50" cy="50" r="15" fill="#6ee7b7" />
        </g>
        <g className="transition-opacity duration-500" style={{ opacity: midTreeOpacity }}>
          <circle cx="35" cy="40" r="15" fill="#34d399" />
          <circle cx="65" cy="40" r="15" fill="#34d399" />
        </g>
        <g className="transition-opacity duration-500" style={{ opacity: fullTreeOpacity }}>
          <circle cx="50" cy="25" r="18" fill="#10b981" />
        </g>
      </svg>
    </div>
  );
};

export default TreeIcon;
