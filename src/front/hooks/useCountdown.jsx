import { useState, useEffect } from "react";

export const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isMatchStarted, setIsMatchStarted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const matchTime = new Date(targetDate);
      const difference = matchTime - now;

      if (difference <= 0) {
        setTimeLeft("En Juego / Pendiente");
        setIsMatchStarted(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor((difference / (1000 * 60 * 60)));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return { timeLeft, isMatchStarted };
};