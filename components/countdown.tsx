"use client";
import { useEffect, useState } from "react";

export const Countdown = () => {
  const targetDate = new Date("2024-11-14T22:00:00").getTime();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    function calculateTimeLeft() {
      const difference = targetDate - new Date().getTime();
      return Math.max(0, difference);
    }

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatCountdown = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  if (timeLeft === null) {
    return <div>Loading...</div>;
  }

  return <div>{formatCountdown(timeLeft)}</div>;
};
