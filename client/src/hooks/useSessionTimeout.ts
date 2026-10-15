import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface SessionTimeoutOptions {
  timeoutMinutes?: number; // total inactivity before logout
  warningMinutes?: number; // minutes before logout to show warning
}

export const useSessionTimeout = ({
  timeoutMinutes = 30,
  warningMinutes = 2,
}: SessionTimeoutOptions = {}) => {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(warningMinutes * 60);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setRemainingSeconds(warningMinutes * 60);
    }
  }, [showWarning, warningMinutes]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      // Debounce activity recording
      if (Date.now() - lastActivityRef.current > 1000) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity));

    const checkInterval = 1000; // 1s check
    const totalMs = timeoutMinutes * 60 * 1000;
    const warnMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= totalMs) {
        // Auto logout
        setShowWarning(false);
        logout();
      } else if (elapsed >= warnMs) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.floor((totalMs - elapsed) / 1000));
        setRemainingSeconds(remaining);
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, checkInterval);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, timeoutMinutes, warningMinutes, showWarning, logout]);

  return {
    showWarning,
    remainingSeconds,
    resetActivity,
  };
};
