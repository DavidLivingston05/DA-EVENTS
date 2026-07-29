"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useScrollReveal, use3DTilt } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm, isEventUpcoming } from '@/lib/formatTime';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'registered'>('all');
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'history'>('upcoming');
  const [events, setEvents] = useState<any[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useScrollReveal();
  use3DTilt('.tilt-card');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch all events
        const eventsRes = await fetch('/api/admin/events');
        let sortedEvents: any[] = [];
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          sortedEvents = (data.events || []).sort((a: any, b: any) =>
            new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
          );
          setEvents(sortedEvents);
        }

        // Fetch current user & their registered events
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          if (meData.user?._id) {
            const userRes = await fetch(`/api/admin/users/${meData.user._id}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              setRegisteredEvents(userData.registeredEvents || []);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const getDayOnly = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').getDate().toString();
  };

  const getMonthOnly = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short'
    }).toUpperCase();
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  // Strictly filter only upcoming events (erase past events)
  const upcomingEvents = events.filter(e => isEventUpcoming(e.date));
  const upcomingRegisteredEvents = registeredEvents.filter(e => isEventUpcoming(e.date));

  // Determine next registered UPCOMING event for the reminder card
  const upcomingRegisteredEvent = upcomingRegisteredEvents
    .filter(e => e && e.date)
    .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())[0] || null;

  // Displayed events based on activeTab
  const displayedEvents = activeTab === 'registered' ? upcomingRegisteredEvents : upcomingEvents;
  const featuredEvent = displayedEvents[0] || null;
  const remainingEvents = displayedEvents.slice(1);

  return (
    <div className={styles.container}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <span className={styles.logoText}>DA-ROS</span>
        </div>

        <div className={styles.navTabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Events ({upcomingEvents.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'registered' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('registered')}
          >
            Registered Events ({upcomingRegisteredEvents.length})
          </button>
        </div>

        <div className={styles.profileArea}>
          <div 
            className={styles.profileCircle}
            onClick={() => setIsProfileOpen(o => !o)}
          >
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </div>

          {isProfileOpen && (
            <>
              {/* Backdrop to close on outside click */}
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
                  My Registered Events ({registeredEvents.length})
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
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Straight Horizontal Reminder Card */}
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
                View Event Details &rarr;
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
      <main className={styles.mainContent} style={{ paddingTop: '2rem' }}>
        {isLoading ? (
          <div className={styles.loadingGrid}>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
            <div className={`${styles.skeletonCard} shimmer`}></div>
          </div>
        ) : activeTab === 'registered' ? (
          /* Dedicated Registered Events Ticket Pass View */
          <div>
            <div className={styles.registeredHeader}>
              <div>
                <h2 className={styles.registeredTitle}>
                  🎟️ My Event Passes
                </h2>
                <p className={styles.registeredSub}>Your confirmed event registrations and entry passes.</p>
              </div>
              <span className={styles.registeredCountBadge}>
                {registeredEvents.length} Confirmed Pass{registeredEvents.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {registeredEvents.length === 0 ? (
              <div className={`reveal ${styles.emptyState}`}>
                <div className={styles.emptyIcon}>🎫</div>
                <h2 className={styles.emptyTitle}>No Registered Events</h2>
                <p className={styles.emptyDesc}>
                  You haven't registered for any events yet. Click 'All Events' to browse upcoming events!
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
                {registeredEvents.map((event, index) => {
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
                          {event.travelCost && event.travelCost !== '0' && (
                            <span className={styles.ticketMetaChip}>
                              🚌 ₹{event.travelCost}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.ticketDivider} />

                      <div className={styles.ticketRight}>
                        <div className={styles.ticketBadgeIcon}>🎫</div>
                        <button className={styles.ticketActionBtn}>
                          View Pass & Venue &rarr;
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
          <span>My Passes ({upcomingRegisteredEvents.length})</span>
        </button>
      </nav>
    </div>
  );
}
