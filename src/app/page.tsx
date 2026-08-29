"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        if (!token) {
          router.replace('/login');
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'admin') {
            router.replace('/admin');
          } else if (data.user) {
            router.replace('/home');
          } else {
            router.replace('/login');
          }
        } else {
          localStorage.removeItem('auth-token');
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#070709',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: '#dc143c',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
