'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegister() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('DA-ROS ServiceWorker registered with scope: ', registration.scope);

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setWaitingWorker(newWorker);
                    setShowUpdatePrompt(true);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('DA-ROS ServiceWorker registration failed: ', err);
          });
      });
    }
  }, []);

  const handleReloadUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
    window.location.reload();
  };

  if (!showUpdatePrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10001,
      background: 'rgba(20, 20, 26, 0.95)',
      border: '1px solid rgba(220, 20, 60, 0.4)',
      color: '#fff',
      padding: '10px 18px',
      borderRadius: '980px',
      fontSize: '13px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(220, 20, 60, 0.3)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)'
    }}>
      <span>🚀 New App Version Available!</span>
      <button
        onClick={handleReloadUpdate}
        style={{
          background: 'var(--crimson, #dc143c)',
          color: '#fff',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        Reload Now
      </button>
      <button
        onClick={() => setShowUpdatePrompt(false)}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
      >
        ✕
      </button>
    </div>
  );
}
