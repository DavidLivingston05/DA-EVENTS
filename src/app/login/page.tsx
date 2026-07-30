"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './page.module.css';

export default function LoginPage() {
  useScrollReveal();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'admin'>('login');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
      setMode('admin');
    }

    // Auto-redirect if already authenticated
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'admin') {
            router.push('/admin');
          } else if (data.user) {
            router.push('/home');
          }
        }
      } catch (err) {
        // Not authenticated, stay on login page
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login' && !/^\d{10}$/.test(contactNumber)) {
      setError('Contact number must be exactly 10 digits.');
      return;
    }

    if (mode === 'login' && !name.trim()) {
      setError('Name is required to log in.');
      return;
    }

    if (mode === 'admin' && !password.trim()) {
      setError('Admin password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, name, contactNumber, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Success
      if (data.role === 'admin') {
        router.push('/admin'); // Assuming admin has a separate dashboard
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (newMode: 'login' | 'admin') => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className={styles.container}>
      {/* Background Orbs */}
      <div className={styles.orbTopRight}></div>
      <div className={styles.orbBottomLeft}></div>
      <div className={styles.orbCenterRight}></div>

      {/* Left Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <h1 className={styles.logoText}>DA-ROS</h1>
          <p className={styles.tagline}>Church events, beautifully managed.</p>
          
          <div className={styles.features}>
            <div className={`reveal-left delay-1 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4M8 12h8"/></svg>
              </div>
              <span className={styles.featureText}>Discover Events</span>
            </div>
            <div className={`reveal-left delay-2 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <span className={styles.featureText}>Register Instantly</span>
            </div>
            <div className={`reveal-left delay-3 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className={styles.featureText}>Stay Connected</span>
            </div>
          </div>
        </div>
        <div className={styles.bottomGlow}></div>
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={`reveal ${styles.card}`}>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Sign in to continue to DA-ROS</p>

          <div className={styles.segmentedControl}>
            <div 
              className={styles.segmentIndicator} 
              style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button 
              type="button"
              className={`${styles.segmentButton} ${mode === 'login' ? styles.activeSegment : ''}`}
              onClick={() => handleModeChange('login')}
            >
              Member Login
            </button>
            <button 
              type="button"
              className={`${styles.segmentButton} ${mode === 'admin' ? styles.activeSegment : ''}`}
              onClick={() => handleModeChange('admin')}
            >
              Admin Access
            </button>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'login' && (
              <>
                <div className={styles.inputWrapper}>
                  <label className={`${styles.floatingLabel} ${(focusedInput === 'name' || name) ? styles.floating : ''}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    required
                  />
                </div>
                <div className={styles.inputWrapper}>
                  <label className={`${styles.floatingLabel} ${(focusedInput === 'contact' || contactNumber) ? styles.floating : ''}`}>
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    onFocus={() => setFocusedInput('contact')}
                    onBlur={() => setFocusedInput(null)}
                    maxLength={10}
                    required
                  />
                </div>
              </>
            )}

            {mode === 'admin' && (
              <div className={styles.inputWrapper}>
                <label className={`${styles.floatingLabel} ${(focusedInput === 'password' || password) ? styles.floating : ''}`}>
                  Admin Password
                </label>
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  required
                />
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? <div className={styles.spinner}></div> : 'Continue'}
            </button>
          </form>
          
          <div className={styles.bottomToggle}>
            <button 
              type="button" 
              className={styles.adminToggleLink}
              onClick={() => handleModeChange(mode === 'login' ? 'admin' : 'login')}
            >
              {mode === 'login' ? 'Are you an administrator?' : 'Return to Member Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
