import { useCallback, useEffect, useState } from 'react';

/** Whole seconds remaining; `start()` restarts it. Used for the resend cooldown. */
export function useCountdown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + initialSeconds * 1000);
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const start = useCallback((seconds: number) => setEndsAt(Date.now() + seconds * 1000), []);
  return { remaining, start };
}
