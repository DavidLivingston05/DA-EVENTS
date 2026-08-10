'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error Boundary caught an exception:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      color: '#f4f8fb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: 'rgba(220, 20, 60, 0.1)',
        border: '1px solid rgba(220, 20, 60, 0.3)',
        borderRadius: '20px',
        padding: '36px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛪</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px 0', color: '#fff' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#86868b', fontSize: '14px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          An unexpected error occurred while loading this page. Don't worry, your data is safe.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: 'linear-gradient(135deg, #dc143c 0%, #b01030 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '980px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(220, 20, 60, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          Reload & Try Again
        </button>
      </div>
    </div>
  );
}
