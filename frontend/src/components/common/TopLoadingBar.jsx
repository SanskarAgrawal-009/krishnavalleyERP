import React, { useState, useEffect } from 'react';
import { subscribeToApiLoading } from '../../services/api.js';

/**
 * TopLoadingBar - Ultra-sleek, GPU-accelerated top progress indicator
 * that animates whenever any API request (fetch, upload, edit) is executing.
 */
export const TopLoadingBar = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval = null;

    const unsubscribe = subscribeToApiLoading((isLoading) => {
      setLoading(isLoading);

      if (isLoading) {
        setVisible(true);
        setProgress(25);

        // Smooth incremental progress while in flight
        interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 88) return prev;
            return prev + Math.floor(Math.random() * 8 + 3);
          });
        }, 200);
      } else {
        if (interval) clearInterval(interval);
        setProgress(100);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3.5px',
        zIndex: 99999,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent'
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa, #93c5fd)',
          backgroundSize: '200% 100%',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 4px rgba(96, 165, 250, 0.6)',
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.25s ease 0.15s' : 'width 0.35s ease-out',
          opacity: progress === 100 ? 0 : 1,
          animation: 'topBarGlow 1.5s linear infinite'
        }}
      />
    </div>
  );
};
