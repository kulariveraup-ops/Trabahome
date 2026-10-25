import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

export const useMinuteTicker = (intervalMs = DEFAULT_INTERVAL_MS) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, safeInterval);

    return () => window.clearInterval(timer);
  }, [intervalMs]);
};
