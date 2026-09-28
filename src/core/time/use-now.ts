import { useEffect, useState } from 'react';

/** Current time, refreshed periodically (minimum notice depends on it). Not exported from the index: keeps React out of domain imports. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
