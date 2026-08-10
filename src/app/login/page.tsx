"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { translations, Language, Theme } from '@/lib/translations';
import styles from './page.module.css';

export default function LoginPage() {
  useScrollReveal();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'admin'>('login');
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
      setMode('admin');
    }

    // Auto-redirect if already authenticated
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/me', { headers });
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
      setError('Name is required.');
      return;
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
          name, 
          contactNumber, 
          password 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Save token in localStorage as persistent backup
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }

      // Success
      if (data.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/home';
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
    <div className={`${styles.container} ${theme === 'light' ? styles.containerLight : ''}`}>
      {/* Theme and Lang Toggles */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 10 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: theme === 'light' ? '#f1f5f9' : '#1c1c1e',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #2c2c2e',
            color: theme === 'light' ? '#0f172a' : '#fff',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button
          onClick={toggleLang}
          style={{
            background: theme === 'light' ? '#f1f5f9' : '#1c1c1e',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #2c2c2e',
            color: theme === 'light' ? '#0f172a' : '#fff',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {lang === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </div>

      {/* Background Orbs */}
      <div className={styles.orbTopRight}></div>
      <div className={styles.orbBottomLeft}></div>
      <div className={styles.orbCenterRight}></div>

      {/* Left Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <h1 className={styles.logoText}>{t.appName}</h1>
          <p className={styles.tagline}>{t.loginTagline}</p>
          
          <div className={styles.features}>
            <div className={`reveal-left delay-1 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4M8 12h8"/></svg>
              </div>
              <span className={styles.featureText}>{t.discoverEvents}</span>
            </div>
            <div className={`reveal-left delay-2 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <span className={styles.featureText}>{t.registerInstantly}</span>
            </div>
            <div className={`reveal-left delay-3 ${styles.featureRow}`}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className={styles.featureText}>{t.stayConnected}</span>
            </div>
          </div>
        </div>
        <div className={styles.bottomGlow}></div>
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={`reveal ${styles.card}`}>
          <h2 className={styles.title}>{t.welcomeBack}</h2>
          <p className={styles.subtitle}>{t.signInToContinue}</p>

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
              {t.memberLogin}
            </button>
            <button 
              type="button"
              className={`${styles.segmentButton} ${mode === 'admin' ? styles.activeSegment : ''}`}
              onClick={() => handleModeChange('admin')}
            >
              {t.adminAccess}
            </button>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'login' && (
              <>
                <div className={styles.inputWrapper}>
                  <label className={`${styles.floatingLabel} ${(focusedInput === 'name' || name) ? styles.floating : ''}`}>
                    {t.fullName}
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
                    {t.contactNumber}
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
                  {t.adminPasscode}
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
              {isLoading ? <div className={styles.spinner}></div> : t.continueBtn}
            </button>
          </form>
          
          <div className={styles.bottomToggle}>
            <button 
              type="button" 
              className={styles.adminToggleLink}
              onClick={() => handleModeChange(mode === 'login' ? 'admin' : 'login')}
            >
              {mode === 'login' ? t.areYouAdmin : t.memberLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
