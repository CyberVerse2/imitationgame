'use client';

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  duration?: number;
  isActive?: boolean;
  onComplete?: () => void;
  size?: number;
}

export default function Timer({ 
  duration = 45, 
  isActive = false, 
  onComplete,
  size = 80 
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / duration) * circumference;
  
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, onComplete]);
  
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration);
    }
  }, [isActive, duration]);
  
  const getColorClass = () => {
    const percentage = timeLeft / duration;
    if (percentage <= 0.2) return 'danger';
    if (percentage <= 0.4) return 'warning';
    return '';
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : secs;
  };

  const strokeColor = 
    getColorClass() === 'danger' ? '#ff4444' :
    getColorClass() === 'warning' ? '#ffaa00' :
    'var(--neon-cyan)';

  return (
    <div className="timer-ring" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: size > 60 ? '1.25rem' : '1rem',
        fontWeight: 'bold',
        color: strokeColor,
      }}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
