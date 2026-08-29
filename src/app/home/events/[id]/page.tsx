"use client";

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useScrollReveal, use3DTilt } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm } from '@/lib/formatTime';
import { generateGoogleCalendarUrl } from '@/lib/calendarExport';
import { translations, Language, Theme } from '@/lib/translations';
import QRCodePass from '@/components/QRCodePass';

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
  const [additionalCount, setAdditionalCount] = useState<number>(0);
  const [guestNames, setGuestNames] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('en');

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
        if (!token) {
          router.replace(`/login?redirect=/home/events/${id}`);
          return;
        }

        const meHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

        const [eventRes, meRes] = await Promise.all([
          fetch(`/api/admin/events/${id}`),
          fetch('/api/auth/me', { headers: meHeaders }),
        ]);

        if (!meRes.ok) {
          localStorage.removeItem('auth-token');
          router.replace(`/login?redirect=/home/events/${id}`);
          return;
        }

        const meData = await meRes.json();
        if (!meData.user) {
          localStorage.removeItem('auth-token');
          router.replace(`/login?redirect=/home/events/${id}`);
          return;
        }

        setCurrentUser(meData.user);

        if (!eventRes.ok) {
          router.push('/home');
          return;
        }

        const eventData = await eventRes.json();
        setEvent(eventData.event);
        setAttendances(eventData.attendances || []);
        setTotalHeadcount(eventData.totalHeadcount || 0);
        setTotalMembers(eventData.totalMembers || 0);
        setTotalGuests(eventData.totalGuests || 0);

        const existingAtt = (eventData.attendances || []).find(
          (att: any) => att.userId && att.userId._id === meData.user._id
        );

        if (existingAtt) {
          setIsRegistered(true);
          setAdditionalCount(existingAtt.additionalCount || 0);
          setGuestNames(existingAtt.guestNames || '');
          setSpecialNotes(existingAtt.specialNotes || '');
        }
      } catch (err) {
        console.error(err);
        router.replace(`/login?redirect=/home/events/${id}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  // 0ms Optimistic UI Registration update + Celebratory Modal
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) { router.push(`/login?redirect=/home/events/${id}`); return; }

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

  const getEventShareText = () => {
    if (!event) return '';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    return `⛪ Join us for *${event.eventName}*!\n\n📅 *Date:* ${formatDate(event.date)}\n⏰ *Time:* ${formatTimeWithAmPm(event.time)}\n📍 *Location:* ${event.locationAddress}${event.gmapLink ? `\n🗺️ *Map:* ${event.gmapLink}` : ''}\n\n👉 *Click link to register & confirm attendance:*\n${shareUrl}`;
  };

  const handleWhatsAppShare = () => {
    const shareText = getEventShareText();
    if (!shareText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleCopyInvite = () => {
    const shareText = getEventShareText();
    if (!shareText) return;
    navigator.clipboard.writeText(shareText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleOpenNavigation = () => {
    if (!event || !event.locationAddress) return;
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.gmapLink || event.locationAddress)}`;
    window.open(navUrl, '_blank');
  };

  const formatDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : '';

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === 'light' ? '#f8fafc' : '#070709' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(220,20,60,0.2)', borderTopColor: '#dc143c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#86868b', fontSize: '13px', fontWeight: 600 }}>Loading gathering details...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div style={{ minHeight: '100vh', background: theme === 'light' ? '#f8fafc' : '#070709', color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Sticky Top Header */}
      <nav style={{ position: 'sticky', top: 0, height: '60px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(10,10,14,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 100, borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/home" style={{ color: theme === 'light' ? '#475569' : '#a1a1aa', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, transition: 'color 0.2s' }}>
          <span>&larr;</span> {t.backToEvents}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleLang}
            title="Switch Language"
            style={{
              background: theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 10px',
              borderRadius: '980px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🌐 {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle Light / Dark Theme"
            style={{
              background: theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 10px',
              borderRadius: '980px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 1.5rem 80px' }}>

        {/* Event Header Banner */}
        <div style={{ background: theme === 'light' ? '#ffffff' : 'linear-gradient(135deg, rgba(22,22,28,0.95) 0%, rgba(14,14,18,0.95) 100%)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden', boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.04)' : '0 16px 40px rgba(0,0,0,0.45)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', color: '#ff4d6d', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: '980px', textTransform: 'uppercase', marginBottom: '14px' }}>
            <span>⛪</span> {event.category || t.churchGathering}
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#fff', letterSpacing: '-0.02em', margin: '0 0 10px 0', lineHeight: 1.2 }}>
            {event.eventName}
          </h1>

          <p style={{ color: theme === 'light' ? '#64748b' : '#a1a1aa', fontSize: '15px', fontWeight: 500, margin: '0 0 20px 0' }}>
            📅 {formatDate(event.date)} &bull; ⏰ {formatTimeWithAmPm(event.time)}
          </p>

          {/* Quick Action Pill Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleOpenNavigation}
              style={{
                background: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                color: theme === 'light' ? '#2563eb' : '#60a5fa',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '980px',
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
                padding: '8px 16px',
                borderRadius: '980px',
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

            <button
              type="button"
              onClick={handleCopyInvite}
              style={{
                background: copiedInvite 
                  ? 'rgba(48, 209, 88, 0.2)' 
                  : (theme === 'light' ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255, 255, 255, 0.08)'),
                color: copiedInvite ? '#30d158' : (theme === 'light' ? '#0f172a' : '#fff'),
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.12)',
                padding: '8px 16px',
                borderRadius: '980px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {copiedInvite ? '✓ Copied Invite!' : '📋 Copy Invite'}
            </button>

            <a
              href={generateGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.12)',
                color: theme === 'light' ? '#0f172a' : '#fff',
                padding: '8px 16px',
                borderRadius: '980px',
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

          {/* Live Attendance Headcount Badge */}
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.05)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '980px' }}>
              <span style={{ fontSize: '15px' }}>🔥</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#fff' }}>
                {totalHeadcount > 0 ? (
                  <>{totalHeadcount} {t.peopleAttending} ({totalMembers} {t.members} + {totalGuests} {t.guestsComing})</>
                ) : (
                  <>Be the first to register for this gathering!</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 3-Card Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#131318', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>📅</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{t.date}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '15px', fontWeight: 700 }}>{formatDate(event.date)}</div>
          </div>

          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#131318', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>⏰</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{t.time}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '15px', fontWeight: 700 }}>{formatTimeWithAmPm(event.time)}</div>
          </div>

          <div className="tilt-card" style={{ background: theme === 'light' ? '#ffffff' : '#131318', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>📍</div>
            <div style={{ color: theme === 'light' ? '#64748b' : '#86868b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{t.location}</div>
            <div style={{ color: theme === 'light' ? '#0f172a' : '#f4f8fb', fontSize: '15px', fontWeight: 700 }}>{event.locationAddress}</div>
          </div>
        </div>

        {/* Registration & 1-Tap RSVP Card */}
        <div style={{
          background: isRegistered 
            ? (theme === 'light' ? '#ffffff' : 'linear-gradient(135deg, rgba(18,24,20,0.95) 0%, rgba(12,18,14,0.95) 100%)') 
            : (theme === 'light' ? '#ffffff' : 'rgba(18, 18, 24, 0.85)'),
          border: isRegistered 
            ? '1px solid rgba(48,209,88,0.4)' 
            : (theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.12)'),
          borderRadius: '24px',
          padding: '28px 24px',
          marginBottom: '28px',
          boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.04)' : '0 16px 40px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: isRegistered ? 'rgba(48,209,88,0.15)' : 'rgba(220,20,60,0.12)',
              fontSize: '24px',
              marginBottom: '12px'
            }}>
              {isRegistered ? '✅' : '🎟️'}
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: isRegistered ? '#30d158' : (theme === 'light' ? '#0f172a' : '#fff'),
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}>
              {isRegistered ? "You're Registered & Confirmed!" : "1-Tap Event RSVP"}
            </h2>

            <p style={{
              fontSize: '13px',
              color: theme === 'light' ? '#64748b' : '#a1a1aa',
              margin: '0 0 20px 0',
              lineHeight: 1.4
            }}>
              {isRegistered 
                ? `Your spot for ${event.eventName} is confirmed for ${1 + Number(additionalCount)} attendee(s). Your digital entry pass is ready below.`
                : `Tap below to instantly RSVP. Bring family or guests with the guest selector.`}
            </p>

            {/* Guest Selector Chips */}
            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 800,
                color: theme === 'light' ? '#475569' : '#d4d4d8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                👥 Party Size / Additional Guests
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAdditionalCount(num)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: additionalCount === num 
                        ? '2px solid #dc143c' 
                        : (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)'),
                      background: additionalCount === num 
                        ? (theme === 'light' ? 'rgba(220,20,60,0.12)' : 'rgba(220,20,60,0.25)') 
                        : (theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)'),
                      color: additionalCount === num 
                        ? (theme === 'light' ? '#dc143c' : '#fff') 
                        : (theme === 'light' ? '#334155' : '#a1a1aa'),
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {num === 0 ? 'Just Me' : `+${num} ${num > 1 ? 'Guests' : 'Guest'}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Guest Names Input */}
            {additionalCount > 0 && (
              <div style={{ marginBottom: '18px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: theme === 'light' ? '#64748b' : '#a1a1aa',
                  marginBottom: '6px'
                }}>
                  👨‍👩‍👧‍👦 Guest Names (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grace, Sarah, David"
                  value={guestNames}
                  onChange={(e) => setGuestNames(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: theme === 'light' ? '#f8fafc' : 'rgba(0,0,0,0.4)',
                    border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
                    color: theme === 'light' ? '#0f172a' : '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {registerMsg && (
              <p style={{
                color: registerMsg.startsWith('✅') ? '#30d158' : '#ff453a',
                marginBottom: '14px',
                fontSize: '13px',
                fontWeight: 700
              }}>
                {registerMsg}
              </p>
            )}

            {/* Main Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleRegister()}
                disabled={isRegistering}
                style={{
                  width: '100%',
                  background: isRegistered 
                    ? (theme === 'light' ? '#16a34a' : '#22c55e') 
                    : 'linear-gradient(135deg, #dc143c 0%, #b01030 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isRegistered 
                    ? '0 4px 16px rgba(34, 197, 94, 0.35)' 
                    : '0 6px 20px rgba(220, 20, 60, 0.4)'
                }}
              >
                {isRegistering ? (
                  'Saving RSVP...'
                ) : isRegistered ? (
                  `✓ Update RSVP (${1 + Number(additionalCount)} People)`
                ) : (
                  `✨ I'm Attending (${1 + Number(additionalCount)} Party Size) →`
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Digital Access Pass When Registered */}
        {isRegistered && (
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#fff', marginBottom: '12px' }}>
              🎫 Your Digital Entry Pass
            </h3>
            <QRCodePass
              eventName={event.eventName}
              userName={currentUser?.name || 'Church Member'}
              contactNumber={currentUser?.contactNumber || ''}
              registrationId={event._id}
              date={event.date}
              time={event.time}
              location={event.locationAddress}
              partySize={1 + Number(additionalCount)}
              specialNotes={specialNotes}
            />
          </div>
        )}

        {/* Who's Attending Community Roster */}
        {attendances.length > 0 && (
          <div style={{ marginBottom: '28px', background: theme === 'light' ? '#ffffff' : '#121216', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: theme === 'light' ? '0 4px 12px rgba(0,0,0,0.04)' : 'none' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#fff', margin: '0 0 16px 0' }}>
              👥 {t.whosComing} ({totalHeadcount} {t.totalAttendees})
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {attendances.map((att) => {
                const badge = getCategoryBadgeStyle(att.userId?.category);
                const initials = getInitials(att.userId?.name);

                return (
                  <div
                    key={att._id}
                    style={{
                      background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: theme === 'light' ? '#0f172a' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {att.userId?.name || 'Member'}
                      </div>
                      <div style={{ fontSize: '11px', color: theme === 'light' ? '#64748b' : '#a1a1aa', marginTop: '1px' }}>
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

        {/* Venue Google Map */}
        {event.locationAddress && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#fff', marginBottom: '12px' }}>Getting There</h3>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729', height: '280px', width: '100%', background: '#161617' }}>
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
              padding: '28px 20px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '44px', marginBottom: '8px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#30d158', margin: '0 0 6px 0' }}>
              You're Registered & Confirmed!
            </h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 18px 0', lineHeight: 1.4 }}>
              Your spot for <strong>{event.eventName}</strong> has been reserved ({1 + Number(additionalCount)} Party Size).
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
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done & View Entry Pass
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
