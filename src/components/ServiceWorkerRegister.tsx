'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegister() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnlineToast, setShowBackOnlineToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial offline state check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnlineToast(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnlineToast(true);
      setTimeout(() => setShowBackOnlineToast(false), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 2. Service Worker Registration & Update Detection
    if ('serviceWorker' in navigator) {
      const registerAndCheckUpdates = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // If there's an update already waiting in the background
            if (registration.waiting && navigator.serviceWorker.controller) {
              setWaitingWorker(registration.waiting);
              setShowUpdatePrompt(true);
            }

            // Immediately check for updates on network
            registration.update().catch(() => {});

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

            // Re-check for updates whenever user returns to the app from background
            const handleVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                registration.update().catch(() => {});
              }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
          })
          .catch((err) => {
            console.warn('ServiceWorker registration warning:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerAndCheckUpdates();
      } else {
        window.addEventListener('load', registerAndCheckUpdates);
      }
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleReloadUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
    window.location.reload();
  };

  return (
    <>
      {/* Live Offline Indicator Pill for Android & Mobile */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10002,
          background: 'rgba(234, 179, 8, 0.95)',
          color: '#1a1200',
          padding: '6px 16px',
          borderRadius: '980px',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease',
          letterSpacing: '0.02em'
        }}>
          <span>📡</span>
          <span>Offline Mode — Showing Cached Passes & Schedule</span>
        </div>
      )}

      {/* Back Online Toast */}
      {showBackOnlineToast && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10002,
          background: 'rgba(34, 197, 94, 0.95)',
          color: '#ffffff',
          padding: '6px 16px',
          borderRadius: '980px',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>✓</span>
          <span>Back Online! Synchronized</span>
        </div>
      )}

      {/* Service Worker Update Prompt Banner */}
      {showUpdatePrompt && (
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
      )}
    </>
  );
}
