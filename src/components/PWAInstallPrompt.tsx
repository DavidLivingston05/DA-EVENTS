'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  });
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIOS && !isStandalone) {
      const hasDismissed = localStorage.getItem('pwa_ios_dismissed');
      if (!hasDismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Install Prompt Banner */}
      {showBanner && (
        <div className="pwa-banner">
          <div className="pwa-banner-content">
            <div className="pwa-icon">⛪</div>
            <div className="pwa-text">
              <div className="pwa-title">Install DA-ROS App</div>
              <div className="pwa-sub">Add to home screen for faster access & offline updates!</div>
            </div>
            <div className="pwa-actions">
              <button onClick={handleInstallClick} className="pwa-install-btn">
                Install Now
              </button>
              <button onClick={() => setShowBanner(false)} className="pwa-close-btn" aria-label="Close">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar Install Button (Always visible on supporting browsers or iOS if not installed) */}
      {(isInstallable || isIOS) && !showBanner && (
        <button onClick={handleInstallClick} className="pwa-top-install-btn" title="Install App">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Install App</span>
        </button>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="pwa-ios-modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-header">
              <h3>Install DA-ROS on iPhone / iPad</h3>
              <button className="pwa-close-btn" onClick={() => setShowIOSModal(false)}>✕</button>
            </div>
            <ol className="pwa-ios-steps">
              <li>Tap the <strong>Share</strong> button in Safari&apos;s bottom toolbar (<span style={{ fontSize: '18px' }}>⎋</span>).</li>
              <li>Scroll down and select <strong>Add to Home Screen</strong> (<span style={{ fontSize: '18px' }}>➕</span>).</li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
            <button className="pwa-install-btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => setShowIOSModal(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pwa-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: calc(100% - 32px);
          max-width: 480px;
          background: rgba(18, 18, 22, 0.94);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(220, 20, 60, 0.35);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(220, 20, 60, 0.2);
          animation: slideUpPwa 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUpPwa {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pwa-icon {
          font-size: 26px;
          background: rgba(220, 20, 60, 0.15);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }

        .pwa-text {
          flex: 1;
          min-width: 0;
        }

        .pwa-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }

        .pwa-sub {
          font-size: 12px;
          color: #a1a1aa;
          margin-top: 2px;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pwa-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pwa-install-btn {
          background: linear-gradient(135deg, #dc143c 0%, #b01030 100%);
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 980px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(220, 20, 60, 0.4);
          white-space: nowrap;
        }

        .pwa-install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(220, 20, 60, 0.6);
        }

        .pwa-close-btn {
          background: transparent;
          border: none;
          color: #71717a;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: color 0.2s;
        }

        .pwa-close-btn:hover {
          color: #ffffff;
        }

        .pwa-top-install-btn {
          position: fixed;
          top: 12px;
          right: 20px;
          z-index: 999;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(220, 20, 60, 0.15);
          border: 1px solid rgba(220, 20, 60, 0.4);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
        }

        .pwa-top-install-btn:hover {
          background: #dc143c;
          box-shadow: 0 0 15px rgba(220, 20, 60, 0.5);
        }

        .pwa-ios-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .pwa-ios-modal {
          background: #141418;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          color: #ffffff;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
        }

        .pwa-ios-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .pwa-ios-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .pwa-ios-steps {
          margin: 0;
          padding-left: 20px;
          color: #d4d4d8;
          font-size: 14px;
          line-height: 1.8;
        }
      `}</style>
    </>
  );
}
