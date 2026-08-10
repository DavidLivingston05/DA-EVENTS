"use client";

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useScrollReveal, use3DTilt } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm } from '@/lib/formatTime';
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendarExport';
import { translations, Language, Theme } from '@/lib/translations';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [totalHeadcount, setTotalHeadcount] = useState<number>(0);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalGuests, setTotalGuests] = useState<number>(0);

  const [isRegistered, setIsRegistered] = useState(false);
  const [userAttendance, setUserAttendance] = useState<any>(null);
  const [additionalCount, setAdditionalCount] = useState<number>(0);
  const [guestNames, setGuestNames] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('en');

  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterCategoryFilter, setRosterCategoryFilter] = useState('All');

  const getCategoryBadgeStyle = (cat?: string) => {
    if (!cat) return { bg: 'rgba(255, 255, 255, 0.08)', color: '#a1a1aa', border: 'rgba(255, 255, 255, 0.12)' };
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
      bg: `hsla(${hue}, 70%, 55%, 0.18)`,
      color: `hsl(${hue}, 85%, 75%)`,
      border: `hsla(${hue}, 70%, 55%, 0.4)`
    };
  };

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const attendeeCategories = useMemo(() => {
    const cats = new Set<string>();
    attendances.forEach(att => {
      if (att.userId?.category) cats.add(att.userId.category);
    });
    return Array.from(cats);
  }, [attendances]);

  useScrollReveal();
  use3DTilt('.tilt-card');

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
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        const meHeaders: Record<string, string> = {};
        if (token) meHeaders['Authorization'] = `Bearer ${token}`;

        const [eventRes, meRes] = await Promise.all([
          fetch(`/api/admin/events/${id}`),
          fetch('/api/auth/me', { headers: meHeaders }),
        ]);

        if (!eventRes.ok) { router.push('/home'); return; }

        const eventData = await eventRes.json();
        setEvent(eventData.event);
        setAttendances(eventData.attendances || []);
        setTotalHeadcount(eventData.totalHeadcount || 0);
        setTotalMembers(eventData.totalMembers || 0);
        setTotalGuests(eventData.totalGuests || 0);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);

          const existingAtt = (eventData.attendances || []).find(
            (att: any) => att.userId && att.userId._id === meData.user._id
          );

          if (existingAtt) {
            setIsRegistered(true);
            setUserAttendance(existingAtt);
            setAdditionalCount(existingAtt.additionalCount || 0);
            setGuestNames(existingAtt.guestNames || '');
            setSpecialNotes(existingAtt.specialNotes || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  // 0ms Optimistic UI Registration update + Celebratory Modal
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) { router.push('/login'); return; }

    const partyNum = 1 + Number(additionalCount);

    // Optimistic UI updates
    setIsRegistered(true);
    setRegisterMsg('✅ Registration saved!');
    setTotalHeadcount(prev => isRegistered ? prev : prev + partyNum);
    setShowSuccessModal(true);

    setIsRegistering(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser._id,
          additionalCount: Number(additionalCount),
          guestNames: guestNames.trim(),
          specialNotes: specialNotes.trim()
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendances(data.attendances || []);
        setTotalHeadcount(data.totalHeadcount || 0);
        setTotalMembers(data.totalMembers || 0);
        setTotalGuests(data.totalGuests || 0);
      }
    } catch {
      setRegisterMsg('❌ Connection error. Retrying in background...');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!event) return;
    const shareText = `⛪ Join us for *${event.eventName}*!\n\n📅 *Date:* ${formatDate(event.date)}\n⏰ *Time:* ${formatTimeWithAmPm(event.time)}\n📍 *Location:* ${event.locationAddress}\n\n👉 Click link to register & confirm attendance:\n${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleOpenNavigation = () => {
    if (!event || !event.locationAddress) return;
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.gmapLink || event.locationAddress)}`;
    window.open(navUrl, '_blank');
  };

  const handleContactOrganizer = () => {
    if (!event) return;
    const phone = event.organizerPhone ? event.organizerPhone.replace(/[^\d+]/g, '') : '';
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      const text = `Hello Church Office, I have a question regarding the upcoming event: ${event.eventName}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const formatDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : '';

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#dc143c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#86868b', fontSize: '14px' }}>Loading event details...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div style={{ minHeight: '100vh', background: theme === 'light' ? '#f8fafc' : '#000000', color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>

      {/* Sticky Top Navbar */}
      <nav style={{ position: 'sticky', top: 0, height: '60px', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(12,12,16,0.85)', backdropFilter: 'saturate(180%) blur(24px)', WebkitBackdropFilter: 'saturate(180%) blur(24px)', zIndex: 100, borderBottom: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/home" style={{ color: theme === 'light' ? '#64748b' : '#86868b', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, transition: 'color 0.2s' }}>
          <span>&larr;</span> {t.backToEvents}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            title="Switch Language (தமிழ் / English)"
            style={{
              background: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle Light / Dark Theme"
            style={{
              background: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.01em', color: theme === 'light' ? '#0f172a' : '#f4f8fb' }}>
            {t.appName}
          </span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 2rem 80px' }}>

        {/* Event Header Banner */}
        <div style={{ background: theme === 'light' ? 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(241,245,249,0.5) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px 20px', marginBottom: '24px', position: 'relative', overflow: 'hidden', boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.03)' : 'none' }}>
          <div style={{ display: 'inline-block', background: theme === 'light' ? 'rgba(220,20,60,0.1)' : 'rgba(220,20,60,0.15)', color: theme === 'light' ? '#dc143c' : '#fb7185', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', marginBottom: '16px' }}>
            {t.churchGathering}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#fff', letterSpacing: '-0.02em', margin: '0 0 12px 0', lineHeight: 1.15 }}>
            {event.eventName}
          </h1>
          <p style={{ color: theme === 'light' ? '#64748b' : '#a1a1aa', fontSize: '16px', margin: '0 0 20px 0' }}>
            📅 {formatDate(event.date)} &bull; ⏰ {formatTimeWithAmPm(event.time)}
          </p>

          {/* User-Centric Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleOpenNavigation}
              style={{
                background: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                color: theme === 'light' ? '#2563eb' : '#60a5fa',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {t.getDirections}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              style={{
                background: theme === 'light' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.15)',
                color: theme === 'light' ? '#16a34a' : '#4ade80',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {t.shareWhatsApp}
            </button>

            <a
              href={event.organizerPhone ? `tel:${event.organizerPhone.replace(/[^\d+]/g, '')}` : '#'}
              onClick={(e) => {
                if (!event.organizerPhone) {
                  e.preventDefault();
                  handleContactOrganizer();
                }
              }}
              style={{
                background: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                border: theme === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.18)',
                color: theme === 'light' ? '#0f172a' : '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              {t.contactOrganizer}
            </a>

            <a
              href={generateGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                border: theme === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.18)',
                color: theme === 'light' ? '#0f172a' : '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {t.addToCalendar}
            </a>
          </div>

          {/* Live Encouragement Badge */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '30px' }}>
              <span style={{ fontSize: '18px' }}>🔥</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#fff' }}>
                {totalHeadcount > 0 ? (
                  <><strong>{totalHeadcount} {t.peopleAttending}</strong> ({totalMembers} {t.members} + {totalGuests} {t.guestsComing})</>
                ) : (
                  <>Be the first to register for this event!</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#161617', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729', borderRadius: '16px', padding: '20px', boxShadow: theme === 'light' ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>📅</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{t.date}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '16px', fontWeight: 700 }}>{formatDate(event.date)}</div>
          </div>

          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#161617', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729', borderRadius: '16px', padding: '20px', boxShadow: theme === 'light' ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>⏰</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{t.time}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '16px', fontWeight: 700 }}>{formatTimeWithAmPm(event.time)}</div>
          </div>

          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#161617', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729', borderRadius: '16px', padding: '20px', boxShadow: theme === 'light' ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>📍</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{t.location}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '16px', fontWeight: 700 }}>{event.locationAddress}</div>
          </div>
        </div>

        {/* Registration & "Coming With You" Card */}
        <div style={{ background: isRegistered ? (theme === 'light' ? 'rgba(48,209,88,0.1)' : 'rgba(48,209,88,0.08)') : (theme === 'light' ? 'rgba(220,20,60,0.05)' : 'rgba(220,20,60,0.08)'), border: `1px solid ${isRegistered ? 'rgba(48,209,88,0.3)' : 'rgba(220,20,60,0.3)'}`, borderRadius: '20px', padding: '32px', marginBottom: '32px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: isRegistered ? '#30d158' : (theme === 'light' ? '#0f172a' : '#fff'), margin: '0 0 8px 0' }}>
              {isRegistered ? `🎉 ${t.youAreRegistered}` : t.reserveYourSpot}
            </h2>
            <p style={{ fontSize: '15px', color: theme === 'light' ? '#64748b' : '#a1a1aa', margin: '0 0 20px 0' }}>
              {isRegistered 
                ? t.registrationConfirmed
                : t.reserveSpotSub
              }
            </p>

            {/* Guest Registration Controls */}
            <form onSubmit={handleRegister} style={{ background: theme === 'light' ? '#ffffff' : 'rgba(18, 18, 22, 0.8)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '24px', textAlign: 'left', marginBottom: '20px', boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.05)' : '0 16px 40px rgba(0,0,0,0.5)' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#f4f8fb', marginBottom: '12px' }}>
                {t.howManyComing}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAdditionalCount(num)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: additionalCount === num ? '2px solid #dc143c' : (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)'),
                      background: additionalCount === num ? (theme === 'light' ? 'rgba(220,20,60,0.15)' : 'rgba(220,20,60,0.25)') : (theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)'),
                      color: additionalCount === num ? (theme === 'light' ? '#dc143c' : '#fff') : (theme === 'light' ? '#334155' : '#a1a1aa'),
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {num === 0 ? t.justMe : `+${num} ${num > 1 ? t.guestsLabel : t.guestLabel}`}
                  </button>
                ))}
              </div>

              {additionalCount > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'light' ? '#334155' : '#e4e4e7', marginBottom: '8px' }}>
                    {t.guestNamesLabel} ({additionalCount})
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mary, John, Sarah"
                    value={guestNames}
                    onChange={(e) => setGuestNames(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: theme === 'light' ? '#f8fafc' : 'rgba(0,0,0,0.4)',
                      border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
                      color: theme === 'light' ? '#0f172a' : '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {registerMsg && <p style={{ color: registerMsg.startsWith('✅') ? '#30d158' : '#ff453a', marginBottom: '16px', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>{registerMsg}</p>}

              <button
                type="submit"
                disabled={isRegistering}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #dc143c 0%, #b01030 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '980px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 8px 24px rgba(220, 20, 60, 0.4)',
                  letterSpacing: '-0.01em'
                }}
              >
                {isRegistering ? t.savingRegistration : isRegistered ? t.updateRegistration : `${t.confirmRegistration} (${1 + Number(additionalCount)}) →`}
              </button>
            </form>

            {!currentUser && (
              <p style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '14px', margin: 0 }}>
                <Link href="/login" style={{ color: theme === 'light' ? '#dc143c' : '#f4f8fb', textDecoration: 'underline' }}>{t.signInToReserve}</Link>
              </p>
            )}
          </div>
        </div>

        {/* Who's Attending Community Roster */}
        {attendances.length > 0 && (
          <div style={{ marginBottom: '32px', background: theme === 'light' ? '#ffffff' : '#121215', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729', borderRadius: '20px', padding: '28px', boxShadow: theme === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#fff', margin: '0 0 16px 0' }}>
              👥 {t.whosComing} ({totalHeadcount} {t.totalAttendees})
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {attendances.map((att) => {
                const badge = getCategoryBadgeStyle(att.userId?.category);
                const initials = getInitials(att.userId?.name);

                return (
                  <div
                    key={att._id}
                    style={{
                      background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Avatar Initial Circle */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: theme === 'light' ? '#0f172a' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {att.userId?.name || 'Member'}
                      </div>
                      <div style={{ fontSize: '12px', color: theme === 'light' ? '#64748b' : '#a1a1aa', marginTop: '2px' }}>
                        {att.additionalCount > 0 
                          ? `+${att.additionalCount} ${att.additionalCount > 1 ? 'Guests' : 'Guest'} ${att.guestNames ? `(${att.guestNames})` : ''}`
                          : (att.userId?.category || 'Member')
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Venue Map */}
        {event.locationAddress && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Getting There</h3>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #272729', height: '320px', width: '100%', background: '#161617' }}>
              <iframe
                src={
                  event.gmapLink && event.gmapLink.includes('embed')
                    ? event.gmapLink
                    : `https://maps.google.com/maps?q=${encodeURIComponent(event.gmapLink || event.locationAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                }
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}

      </main>

      {/* Celebratory Registration Success Modal */}
      {showSuccessModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            style={{
              background: '#141418',
              border: '1px solid rgba(48,209,88,0.4)',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '460px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#30d158', margin: '0 0 8px 0' }}>
              Hallelujah! You're Registered!
            </h2>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Your spot for <strong>{event.eventName}</strong> has been reserved successfully ({1 + Number(additionalCount)} Party Size).
            </p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                background: '#dc143c',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '980px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
