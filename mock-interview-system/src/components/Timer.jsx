import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import '../styles/Timer.css';

const Timer = ({ initialTime, onTimeUp, onTick }) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (onTick) onTick(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, onTimeUp, onTick]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeClass = () => {
    const percentRemaining = (timeRemaining / initialTime) * 100;
    if (percentRemaining > 50) return 'time-good';
    if (percentRemaining > 25) return 'time-warning';
    return 'time-critical';
  };

  return (
    <div className={`timer ${getTimeClass()}`}>
      <Clock size={20} />
      <span className="time-display">{formatTime(timeRemaining)}</span>
    </div>
  );
};

export default Timer;
