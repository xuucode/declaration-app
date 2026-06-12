import { useEffect, useState } from 'react';

export const useDelayedFlag = (active: boolean, delayMs = 1000): boolean => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [active, delayMs]);

  return visible;
};
