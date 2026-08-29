"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { translations, Language, Theme } from '@/lib/translations';
import styles from './page.module.css';

function LoginForm() {
  useScrollReveal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '';

  const [mode, setMode] = useState<'login' | 'admin'>('login');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme-pref') as Theme;
      if (savedTheme) setTheme(savedTheme);
      const savedLang = localStorage.getItem('lang-pref') as Language;
      if (savedLang) setLang(savedLang);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') localStorage.setItem('theme-pref', next);
  };

  const toggleLang = () => {
    const next = lang === 'en' ? 'ta' : 'en';
    setLang(next);
    if (typeof window !== 'undefined') localStorage.setItem('lang-pref', next);
  };

  const t = translations[lang];

  useEffect(() => {
    if (searchParams.get('mode') === 'admin') {
      setMode('admin');
    }

    // Auto-redirect if already authenticated
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'admin') {
            router.push('/admin');
          } else if (data.user) {
            router.push(redirectTarget || '/home');
          }
        }
      } catch {
        // Not authenticated
      }
    };
    checkSession();
  }, [router, searchParams, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!/^\d{10}$/.test(contactNumber.trim())) {
        setError('Contact number must be exactly 10 digits.');
        return;
      }
    }

    if (mode === 'admin' && !password.trim()) {
      setError('Admin passcode is required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode, 
          name: name.trim(), 
          contactNumber: contactNumber.trim(), 
          password 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check your details.');
      }

      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }

      if (data.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = redirectTarget || '/home';
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${theme === 'light' ? styles.containerLight : ''}`}>
      {/* Top Bar Switchers */}
      <div className={styles.topBar}>
        <button
          onClick={toggleTheme}
          className={styles.pillButton}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button
          onClick={toggleLang}
          className={styles.pillButton}
        >
          {lang === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </div>

      {/* Centered Clean Login Card */}
      <div className={styles.centerContainer}>
        <div className={`reveal ${styles.card}`}>
          <div className={styles.churchBadge}>
            <span className={styles.churchIcon}>⛪</span>
            <span className={styles.churchName}>{t.appName}</span>
          </div>

          <h1 className={styles.title}>
            {mode === 'login' ? (lang === 'ta' ? 'உள்நுழைக' : 'Sign In') : (lang === 'ta' ? 'நிர்வாக அணுகல்' : 'Admin Access')}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'login' 
              ? (lang === 'ta' 
                  ? 'நிகழ்வுகளைப் பார்க்கவும் பதிவு செய்யவும் உங்கள் பெயர் & தொலைபேசி எண்ணை உள்ளிடவும்.'
                  : 'Enter your name & 10-digit mobile number to view upcoming church events & register.')
              : 'Enter admin passcode for church management.'}
          </p>

          <div className={styles.segmentedControl}>
            <div 
              className={styles.segmentIndicator} 
              style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button 
              type="button"
              className={`${styles.segmentButton} ${mode === 'login' ? styles.activeSegment : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              👤 {t.memberLogin}
            </button>
            <button 
              type="button"
              className={`${styles.segmentButton} ${mode === 'admin' ? styles.activeSegment : ''}`}
              onClick={() => { setMode('admin'); setError(''); }}
            >
              🔑 {t.adminAccess}
            </button>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'login' ? (
              <>
                <div className={styles.inputWrapper}>
                  <label className={styles.inputLabel}>
                    👤 {t.fullName}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name (e.g. John Doe)"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className={styles.inputWrapper}>
                  <label className={styles.inputLabel}>
                    📱 10-Digit Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className={styles.input}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    autoComplete="tel"
                    required
                  />
                </div>
              </>
            ) : (
              <div className={styles.inputWrapper}>
                <label className={styles.inputLabel}>
                  🔑 {t.adminPasscode}
                </label>
                <input
                  type="password"
                  placeholder="Enter admin passcode"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                mode === 'login' ? 'Sign In & View Events →' : 'Sign In as Admin →'
              )}
            </button>
          </form>

          <div className={styles.footerNote}>
            <span>🔒 Secure & instant access for church members & guests</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070709', color: '#fff' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#dc143c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
