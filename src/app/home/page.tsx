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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);

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
        if (!token) {
          router.replace('/login');
          return;
        }

        const meHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

        // Parallel fetch for zero-waterfall latency
        const [eventsRes, meRes, scheduleRes] = await Promise.all([
          fetch('/api/admin/events'),
          fetch('/api/auth/me', { headers: meHeaders }),
          fetch('/api/admin/weekly-schedule')
        ]);

        if (!meRes.ok) {
          localStorage.removeItem('auth-token');
          router.replace('/login');
          return;
        }

        const meData = await meRes.json();
        if (!meData.user) {
          localStorage.removeItem('auth-token');
          router.replace('/login');
          return;
        }

        if (isMounted) {
          setCurrentUser(meData.user);
          setRegisteredEvents(meData.registeredEvents || []);
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const sortedEvents = (data.events || []).sort((a: any, b: any) =>
            new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
          );
          if (isMounted) setEvents(sortedEvents);

          // Pre-fetch next pages for instant navigation
          sortedEvents.slice(0, 6).forEach((e: any) => {
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
      } catch (err) {
        console.error('Failed to fetch data', err);
        router.replace('/login');
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
      weekday: 'short', month: 'short', day: 'numeric'
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

  const getDayOfWeek = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short'
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

  const registeredEventIdSet = useMemo(() => {
    return new Set(registeredEvents.map(e => (typeof e === 'string' ? e : e?._id)));
  }, [registeredEvents]);

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

  // Dynamic list of categories for filter chips
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    upcomingEvents.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return ['All', ...Array.from(set)];
  }, [upcomingEvents]);

  const displayedEvents = useMemo(() => {
    const list = activeTab === 'registered' ? upcomingRegisteredEvents : upcomingEvents;
    return list.filter(e => {
      const matchesSearch = !searchQuery.trim() || 
        (e.eventName && e.eventName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.locationAddress && e.locationAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.date && e.date.includes(searchQuery));

      const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [activeTab, upcomingRegisteredEvents, upcomingEvents, searchQuery, selectedCategory]);

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

  // 1-Tap Quick RSVP Handler directly on card
  const handle1TapRSVP = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      router.push(`/login?redirect=/home/events/${eventId}`);
      return;
    }

    setRsvpLoadingId(eventId);
    const targetEvt = events.find(ev => ev._id === eventId);

    // Optimistic UI update
    if (targetEvt && !registeredEventIdSet.has(eventId)) {
      setRegisteredEvents(prev => [...prev, targetEvt]);
    }

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, additionalCount: 0 })
      });
      if (!res.ok) {
        console.error('RSVP failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRsvpLoadingId(null);
    }
  };

  return (
    <div className={`${styles.container} ${theme === 'light' ? styles.containerLight : ''}`}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <span className={styles.churchBadgeIcon}>⛪</span>
          <span className={styles.logoText}>{t.appName}</span>
        </div>

        {/* Center Tabs */}
        <div className={styles.navTabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            🗓️ {t.allEvents}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'registered' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('registered')}
          >
            🎟️ {t.myRegistrations} {upcomingRegisteredEvents.length > 0 && `(${upcomingRegisteredEvents.length})`}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'schedule' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            ⛪ {t.weeklySchedule}
          </button>
        </div>

        {/* Right Controls */}
        <div className={styles.profileArea}>
          {/* Admin Dashboard Quick Link */}
          {currentUser?.role === 'admin' && (
            <Link
              href="/admin"
              className={styles.headerBtn}
              style={{
                background: 'rgba(225, 29, 72, 0.15)',
                borderColor: 'rgba(225, 29, 72, 0.4)',
                color: '#fb7185',
                textDecoration: 'none'
              }}
            >
              🏛️ Admin Panel
            </Link>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            title="Switch Language (தமிழ் / English)"
            className={styles.headerBtn}
          >
            🌐 {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle Light / Dark Theme"
            className={styles.headerBtn}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {currentUser ? (
            <>
              <div 
                className={styles.profileCircle}
                onClick={() => setIsProfileOpen(o => !o)}
                title={currentUser.name}
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
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {currentUser?.name || 'Member'}
                        </div>
                        <div style={{ color: '#86868b', fontSize: '0.8rem' }}>
                          {currentUser?.contactNumber || 'Rose of Sharon IPC'}
                        </div>
                      </div>
                    </div>

                    <div className={styles.profileDropdownDivider} />

                    {currentUser?.role === 'admin' && (
                      <Link
                        href="/admin"
                        className={styles.profileDropdownItem}
                        style={{ textDecoration: 'none', color: '#fb7185' }}
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <span style={{ fontSize: '15px' }}>🏛️</span>
                        Admin Dashboard
                      </Link>
                    )}

                    <button 
                      className={styles.profileDropdownItem}
                      onClick={() => {
                        setIsProfileOpen(false);
                        setActiveTab('registered');
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>🎟️</span>
                      {t.myRegistrations} {upcomingRegisteredEvents.length > 0 && `(${upcomingRegisteredEvents.length})`}
                    </button>

                    <button 
                      className={`${styles.profileDropdownItem} ${styles.profileDropdownLogout}`}
                      onClick={handleLogout}
                    >
                      <span style={{ fontSize: '15px' }}>🚪</span>
                      {t.logout}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link href="/login" className={styles.signInBtn}>
              {t.signIn}
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Welcome & Reminder Spotlight (Only shown when user has an active pass) */}
      {upcomingRegisteredEvent && (
        <div className={styles.reminderContainer}>
          <div className={`reveal ${styles.reminderCard}`}>
            <div className={styles.reminderLeft}>
              <span className={styles.reminderBadge}>⏰ YOUR CONFIRMED PASS</span>
              <h3 className={styles.reminderTitle}>
                {upcomingRegisteredEvent.eventName}
              </h3>
              <div className={styles.reminderMetaRow}>
                <span>📅 {formatDate(upcomingRegisteredEvent.date)}</span>
                <span>⏰ {formatTimeWithAmPm(upcomingRegisteredEvent.time)}</span>
                <span>📍 {upcomingRegisteredEvent.locationAddress}</span>
              </div>
            </div>

            <div className={styles.reminderActionArea}>
              <button
                className={styles.reminderBtn}
                onClick={() => router.push(`/home/events/${upcomingRegisteredEvent._id}`)}
              >
                🎟️ View Entry Pass &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={styles.mainContent} style={{ paddingTop: upcomingRegisteredEvent ? '1.5rem' : '84px' }}>
        {/* Search & Category Filter Bar */}
        {activeTab === 'all' && (
          <div className={styles.filterSection}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder={lang === 'ta' ? "ஜெபக் கூட்டங்கள், ஆராதனை அல்லது இடத்தை தேடுங்கள்..." : "Search services, prayer meetings, or locations..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearchBtn}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            {categoriesList.length > 1 && (
              <div className={styles.categoryChips}>
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`${styles.catChip} ${selectedCategory === cat ? styles.catChipActive : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingGrid}>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
          </div>
        ) : activeTab === 'schedule' ? (
          /* Weekly Service Schedule Board */
          <div>
            <div className={styles.registeredHeader}>
              <div>
                <h2 className={styles.registeredTitle}>
                  ⛪ {t.weeklySchedule}
                </h2>
                <p className={styles.registeredSub}>Church services and recurring prayer routines by day of the week.</p>
              </div>
            </div>

            {daysWithEvents.length === 0 ? (
              <div className={`reveal ${styles.emptyState}`}>
                <div className={styles.emptyIcon}>📭</div>
                <h2 className={styles.emptyTitle}>No Events</h2>
                <p className={styles.emptyDesc}>There are no upcoming events scheduled for this week.</p>
              </div>
            ) : (
              <div className={styles.scheduleGrid}>
                {daysWithEvents.map((day) => {
                  const dayEvents = upcomingEventsByDay[day];
                  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

                  return (
                    <div
                      key={day}
                      className={`${styles.scheduleCard} ${isToday ? styles.scheduleCardToday : ''}`}
                    >
                      <div className={styles.scheduleCardHeader}>
                        <h3 className={styles.scheduleDayTitle}>
                          {day}
                        </h3>
                        {isToday && (
                          <span className={styles.todayBadge}>
                            TODAY
                          </span>
                        )}
                      </div>

                      <div className={styles.scheduleList}>
                        {dayEvents.map((evt, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => router.push(`/home/events/${evt._id}`)}
                            className={styles.scheduleItem}
                          >
                            <span className={styles.scheduleTime}>⏰ {formatTimeWithAmPm(evt.time)}</span>
                            <span className={styles.scheduleDot}>•</span>
                            <span className={styles.scheduleName}>{evt.eventName}</span>
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
          /* My Registered Passes Tab */
          <div>
            <div className={styles.registeredHeader}>
              <div>
                <h2 className={styles.registeredTitle}>
                  🎟️ My Event Passes
                </h2>
                <p className={styles.registeredSub}>Your confirmed event registrations and digital entry passes.</p>
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
                  You haven't registered for any upcoming events yet. Click 'All Events' to browse and RSVP!
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
        ) : displayedEvents.length === 0 ? (
          <div className={`reveal ${styles.emptyState}`}>
            <div className={styles.emptyIcon}>🔍</div>
            <h2 className={styles.emptyTitle}>No Events Found</h2>
            <p className={styles.emptyDesc}>
              {searchQuery ? "No events match your search query." : "There are no upcoming events at the moment."}
            </p>
          </div>
        ) : (
          <>
            {/* Featured Event Spotlight */}
            {featuredEvent && (
              <section
                className={`reveal-3d ${styles.featuredCard}`}
                onClick={() => router.push(`/home/events/${featuredEvent._id}`)}
              >
                <div className={styles.featuredLeft}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className={styles.badge}>FEATURED GATHERING</span>
                    {registeredEventIdSet.has(featuredEvent._id) && (
                      <span className={styles.registeredPill}>
                        ✓ You&apos;re Attending
                      </span>
                    )}
                  </div>

                  <h2 className={styles.featuredTitle}>{featuredEvent.eventName}</h2>
                  
                  <div className={styles.featuredPills}>
                    <span className={styles.pill}>📅 {formatDate(featuredEvent.date)}</span>
                    <span className={styles.pill}>⏰ {formatTimeWithAmPm(featuredEvent.time)}</span>
                    <span className={styles.pill}>📍 {featuredEvent.locationAddress}</span>
                  </div>

                  <div style={{ marginTop: '1.75rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {registeredEventIdSet.has(featuredEvent._id) ? (
                      <button 
                        type="button"
                        className={styles.cardPassBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/home/events/${featuredEvent._id}`);
                        }}
                      >
                        🎟️ View Digital Entry Pass →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.cardRsvpBtn}
                        onClick={(e) => handle1TapRSVP(featuredEvent._id, e)}
                        disabled={rsvpLoadingId === featuredEvent._id}
                      >
                        {rsvpLoadingId === featuredEvent._id ? 'Saving...' : '✨ 1-Tap RSVP Attending →'}
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.featuredRight}>
                  <div className={styles.dateCircle}>
                    <span className={styles.dateMonth}>{getMonthOnly(featuredEvent.date)}</span>
                    <span className={styles.dateDay}>{getDayOnly(featuredEvent.date)}</span>
                    <span className={styles.dateDow}>{getDayOfWeek(featuredEvent.date)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Events Grid */}
            {remainingEvents.length > 0 && (
              <section className={styles.eventsGrid}>
                {remainingEvents.map((event, index) => {
                  const delayClass = `delay-${Math.min((index % 6) + 1, 6)}`;
                  const isRegistered = registeredEventIdSet.has(event._id);

                  return (
                    <div
                      key={event._id}
                      className={`reveal tilt-card ${delayClass} ${styles.eventCard}`}
                      onClick={() => router.push(`/home/events/${event._id}`)}
                    >
                      {/* Top Row: Date Pill & Status */}
                      <div className={styles.cardTopRow}>
                        <div className={styles.cardDateBox}>
                          <span className={styles.cardDateMonth}>{getMonthOnly(event.date)}</span>
                          <span className={styles.cardDateDay}>{getDayOnly(event.date)}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {isRegistered ? (
                            <span className={styles.registeredPill}>
                              ✓ Attending
                            </span>
                          ) : (
                            <span className={styles.upcomingPill}>
                              🗓️ Upcoming
                            </span>
                          )}
                          <span className={styles.cardDayOfWeek}>{getDayOfWeek(event.date)}</span>
                        </div>
                      </div>

                      <h3 className={styles.cardTitle}>{event.eventName}</h3>

                      <div className={styles.cardPills}>
                        <div className={styles.cardInfoRow}>
                          <span>⏰</span>
                          <span>{formatTimeWithAmPm(event.time)}</span>
                        </div>
                        <div className={styles.cardInfoRow}>
                          <span>📍</span>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {event.locationAddress}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className={styles.cardFooterArea}>
                        {isRegistered ? (
                          <div className={styles.cardFooterConfirmed}>
                            <span>🎟️ Entry Pass Ready</span>
                            <span>&rarr;</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.cardQuickRsvp}
                            onClick={(e) => handle1TapRSVP(event._id, e)}
                            disabled={rsvpLoadingId === event._id}
                          >
                            {rsvpLoadingId === event._id ? 'Saving...' : '✨ 1-Tap RSVP'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Dock */}
      <nav className={styles.bottomNav}>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'all' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span className={styles.bottomNavIcon}>🗓️</span>
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
