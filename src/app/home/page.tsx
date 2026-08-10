"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { useScrollReveal, use3DTilt } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm, isEventUpcoming } from '@/lib/formatTime';
import { generateGoogleCalendarUrl } from '@/lib/calendarExport';
import { translations, Language, Theme } from '@/lib/translations';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'registered' | 'schedule'>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('en');
  const router = useRouter();

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
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        const meHeaders: Record<string, string> = {};
        if (token) meHeaders['Authorization'] = `Bearer ${token}`;

        // Parallel fetch for zero-waterfall latency
        const [eventsRes, meRes, scheduleRes] = await Promise.all([
          fetch('/api/admin/events'),
          fetch('/api/auth/me', { headers: meHeaders }),
          fetch('/api/admin/weekly-schedule')
        ]);

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const sortedEvents = (data.events || []).sort((a: any, b: any) =>
            new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
          );
          if (isMounted) setEvents(sortedEvents);

          // Route pre-fetching for instant 0ms page transitions
          sortedEvents.slice(0, 5).forEach((e: any) => {
            router.prefetch(`/home/events/${e._id}`);
          });
        }

        if (scheduleRes.ok) {
          const sData = await scheduleRes.json();
          if (sData.schedule && sData.schedule.length > 0) {
            const map: Record<string, string[]> = {};
            sData.schedule.forEach((s: any) => { map[s.day] = s.services; });
            if (isMounted) setWeeklySchedule(map);
          }
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (isMounted) {
            setCurrentUser(meData.user);
            setRegisteredEvents(meData.registeredEvents || []);
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setRegisteredEvents([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [router]);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }, []);

  const getDayOnly = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').getDate().toString();
  }, []);

  const getMonthOnly = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short'
    }).toUpperCase();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('auth-token');
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to logout', err);
    } finally {
      window.location.href = '/login';
    }
  }, []);

  // Memoized event filtering & sorting
  const upcomingEvents = useMemo(() => {
    return events.filter(e => isEventUpcoming(e.date));
  }, [events]);

  const upcomingRegisteredEvents = useMemo(() => {
    return registeredEvents.filter(e => isEventUpcoming(e.date));
  }, [registeredEvents]);

  const upcomingRegisteredEvent = useMemo(() => {
    return upcomingRegisteredEvents
      .filter(e => e && e.date)
      .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())[0] || null;
  }, [upcomingRegisteredEvents]);

  const displayedEvents = useMemo(() => {
    const list = activeTab === 'registered' ? upcomingRegisteredEvents : upcomingEvents;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(e =>
      (e.eventName && e.eventName.toLowerCase().includes(q)) ||
      (e.locationAddress && e.locationAddress.toLowerCase().includes(q)) ||
      (e.date && e.date.includes(q))
    );
  }, [activeTab, upcomingRegisteredEvents, upcomingEvents, searchQuery]);

  const featuredEvent = useMemo(() => displayedEvents[0] || null, [displayedEvents]);
  const remainingEvents = useMemo(() => displayedEvents.slice(1), [displayedEvents]);

  const defaultScheduleDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const upcomingEventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {
      Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
    };
    upcomingEvents.forEach(e => {
      if (e.date) {
        const d = new Date(e.date + 'T00:00:00');
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'long' });
        if (map[dayStr]) {
          map[dayStr].push(e);
        }
      }
    });
    return map;
  }, [upcomingEvents]);
  
  const daysWithEvents = defaultScheduleDays.filter(day => upcomingEventsByDay[day].length > 0);

  return (
    <div className={`${styles.container} ${theme === 'light' ? styles.containerLight : ''}`}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <span className={styles.logoText}>{t.appName}</span>
        </div>

        <div className={styles.navTabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t.allEvents} ({upcomingEvents.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'registered' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('registered')}
          >
            {t.myRegistrations} ({upcomingRegisteredEvents.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'schedule' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            {t.weeklySchedule}
          </button>
        </div>

        <div className={styles.profileArea} style={{ gap: '10px' }}>
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            title="Switch Language (தமிழ் / English)"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
          </button>

          {/* Theme Toggle Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle Light / Dark Theme"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: theme === 'light' ? '#0f172a' : '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {currentUser ? (
            <>
              <div 
                className={styles.profileCircle}
                onClick={() => setIsProfileOpen(o => !o)}
              >
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>

              {isProfileOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                    onClick={() => setIsProfileOpen(false)} 
                  />
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileDropdownHeader}>
                      <div className={styles.profileDropdownAvatar}>
                        {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {currentUser?.name || 'User'}
                        </div>
                        <div style={{ color: '#86868b', fontSize: '0.8rem' }}>
                          {currentUser?.contactNumber || 'DA-ROS Member'}
                        </div>
                      </div>
                    </div>

                    <div className={styles.profileDropdownDivider} />

                    <button 
                      className={styles.profileDropdownItem}
                      onClick={() => {
                        setIsProfileOpen(false);
                        setActiveTab('registered');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      {t.myRegistrations} ({upcomingRegisteredEvents.length})
                    </button>

                    <button 
                      className={`${styles.profileDropdownItem} ${styles.profileDropdownLogout}`}
                      onClick={handleLogout}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      {t.logout}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link href="/login" style={{
              background: 'linear-gradient(135deg, #dc143c 0%, #b01030 100%)',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(220, 20, 60, 0.3)'
            }}>
              {t.signIn}
            </Link>
          )}
        </div>
      </nav>

      {/* Reminder Banner */}
      <div className={styles.reminderContainer}>
        <div className={`reveal ${styles.reminderCard}`}>
          <div className={styles.reminderLeft}>
            {upcomingRegisteredEvent ? (
              <>
                <span className={styles.reminderBadge}>⏰ UPCOMING REMINDER</span>
                <h3 className={styles.reminderTitle}>
                  You're registered for: <strong>{upcomingRegisteredEvent.eventName}</strong>
                </h3>
                <p className={styles.reminderSub}>
                  📅 {formatDate(upcomingRegisteredEvent.date)} &bull; ⏰ {formatTimeWithAmPm(upcomingRegisteredEvent.time)} &bull; 📍 {upcomingRegisteredEvent.locationAddress}
                </p>
              </>
            ) : (
              <>
                <span className={styles.reminderBadge}>🗓 READY TO JOIN US?</span>
                <h3 className={styles.reminderTitle}>
                  You haven't registered for any upcoming events yet
                </h3>
                <p className={styles.reminderSub}>
                  Explore upcoming church events below and reserve your spot in seconds!
                </p>
              </>
            )}
          </div>
          <div>
            {upcomingRegisteredEvent ? (
              <button
                className={styles.reminderBtn}
                onClick={() => router.push(`/home/events/${upcomingRegisteredEvent._id}`)}
              >
                View Digital Pass &rarr;
              </button>
            ) : (
              <button
                className={styles.reminderBtn}
                onClick={() => {
                  if (featuredEvent) router.push(`/home/events/${featuredEvent._id}`);
                }}
              >
                Explore Events &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.mainContent} style={{ paddingTop: '1.5rem' }}>
        {/* Instant Search Bar */}
        {activeTab === 'all' && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="🔍 Search events by title, location, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#161618',
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  padding: '14px 20px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#86868b',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingGrid}>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
          </div>
        ) : activeTab === 'schedule' ? (
          /* Weekly Mass & Service Schedule Board */
          <div>
            <div className={styles.registeredHeader}>
              <div>
                <h2 className={styles.registeredTitle}>
                  ⛪ {t.weeklySchedule}
                </h2>
                <p className={styles.registeredSub}>Your upcoming events organized by day of the week.</p>
              </div>
            </div>

            {daysWithEvents.length === 0 ? (
              <div className={`reveal ${styles.emptyState}`}>
                <div className={styles.emptyIcon}>📭</div>
                <h2 className={styles.emptyTitle}>No Events</h2>
                <p className={styles.emptyDesc}>There are no upcoming events scheduled for this week.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
                {daysWithEvents.map((day) => {
                  const dayEvents = upcomingEventsByDay[day];
                  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

                  return (
                    <div
                      key={day}
                      style={{
                        background: isToday ? 'rgba(220,20,60,0.12)' : (theme === 'light' ? '#ffffff' : '#161617'),
                        border: isToday ? '1px solid rgba(220,20,60,0.4)' : (theme === 'light' ? '1px solid #e2e8f0' : '1px solid #272729'),
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: theme === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: isToday ? 'var(--crimson)' : (theme === 'light' ? '#0f172a' : '#fff'), margin: 0 }}>
                          {day}
                        </h3>
                        {isToday && (
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'var(--crimson)', color: '#fff' }}>
                            TODAY
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dayEvents.map((evt, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => router.push(`/home/events/${evt._id}`)}
                            style={{ 
                              fontSize: '13px', 
                              color: theme === 'light' ? '#334155' : '#d4d4d8', 
                              padding: '10px 12px', 
                              background: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', 
                              borderRadius: '8px', 
                              border: theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = theme === 'light' ? 'rgba(220,20,60,0.08)' : 'rgba(220,20,60,0.15)';
                                e.currentTarget.style.color = theme === 'light' ? '#dc143c' : '#fff';
                                e.currentTarget.style.borderColor = 'rgba(220,20,60,0.3)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = theme === 'light' ? '#334155' : '#d4d4d8';
                                e.currentTarget.style.borderColor = theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)';
                            }}
                          >
                            <span>⏰ {formatTimeWithAmPm(evt.time)}</span>
                            <span style={{ opacity: 0.5 }}>•</span>
                            <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{evt.eventName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'registered' ? (
          /* Registered Events Ticket Pass View */
          <div>
            <div className={styles.registeredHeader}>
              <div>
                <h2 className={styles.registeredTitle}>
                  🎟️ My Event Passes
                </h2>
                <p className={styles.registeredSub}>Your confirmed event registrations and entry passes.</p>
              </div>
              <span className={styles.registeredCountBadge}>
                {upcomingRegisteredEvents.length} Confirmed Pass{upcomingRegisteredEvents.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {upcomingRegisteredEvents.length === 0 ? (
              <div className={`reveal ${styles.emptyState}`}>
                <div className={styles.emptyIcon}>🎫</div>
                <h2 className={styles.emptyTitle}>No Registered Events</h2>
                <p className={styles.emptyDesc}>
                  You haven't registered for any upcoming events yet. Click 'All Events' to browse upcoming events!
                </p>
                <button
                  className={styles.reminderBtn}
                  style={{ marginTop: '1.5rem' }}
                  onClick={() => setActiveTab('all')}
                >
                  Browse All Events &rarr;
                </button>
              </div>
            ) : (
              <div className={styles.ticketList}>
                {upcomingRegisteredEvents.map((event, index) => {
                  const delayClass = `delay-${Math.min((index % 6) + 1, 6)}`;
                  return (
                    <div
                      key={event._id}
                      className={`reveal-3d ${delayClass} ${styles.ticketPass}`}
                      onClick={() => router.push(`/home/events/${event._id}`)}
                    >
                      <div className={styles.ticketLeft}>
                        <div className={styles.ticketStatus}>
                          <span>✓</span> CONFIRMED ACCESS PASS
                        </div>
                        <h3 className={styles.ticketTitle}>{event.eventName}</h3>
                        <div className={styles.ticketMetaRow}>
                          <span className={styles.ticketMetaChip}>
                            📅 {formatDate(event.date)}
                          </span>
                          <span className={styles.ticketMetaChip}>
                            ⏰ {formatTimeWithAmPm(event.time)}
                          </span>
                          <span className={styles.ticketMetaChip}>
                            📍 {event.locationAddress}
                          </span>
                        </div>
                      </div>

                      <div className={styles.ticketDivider} />

                      <div className={styles.ticketRight}>
                        <div className={styles.ticketBadgeIcon}>🎫</div>
                        <button className={styles.ticketActionBtn}>
                          View Digital Pass &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : events.length === 0 ? (
          <div className={`reveal ${styles.emptyState}`}>
            <div className={styles.emptyIcon}>📭</div>
            <h2 className={styles.emptyTitle}>No Events Yet</h2>
            <p className={styles.emptyDesc}>There are no upcoming events at the moment. Please check back later.</p>
          </div>
        ) : (
          <>
            {/* Featured Event */}
            {featuredEvent && (
              <section
                className={`reveal-3d ${styles.featuredCard}`}
                onClick={() => router.push(`/home/events/${featuredEvent._id}`)}
              >
                <div className={styles.featuredLeft}>
                  <span className={styles.badge}>LATEST</span>
                  <h2 className={styles.featuredTitle}>{featuredEvent.eventName}</h2>
                  <div className={styles.featuredPills}>
                    <span className={styles.pill}>{formatDate(featuredEvent.date)}</span>
                    <span className={styles.pill}>{formatTimeWithAmPm(featuredEvent.time)}</span>
                    <span className={styles.pill}>{featuredEvent.locationAddress}</span>
                  </div>
                </div>
                <div className={styles.featuredRight}>
                  <div className={styles.dateCircle}>
                    <span className={styles.dateMonth}>{getMonthOnly(featuredEvent.date)}</span>
                    <span className={styles.dateDay}>{getDayOnly(featuredEvent.date)}</span>
                    <span className={styles.dateTime}>{formatTimeWithAmPm(featuredEvent.time)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Events Grid */}
            {remainingEvents.length > 0 && (
              <section className={styles.eventsGrid}>
                {remainingEvents.map((event, index) => {
                  const delayClass = `delay-${Math.min((index % 6) + 1, 6)}`;
                  return (
                    <div
                      key={event._id}
                      className={`reveal tilt-card ${delayClass} ${styles.eventCard}`}
                      onClick={() => router.push(`/home/events/${event._id}`)}
                    >
                      <div className={styles.cardDate}>
                        {formatDate(event.date)}
                      </div>
                      <h3 className={styles.cardTitle}>{event.eventName}</h3>
                      <div className={styles.cardPills}>
                        <span className={styles.pillSmall}>{formatTimeWithAmPm(event.time)}</span>
                        <span className={styles.pillSmall}>{event.locationAddress}</span>
                      </div>
                      <div className={styles.cardFooter}>
                        View Details &rarr;
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className={styles.bottomNav}>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'all' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span className={styles.bottomNavIcon}>🏠</span>
          <span>Events</span>
        </button>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'registered' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('registered')}
        >
          <span className={styles.bottomNavIcon}>🎟️</span>
          <span>Passes ({upcomingRegisteredEvents.length})</span>
        </button>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'schedule' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <span className={styles.bottomNavIcon}>⛪</span>
          <span>Schedule</span>
        </button>
      </nav>
    </div>
  );
}
