'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to handle Android hardware / swipe gesture Back navigation for modals.
 * Allows Android users to dismiss modals natively with the back button
 * without exiting the current screen or web app.
 */
export function useAndroidBackClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isPushed = true;
    const modalKey = `ros_modal_${Date.now()}`;
    window.history.pushState({ modalOpen: modalKey }, '');

    const handlePopState = () => {
      isPushed = false;
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      if (isPushed && window.history.state?.modalOpen === modalKey) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
