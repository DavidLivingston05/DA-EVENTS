"use client";

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm, isEventUpcoming } from '@/lib/formatTime';
import styles from './page.module.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'addUser' | 'createEvent' | 'attendance'>('addUser');

  // Add User Tab States
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<{ upcoming: any[], history: any[] } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Create Event Tab States
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [eventDetails, setEventDetails] = useState<{ registeredUsers: any[] } | null>(null);
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [newEventHour, setNewEventHour] = useState('06');
  const [newEventMinute, setNewEventMinute] = useState('30');
  const [newEventAmPm, setNewEventAmPm] = useState<'AM' | 'PM'>('AM');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventGmapLink, setNewEventGmapLink] = useState('');
  const [newEventCost, setNewEventCost] = useState('');
  const [eventModalError, setEventModalError] = useState('');
  const [isEventSubmitting, setIsEventSubmitting] = useState(false);

  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editEventId, setEditEventId] = useState('');
  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventHour, setEditEventHour] = useState('06');
  const [editEventMinute, setEditEventMinute] = useState('30');
  const [editEventAmPm, setEditEventAmPm] = useState<'AM' | 'PM'>('AM');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventGmapLink, setEditEventGmapLink] = useState('');
  const [editEventCost, setEditEventCost] = useState('');

  // Attendance Tab States
  const [attendanceSelectedEvent, setAttendanceSelectedEvent] = useState<any | null>(null);
  const [attendanceEventDetails, setAttendanceEventDetails] = useState<{ registeredUsers: any[] } | null>(null);

  // Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 3D Parallax Background
  const bgRef = useRef<HTMLDivElement>(null);

  // Initialize scroll reveal
  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      if (!bgRef.current) return;
      const scrollY = window.scrollY;
      bgRef.current.style.transform = `translateY(${scrollY * 0.35}px) scale(1.08)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!bgRef.current) return;
      const xPercent = (e.clientX / window.innerWidth - 0.5) * 12;
      const yPercent = (e.clientY / window.innerHeight - 0.5) * 8;
      bgRef.current.style.transform = `translate(${xPercent}px, ${yPercent}px) scale(1.08)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  // Calendar State — default to today
  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(todayStr);
  const [eventViewMode, setEventViewMode] = useState<'calendar' | 'timeline'>('calendar');

  // Weekly Schedule State (for suggestions)
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});

  // Add Users to Event modal
  const [isAddUsersToEventOpen, setIsAddUsersToEventOpen] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Mobile detail sheet state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Fetch users when on Add User tab
  useEffect(() => {
    if (activeTab === 'addUser') {
      fetchUsers();
    } else if (activeTab === 'createEvent') {
      fetchEvents();
      fetchUsers();
      fetchWeeklySchedule();
    }
  }, [activeTab]);

  const fetchWeeklySchedule = async () => {
    try {
      const res = await fetch('/api/admin/weekly-schedule');
      const data = await res.json();
      if (data.schedule) {
        const map: Record<string, string[]> = {};
        if (data.schedule && data.schedule.length > 0) {
          const map: Record<string, string[]> = {};
          data.schedule.forEach((s: any) => { map[s.day] = s.services; });
          setWeeklySchedule(map);
        } else {
          // Auto-seed if DB is empty
          await fetch('/api/admin/weekly-schedule/seed', { method: 'POST' });
          const seeded = await fetch('/api/admin/weekly-schedule');
          const seededData = await seeded.json();
          if (seededData.schedule) {
            const map: Record<string, string[]> = {};
            seededData.schedule.forEach((s: any) => { map[s.day] = s.services; });
            setWeeklySchedule(map);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch weekly schedule', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    setUserDetails(null); // reset while loading
    setIsMobileDetailOpen(true);

    try {
      const res = await fetch(`/api/admin/users/${user._id}`);
      const data = await res.json();

      // Always resolve — even if no events registered yet
      const registeredEvents: any[] = data.registeredEvents || [];
      const now = new Date();
      const upcoming: any[] = [];
      const history: any[] = [];

      registeredEvents.forEach((event: any) => {
        // Parse date robustly: event.date is "YYYY-MM-DD", event.time is "HH:MM"
        const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}:00`);
        if (eventDateTime >= now) {
          upcoming.push(event);
        } else {
          history.push(event);
        }
      });

      setUserDetails({ upcoming, history });
    } catch (err) {
      console.error('Failed to fetch user details', err);
      setUserDetails({ upcoming: [], history: [] }); // still clear loading state on error
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, contactNumber: newUserPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Success
      setUsers([data.user, ...users]); // Add to top of list
      setIsModalOpen(false);
      setNewUserName('');
      setNewUserPhone('');
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u._id !== userId));
        setSelectedUser(null);
        setUserDetails(null);
      }
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImportError('');
    setIsImporting(true);

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Read raw rows including header (defval keeps empty cells as '')
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (rawRows.length === 0) throw new Error('The sheet appears to be empty.');

      // ── Foolproof Row-by-Row Detection ──────────────────────────────────
      // Instead of relying on headers or columns, we examine every cell in every row.
      const usersToImport: any[] = [];
      
      rawRows.forEach((row: any[]) => {
        // Skip completely empty rows
        if (!row || !row.some(c => String(c).trim() !== '')) return;

        let detectedName = '';
        const detectedNumbers: string[] = [];

        // Check every cell in this row
        row.forEach(cell => {
          const cellStr = String(cell).trim();
          if (!cellStr) return;

          // Check if this cell contains phone numbers
          const digitsOnly = cellStr.replace(/\D/g, '');
          if (digitsOnly.length >= 10) {
            // It might be one or more phone numbers (e.g., 9876543210 / 1234567890)
            const parts = cellStr.split(/[\/,\n|&]/);
            parts.forEach(part => {
              const d = part.replace(/\D/g, '');
              if (d.length >= 10) {
                detectedNumbers.push(d.slice(-10));
              }
            });
          } 
          // If it's not a phone number, check if it looks like a name
          else if (!detectedName && cellStr.length >= 2 && /[a-zA-Z\u0900-\u097F]/.test(cellStr)) {
            // A name usually doesn't have emails, but might have some numbers
            if (!cellStr.includes('@')) {
               // Avoid picking up header words
               const lower = cellStr.toLowerCase();
               if (!['name', 'phone', 'contact', 'mobile', 's.no', 'sl no', 'sl.no'].includes(lower)) {
                 detectedName = cellStr;
               }
            }
          }
        });

        // Only add if we found a valid name in this row
        if (detectedName) {
          usersToImport.push({
            name: detectedName,
            contactNumber: detectedNumbers.length > 0 ? detectedNumbers.join(' / ') : 'no number'
          });
        }
      });

      if (usersToImport.length === 0) {
        throw new Error('Could not detect valid user data in any row. Please check the file.');
      }

      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersToImport })
      });

      const resultData = await res.json();
      if (!res.ok) throw new Error(resultData.error || 'Failed to import users');

      setIsImportModalOpen(false);
      setImportFile(null);
      alert(`✅ Import complete!\nNew: ${(resultData.insertedCount || 0) + (resultData.upsertedCount || 0)}  |  Updated: ${resultData.modifiedCount || 0}`);
      fetchUsers();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedCalendarDate === formattedDate) {
      setSelectedCalendarDate(null);
    } else {
      setSelectedCalendarDate(formattedDate);
      setSelectedEvent(null);
    }
  };

  const handleAddEventClick = () => {
    // Always pre-fill with calendar date if set, otherwise today
    const dateToUse = selectedCalendarDate || todayStr;
    setNewEventDate(dateToUse);
    setIsEventModalOpen(true);
  };

  const handleRegisterUserToEvent = async (userId: string) => {
    if (!selectedEvent) return;
    setAddingUserId(userId);
    try {
      const res = await fetch(`/api/admin/events/${selectedEvent._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.registeredUsers) {
        setEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to register user', err);
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveUserFromEvent = async (userId: string) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/admin/events/${selectedEvent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.registeredUsers) {
        setEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to remove user', err);
    }
  };

  const handleAddAllUsersToEvent = async () => {
    if (!selectedEvent) return;
    const unaddedUsers = users.filter(user =>
      !eventDetails?.registeredUsers?.some((u: any) => u._id === user._id)
    );
    if (unaddedUsers.length === 0) return;

    setIsAddingAll(true);
    try {
      await Promise.all(
        unaddedUsers.map(user =>
          fetch(`/api/admin/events/${selectedEvent._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id }),
          })
        )
      );

      const res = await fetch(`/api/admin/events/${selectedEvent._id}`);
      const data = await res.json();
      if (data.registeredUsers) {
        setEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to add all users', err);
    } finally {
      setIsAddingAll(false);
    }
  };

  const handleSelectEvent = async (event: any) => {
    setSelectedEvent(event);
    setEventDetails(null);
    setIsMobileDetailOpen(true);

    try {
      const res = await fetch(`/api/admin/events/${event._id}`);
      const data = await res.json();
      if (data.registeredUsers) {
        setEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to fetch event details', err);
    }
  };

  const handleSelectAttendanceEvent = async (event: any) => {
    setAttendanceSelectedEvent(event);
    setAttendanceEventDetails(null);
    setIsMobileDetailOpen(true);

    try {
      const res = await fetch(`/api/admin/events/${event._id}`);
      const data = await res.json();
      if (data.registeredUsers) {
        setAttendanceEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to fetch attendance details', err);
    }
  };

  const exportAttendance = () => {
    if (!attendanceEventDetails || !attendanceEventDetails.registeredUsers) return;
    const usersList = attendanceEventDetails.registeredUsers;
    if (usersList.length === 0) {
      alert("No attendance records to export.");
      return;
    }

    // 1. Prepare Title and Header data
    const eventName = attendanceSelectedEvent?.eventName || 'Event';
    const eventDate = attendanceSelectedEvent?.date || '';
    const eventTime = attendanceSelectedEvent?.time || '';
    const location = attendanceSelectedEvent?.locationAddress || '';

    // Create an array of arrays for the exact layout we want
    const sheetData = [
      [`ATTENDANCE REPORT: ${eventName.toUpperCase()}`],
      [`Date: ${eventDate}   |   Time: ${eventTime}`],
      [`Location: ${location}`],
      [], // Blank row for spacing
      ['S.No', 'Full Name', 'Contact Number'], // Table Headers
    ];

    // Append actual user data rows
    usersList.forEach((u, i) => {
      sheetData.push([i + 1, u.name, u.contactNumber]);
    });

    // 2. Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 3. Set professional column widths
    ws['!cols'] = [
      { wch: 10 }, // A: S.No (wider than default)
      { wch: 35 }, // B: Name (plenty of room for long names)
      { wch: 25 }  // C: Contact Number
    ];

    // 4. Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${eventName}_Attendance.xlsx`);
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventModalError('');
    setIsEventSubmitting(true);

    try {
      const formattedTime = `${newEventHour}:${newEventMinute} ${newEventAmPm}`;
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: newEventName, 
          date: newEventDate, 
          time: formattedTime, 
          locationAddress: newEventLocation, 
          gmapLink: newEventGmapLink,
          travelCost: newEventCost 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      setEvents([data.event, ...events]); 
      setIsEventModalOpen(false);
      setNewEventName('');
      setNewEventDate(todayStr);
      setNewEventHour('06');
      setNewEventMinute('30');
      setNewEventAmPm('AM');
      setNewEventLocation('');
      setNewEventGmapLink('');
      setNewEventCost('');
    } catch (err: any) {
      setEventModalError(err.message);
    } finally {
      setIsEventSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all registrations for it.')) return;
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(events.filter(e => e._id !== eventId));
        setSelectedEvent(null);
        setEventDetails(null);
      }
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  const handleOpenEditEvent = (event: any) => {
    setEditEventId(event._id);
    setEditEventName(event.eventName);
    setEditEventDate(event.date);

    const rawTime = event.time || '';
    let h = '06';
    let m = '00';
    let period: 'AM' | 'PM' = 'AM';

    if (/PM/i.test(rawTime)) period = 'PM';
    else if (/AM/i.test(rawTime)) period = 'AM';

    const clean = rawTime.replace(/\s*(AM|PM|am|pm)/i, '').trim();
    const parts = clean.split(':');
    if (parts.length >= 2) {
      let numH = parseInt(parts[0], 10);
      const numM = parseInt(parts[1], 10);
      if (!isNaN(numH)) {
        if (!/AM|PM/i.test(rawTime) && numH >= 12) period = 'PM';
        numH = numH % 12;
        if (numH === 0) numH = 12;
        h = String(numH).padStart(2, '0');
      }
      if (!isNaN(numM)) {
        m = String(numM).padStart(2, '0');
      }
    }

    setEditEventHour(h);
    setEditEventMinute(m);
    setEditEventAmPm(period);

    setEditEventLocation(event.locationAddress);
    setEditEventGmapLink(event.gmapLink || '');
    setEditEventCost(event.travelCost);
    setIsEditEventModalOpen(true);
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventModalError('');
    setIsEventSubmitting(true);

    try {
      const formattedTime = `${editEventHour}:${editEventMinute} ${editEventAmPm}`;
      const res = await fetch(`/api/admin/events/${editEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: editEventName, 
          date: editEventDate, 
          time: formattedTime, 
          locationAddress: editEventLocation, 
          gmapLink: editEventGmapLink,
          travelCost: editEventCost 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update event');
      }

      setEvents(events.map(ev => ev._id === editEventId ? data.event : ev));
      setSelectedEvent(data.event);
      setIsEditEventModalOpen(false);
    } catch (err: any) {
      setEventModalError(err.message);
    } finally {
      setIsEventSubmitting(false);
    }
  };

  const activeEvents = events.filter(e => isEventUpcoming(e.date));
  const displayedEvents = (selectedCalendarDate ? activeEvents.filter(e => e.date === selectedCalendarDate) : activeEvents);
  return (
    <div className={styles.container}>

      {/* 3D Parallax Background Layer */}
      <div className={styles.bgScene}>
        <div ref={bgRef} className={styles.bgImage} />
        <div className={styles.bgOverlay} />
        {/* Floating ambient orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>DA-ROS Admin</span>
        </div>

        <div className={styles.navTabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'addUser' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('addUser')}
          >
            Add User
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'createEvent' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('createEvent')}
          >
            Create Event
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'attendance' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
        </div>

        <div className={styles.profileArea}>
          <div 
            className={styles.profileCircle} 
            onClick={() => setIsProfileOpen(o => !o)}
            style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
          >
            A
          </div>

          {isProfileOpen && (
            <>
              {/* Backdrop to close on outside click */}
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                onClick={() => setIsProfileOpen(false)} 
              />
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownHeader}>
                  <div className={styles.profileDropdownAvatar}>A</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Admin</div>
                    <div style={{ color: '#888', fontSize: '0.8rem' }}>DA-ROS Admin Panel</div>
                  </div>
                </div>

                <div className={styles.profileDropdownDivider} />

                <a href="/" className={styles.profileDropdownItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </a>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        
        {/* ADD USER SECTION */}
        {activeTab === 'addUser' && (
          <div className={styles.sectionContent} key="addUser">
            
            <div className={`${styles.sectionHeader} ${styles.pageHeader}`}>
              <h2 className={styles.sectionTitle}>User Management</h2>
              <div>
                <button className={styles.btnImport} onClick={() => setIsImportModalOpen(true)}>
                  Import
                </button>
                <button className={styles.btnAddUser} onClick={() => setIsModalOpen(true)}>
                  + Add User
                </button>
              </div>
            </div>

            <div className={styles.usersLayout}>
              {/* Left Column: Users List */}
              <div className={styles.usersSidebar}>
                <div className={styles.sidebarTitle}>Registered Users</div>
                {users.length === 0 ? (
                  <div className={styles.noUsers}>No users found.</div>
                ) : (
                  users.map(user => (
                    <div 
                      key={user._id} 
                      className={`${styles.userListItem} ${selectedUser?._id === user._id ? styles.activeUser : ''}`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <span className={styles.userName}>{user.name}</span>
                      <span className={styles.userPhone}>{user.contactNumber}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Middle Column: User Details */}
              <div className={`${styles.userDetailsArea} ${styles.userDetailsAreaDesktop}`}>
                {!selectedUser ? (
                  <div className={styles.emptyState}>Select a user from the left to view their details.</div>
                ) : (
                  <>
                    <div className={styles.detailsHeader}>
                      <div className={styles.detailsTitleArea}>
                        <h3 className={styles.detailsTitle}>{selectedUser.name}</h3>
                        <a href={`tel:${selectedUser.contactNumber}`} className={styles.detailsPhone} style={{ textDecoration: 'none' }}>{selectedUser.contactNumber}</a>
                      </div>
                      <button 
                        className={styles.btnDelete}
                        onClick={() => handleDeleteUser(selectedUser._id)}
                      >
                        Delete User
                      </button>
                    </div>

                    <div className={styles.eventsGrid}>
                      <div>
                        <h4 className={styles.eventsSectionTitle}>Upcoming Events</h4>
                        {!userDetails ? (
                          <div className={styles.noEvents} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                            Loading...
                          </div>
                        ) : userDetails.upcoming.length === 0 ? (
                          <div className={styles.noEvents}>No upcoming registrations.</div>
                        ) : (
                          userDetails.upcoming.map(ev => (
                            <div key={ev._id} className={styles.eventCard}>
                              <h4 style={{ margin: '0 0 0.25rem' }}>{ev.eventName}</h4>
                              <p style={{ margin: 0, color: 'var(--crimson)', fontSize: '0.85rem' }}>{ev.date} &bull; {ev.time}</p>
                              {ev.locationAddress && <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.78rem' }}>{ev.locationAddress}</p>}
                            </div>
                          ))
                        )}
                      </div>

                      <div>
                        <h4 className={styles.eventsSectionTitle}>History</h4>
                        {!userDetails ? (
                          <div className={styles.noEvents} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                            Loading...
                          </div>
                        ) : userDetails.history.length === 0 ? (
                          <div className={styles.noEvents}>No past events attended.</div>
                        ) : (
                          userDetails.history.map(ev => (
                            <div key={ev._id} className={styles.eventCard} style={{ opacity: 0.7 }}>
                              <h4 style={{ margin: '0 0 0.25rem' }}>{ev.eventName}</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>{ev.date} &bull; {ev.time}</p>
                              {ev.locationAddress && <p style={{ margin: '0.2rem 0 0', color: '#555', fontSize: '0.78rem' }}>{ev.locationAddress}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Add User Modal */}
            {isModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3 className={styles.modalTitle}>Add New User</h3>
                  {modalError && <div style={{ color: 'var(--crimson)', marginBottom: '1rem', fontSize: '0.9rem' }}>{modalError}</div>}
                  
                  <form onSubmit={handleAddUserSubmit}>
                    <div className={styles.formGroup}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={newUserName} 
                        onChange={e => setNewUserName(e.target.value)} 
                        required 
                        placeholder="John Doe"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Contact Number</label>
                      <input 
                        type="tel" 
                        value={newUserPhone} 
                        onChange={e => setNewUserPhone(e.target.value)} 
                        required 
                        maxLength={10}
                        placeholder="10-digit number"
                      />
                    </div>
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsModalOpen(false)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add User'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Import Users Modal */}
            {isImportModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3 className={styles.modalTitle}>Import Users (Excel)</h3>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Upload an .xlsx or .csv file. The app will automatically detect columns containing names and 10-digit phone numbers.
                  </p>
                  {importError && <div style={{ color: 'var(--crimson)', marginBottom: '1rem', fontSize: '0.9rem' }}>{importError}</div>}
                  
                  <form onSubmit={handleImportSubmit}>
                    <div className={styles.formGroup}>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                        required
                        style={{ border: 'none', padding: 0 }}
                      />
                    </div>
                    
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportError(''); }}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isImporting || !importFile}>
                        {isImporting ? 'Importing...' : 'Upload & Import'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}
        
        {/* CREATE EVENT SECTION */}
        {activeTab === 'createEvent' && (
          <div className={styles.sectionContent} key="createEvent">
            <div className={`${styles.sectionHeader} ${styles.pageHeader}`}>
              <h2 className={styles.sectionTitle}>Event Management</h2>
              <button className={styles.btnAddUser} onClick={handleAddEventClick}>
                + Add Event
              </button>
            </div>

            <div className={styles.usersLayout}>
              {/* Left Column: Events List */}
              <div className={styles.eventSidebar}>
                
                {/* VIEW TOGGLE */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px', marginBottom: '1rem' }}>
                  <button 
                    onClick={() => setEventViewMode('calendar')}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: eventViewMode === 'calendar' ? 'var(--crimson)' : 'transparent', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => setEventViewMode('timeline')}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: eventViewMode === 'timeline' ? 'var(--crimson)' : 'transparent', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    Timeline
                  </button>
                </div>

                {eventViewMode === 'calendar' ? (
                  <div className={styles.calendarCard}>
                    {/* CALENDAR CARD */}
                    <div className={styles.calendarHeader}>
                      <button className={styles.calendarNavBtn} onClick={handlePrevMonth}>&lt;</button>
                      <h4>{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                      <button className={styles.calendarNavBtn} onClick={handleNextMonth}>&gt;</button>
                    </div>
                    <div className={styles.calendarGrid}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className={styles.calendarDayName}>{day}</div>
                      ))}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }).map((_, i) => (
                        <div key={`empty-${i}`} className={`${styles.calendarDate} ${styles.emptyDate}`}></div>
                      ))}
                      {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }).map((_, i) => {
                        const day = i + 1;
                        const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasEvent = events.some(e => e.date === formattedDate);
                        const isActive = selectedCalendarDate === formattedDate;
                        return (
                          <div 
                            key={day} 
                            className={`${styles.calendarDate} ${isActive ? styles.activeDate : ''} ${hasEvent ? styles.hasEvent : ''}`}
                            onClick={() => handleDateClick(day)}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                    {selectedCalendarDate && selectedCalendarDate !== todayStr && (
                      <button className={styles.calendarClearBtn} onClick={() => setSelectedCalendarDate(todayStr)}>
                        Back to Today
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={styles.calendarCard} style={{ maxHeight: '420px', overflowY: 'auto', padding: '1rem' }}>
                    {/* TIMELINE VIEW */}
                    {activeEvents.length === 0 ? (
                      <div style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>No upcoming events</div>
                    ) : (
                      [...activeEvents]
                        .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())
                        .map(event => {
                          const isSelected = selectedEvent?._id === event._id;
                          return (
                            <div 
                              key={event._id}
                              onClick={() => handleSelectEvent(event)}
                              style={{ 
                                display: 'flex', 
                                gap: '1rem', 
                                marginBottom: '0.75rem', 
                                padding: '0.75rem 1rem', 
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(220, 20, 60, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: isSelected ? '1px solid var(--crimson)' : '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{ minWidth: '85px', color: 'var(--crimson)', fontSize: '0.9rem' }}>
                                <div style={{ fontWeight: 'bold' }}>{new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                <div>{formatTimeWithAmPm(event.time)}</div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{event.eventName}</div>
                                {event.locationAddress && <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px' }}>{event.locationAddress}</div>}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}

                <div className={styles.sidebarTitle}>Created Events</div>
                {displayedEvents.length === 0 ? (
                  <div className={styles.noUsers}>No events found.</div>
                ) : (
                  displayedEvents.map(event => {
                    const upcoming = isEventUpcoming(event.date);
                    return (
                      <div 
                        key={event._id} 
                        className={`${styles.userListItem} ${selectedEvent?._id === event._id ? styles.activeUser : ''}`}
                        onClick={() => handleSelectEvent(event)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span className={styles.userName}>{event.eventName}</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: upcoming ? 'rgba(220,20,60,0.2)' : 'rgba(255,255,255,0.08)',
                            color: upcoming ? 'var(--crimson)' : '#888',
                            border: upcoming ? '1px solid rgba(220,20,60,0.4)' : '1px solid rgba(255,255,255,0.1)'
                          }}>
                            {upcoming ? 'UPCOMING' : 'PAST'}
                          </span>
                        </div>
                        <span className={styles.userPhone}>{event.date} - {formatTimeWithAmPm(event.time)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Middle Column: Event Details */}
              <div className={`${styles.userDetailsArea} ${styles.userDetailsAreaDesktop}`}>
                {!selectedEvent ? (
                  <div className={styles.emptyState}>Select an event from the left to view its details.</div>
                ) : (
                  <>
                    <div className={styles.detailsHeader}>
                      <div className={styles.detailsTitleArea}>
                        <h3 className={styles.detailsTitle}>{selectedEvent.eventName}</h3>
                        <div className={styles.detailsPhone}>{selectedEvent.date} | {formatTimeWithAmPm(selectedEvent.time)}</div>
                        <div style={{color: '#888', marginTop: '0.5rem'}}>Estimated Travel Cost: ₹{selectedEvent.travelCost}</div>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <button 
                          className={styles.btnEdit}
                          onClick={() => handleOpenEditEvent(selectedEvent)}
                        >
                          Edit
                        </button>
                        <button 
                          className={styles.btnDelete}
                          onClick={() => handleDeleteEvent(selectedEvent._id)}
                        >
                          Delete Event
                        </button>
                      </div>
                    </div>

                    <div className={styles.eventsGrid}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <h4 className={styles.eventsSectionTitle}>Location</h4>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>{selectedEvent.locationAddress}</p>
                        
                        <div className={styles.mapContainer}>
                          <iframe
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={
                              selectedEvent.gmapLink && selectedEvent.gmapLink.includes('embed') 
                                ? selectedEvent.gmapLink.replace(/<iframe.*src="([^"]*)".*<\/iframe>/, '$1')
                                : `https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.gmapLink || selectedEvent.locationAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                            }
                          ></iframe>
                        </div>
                      </div>

                      <div style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h4 className={styles.eventsSectionTitle}>Registered Users ({eventDetails?.registeredUsers?.length || 0})</h4>
                          <button
                            className={styles.btnEdit}
                            onClick={() => setIsAddUsersToEventOpen(true)}
                          >
                            + Add Users
                          </button>
                        </div>
                        {!eventDetails ? (
                          <div className={styles.noEvents}>Loading...</div>
                        ) : eventDetails.registeredUsers.length === 0 ? (
                          <div className={styles.noEvents}>No users registered yet.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {eventDetails.registeredUsers.map(user => (
                              <div key={user._id} style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{user.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <a 
                                    href={`tel:${user.contactNumber}`} 
                                    style={{ color: 'var(--crimson)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    📞 {user.contactNumber}
                                  </a>
                                  <button
                                    onClick={() => handleRemoveUserFromEvent(user._id)}
                                    title="Remove from event"
                                    style={{
                                      background: 'rgba(220,20,60,0.1)',
                                      border: '1px solid rgba(220,20,60,0.3)',
                                      color: 'var(--crimson)',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      cursor: 'pointer',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'var(--crimson)'; (e.target as HTMLButtonElement).style.color = '#fff'; }}
                                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(220,20,60,0.1)'; (e.target as HTMLButtonElement).style.color = 'var(--crimson)'; }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Add Users to Event Modal */}
            {isAddUsersToEventOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3 className={styles.modalTitle}>Add Users to Event</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                    <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                      Select users to add to <strong style={{ color: '#fff' }}>{selectedEvent?.eventName}</strong>
                    </p>
                    {users.some(user => !eventDetails?.registeredUsers?.some((u: any) => u._id === user._id)) && (
                      <button
                        onClick={handleAddAllUsersToEvent}
                        disabled={isAddingAll}
                        style={{
                          background: 'rgba(220, 20, 60, 0.15)',
                          border: '1px solid var(--crimson)',
                          color: '#fff',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isAddingAll ? 'not-allowed' : 'pointer',
                          opacity: isAddingAll ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {isAddingAll ? (
                          <>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Adding All...
                          </>
                        ) : (
                          '✓ Select All'
                        )}
                      </button>
                    )}
                  </div>

                  {users.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>No users in database.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                      {users.map(user => {
                        const alreadyAdded = eventDetails?.registeredUsers?.some(u => u._id === user._id);
                        return (
                          <div
                            key={user._id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.9rem 1rem',
                              background: alreadyAdded ? 'rgba(220,20,60,0.08)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${alreadyAdded ? 'rgba(220,20,60,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '8px',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{user.name}</div>
                              <a 
                                href={`tel:${user.contactNumber}`} 
                                style={{ fontSize: '0.8rem', color: '#888', textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                📞 {user.contactNumber}
                              </a>
                            </div>
                            {alreadyAdded ? (
                              <span style={{ fontSize: '0.78rem', color: 'var(--crimson)', fontWeight: 600 }}>✓ Added</span>
                            ) : (
                              <button
                                onClick={() => handleRegisterUserToEvent(user._id)}
                                disabled={addingUserId === user._id}
                                style={{
                                  width: '32px', height: '32px',
                                  borderRadius: '50%',
                                  background: 'var(--crimson)',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: '1.3rem',
                                  cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'opacity 0.2s',
                                  opacity: addingUserId === user._id ? 0.5 : 1,
                                  flexShrink: 0,
                                }}
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                    <button className={styles.btnSecondary} onClick={() => setIsAddUsersToEventOpen(false)}>Done</button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Event Modal */}
            {isEventModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3 className={styles.modalTitle}>Add New Event</h3>
                  {eventModalError && <div style={{ color: 'var(--crimson)', marginBottom: '1rem', fontSize: '0.9rem' }}>{eventModalError}</div>}
                  
                  <form onSubmit={handleAddEventSubmit}>
                    <div className={styles.formGroup}>
                      <label>Event Name</label>
                      <input 
                        type="text" 
                        value={newEventName} 
                        onChange={e => setNewEventName(e.target.value)} 
                        required 
                        placeholder="e.g. Sunday Worship Service"
                      />
                      {/* Suggestions based on selected day - use calendar date OR typed date */}
                      {(() => {
                        const dateStr = newEventDate || selectedCalendarDate || '';
                        if (!dateStr) return null;
                        const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
                        const suggestions = weeklySchedule[dayName] || [];
                        return suggestions.length > 0 ? (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.6rem', marginBottom: '0.4rem' }}>
                              Suggestions for {dayName}:
                            </div>
                            <div className={styles.suggestionChips}>
                              {suggestions.map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  className={styles.suggestionChip}
                                  onClick={() => setNewEventName(s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>
                          Date
                          {newEventDate && (
                            <span style={{ color: 'var(--crimson)', marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.8rem' }}>
                              — {new Date(newEventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                          )}
                        </label>
                        <input 
                          type="date" 
                          value={newEventDate} 
                          onChange={e => setNewEventDate(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1.3 }}>
                        <label>Time</label>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <select
                            value={newEventHour}
                            onChange={e => setNewEventHour(e.target.value)}
                            style={{
                              flex: 1,
                              background: '#0a0a0d',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                              <option key={h} value={h} style={{ background: '#141418', color: '#fff' }}>{h}</option>
                            ))}
                          </select>

                          <span style={{ fontWeight: 700, color: '#888', fontSize: '1.1rem' }}>:</span>

                          <select
                            value={newEventMinute}
                            onChange={e => setNewEventMinute(e.target.value)}
                            style={{
                              flex: 1,
                              background: '#0a0a0d',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                              <option key={m} value={m} style={{ background: '#141418', color: '#fff' }}>{m}</option>
                            ))}
                          </select>

                          <select
                            value={newEventAmPm}
                            onChange={e => setNewEventAmPm(e.target.value as 'AM' | 'PM')}
                            style={{
                              flex: 1.1,
                              background: 'var(--crimson)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <option value="AM" style={{ background: '#141418', color: '#fff' }}>AM</option>
                            <option value="PM" style={{ background: '#141418', color: '#fff' }}>PM</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Location (Physical Address)</label>
                      <input 
                        type="text" 
                        value={newEventLocation} 
                        onChange={e => setNewEventLocation(e.target.value)} 
                        required 
                        placeholder="e.g. 123 Church St, City, Country"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Google Maps Link (Optional)</label>
                      <input 
                        type="text" 
                        value={newEventGmapLink} 
                        onChange={e => setNewEventGmapLink(e.target.value)} 
                        placeholder="Map query or embed URL"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Travel Cost (₹)</label>
                      <input 
                        type="number" 
                        value={newEventCost} 
                        onChange={e => setNewEventCost(e.target.value)} 
                        required 
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsEventModalOpen(false)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isEventSubmitting}>
                        {isEventSubmitting ? 'Creating...' : 'Create Event'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Event Modal */}
            {isEditEventModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3 className={styles.modalTitle}>Edit Event</h3>
                  {eventModalError && <div style={{ color: 'var(--crimson)', marginBottom: '1rem', fontSize: '0.9rem' }}>{eventModalError}</div>}
                  
                  <form onSubmit={handleEditEventSubmit}>
                    <div className={styles.formGroup}>
                      <label>Event Name</label>
                      <input 
                        type="text" 
                        value={editEventName} 
                        onChange={e => setEditEventName(e.target.value)} 
                        required 
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Date</label>
                        <input 
                          type="date" 
                          value={editEventDate} 
                          onChange={e => setEditEventDate(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1.3 }}>
                        <label>Time</label>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <select
                            value={editEventHour}
                            onChange={e => setEditEventHour(e.target.value)}
                            style={{
                              flex: 1,
                              background: '#0a0a0d',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                              <option key={h} value={h} style={{ background: '#141418', color: '#fff' }}>{h}</option>
                            ))}
                          </select>

                          <span style={{ fontWeight: 700, color: '#888', fontSize: '1.1rem' }}>:</span>

                          <select
                            value={editEventMinute}
                            onChange={e => setEditEventMinute(e.target.value)}
                            style={{
                              flex: 1,
                              background: '#0a0a0d',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                              <option key={m} value={m} style={{ background: '#141418', color: '#fff' }}>{m}</option>
                            ))}
                          </select>

                          <select
                            value={editEventAmPm}
                            onChange={e => setEditEventAmPm(e.target.value as 'AM' | 'PM')}
                            style={{
                              flex: 1.1,
                              background: 'var(--crimson)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.8rem 0.4rem',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <option value="AM" style={{ background: '#141418', color: '#fff' }}>AM</option>
                            <option value="PM" style={{ background: '#141418', color: '#fff' }}>PM</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Location (Physical Address)</label>
                      <input 
                        type="text" 
                        value={editEventLocation} 
                        onChange={e => setEditEventLocation(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Google Maps Link (Optional)</label>
                      <input 
                        type="text" 
                        value={editEventGmapLink} 
                        onChange={e => setEditEventGmapLink(e.target.value)} 
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Travel Cost (₹)</label>
                      <input 
                        type="number" 
                        value={editEventCost} 
                        onChange={e => setEditEventCost(e.target.value)} 
                        required 
                        min="0"
                      />
                    </div>

                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsEditEventModalOpen(false)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isEventSubmitting}>
                        {isEventSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* ATTENDANCE SECTION */}
        {activeTab === 'attendance' && (
          <div className={styles.sectionContent} key="attendance">
            
            <div className={`${styles.sectionHeader} ${styles.pageHeader}`}>
              <h2 className={styles.sectionTitle}>Attendance Dashboard</h2>
            </div>

            <div className={styles.usersLayout}>
              {/* Left Column: Event List */}
              <div className={styles.eventSidebar}>
                <div className={styles.sidebarTitle}>Select Event</div>
                
                {activeEvents.length === 0 ? (
                  <div className={styles.noUsers}>No upcoming events found.</div>
                ) : (
                  activeEvents.map(event => {
                    const upcoming = isEventUpcoming(event.date);
                    return (
                      <div 
                        key={event._id} 
                        className={`${styles.userListItem} ${attendanceSelectedEvent?._id === event._id ? styles.activeUser : ''}`}
                        onClick={() => handleSelectAttendanceEvent(event)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span className={styles.userName}>{event.eventName}</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: upcoming ? 'rgba(220,20,60,0.2)' : 'rgba(255,255,255,0.08)',
                            color: upcoming ? 'var(--crimson)' : '#888',
                            border: upcoming ? '1px solid rgba(220,20,60,0.4)' : '1px solid rgba(255,255,255,0.1)'
                          }}>
                            {upcoming ? 'UPCOMING' : 'PAST'}
                          </span>
                        </div>
                        <span className={styles.userPhone}>{event.date} at {formatTimeWithAmPm(event.time)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Attendance Details */}
              <div className={`${styles.userDetailsArea} ${styles.userDetailsAreaDesktop}`}>
                {!attendanceSelectedEvent ? (
                  <div className={styles.emptyState}>Select an event from the left to view attendance.</div>
                ) : (
                  <>
                    <div className={styles.detailsHeader}>
                      <div className={styles.detailsTitleArea}>
                        <h3 className={styles.detailsTitle}>{attendanceSelectedEvent.eventName}</h3>
                        <div className={styles.detailsPhone}>{attendanceSelectedEvent.date} &bull; {formatTimeWithAmPm(attendanceSelectedEvent.time)}</div>
                        {attendanceSelectedEvent.locationAddress && <div style={{color: '#888', marginTop: '0.5rem', fontSize: '0.9rem'}}>{attendanceSelectedEvent.locationAddress}</div>}
                      </div>
                      
                      <button 
                        className={styles.btnAddUser}
                        onClick={exportAttendance}
                        disabled={!attendanceEventDetails?.registeredUsers?.length}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !attendanceEventDetails?.registeredUsers?.length ? 0.5 : 1 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Excel
                      </button>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 className={styles.eventsSectionTitle}>Registered Users</h4>
                      
                      {!attendanceEventDetails ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                           <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                           Loading attendance...
                        </div>
                      ) : attendanceEventDetails.registeredUsers.length === 0 ? (
                        <p style={{ color: '#888', fontStyle: 'italic' }}>No users are registered for this event yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {attendanceEventDetails.registeredUsers.map((user: any) => (
                            <div key={user._id} style={{ 
                                background: 'rgba(255, 255, 255, 0.03)', 
                                padding: '1rem', 
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}>
                              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>{user.name}</h4>
                              <a 
                                href={`tel:${user.contactNumber}`}
                                style={{ 
                                  color: 'var(--crimson)', 
                                  fontSize: '0.9rem', 
                                  textDecoration: 'none', 
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '2px',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                📞 {user.contactNumber}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className={styles.bottomNav}>
        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'addUser' ? styles.bottomNavItemActive : ''}`}
          onClick={() => { setActiveTab('addUser'); setIsMobileDetailOpen(false); }}
        >
          <span className={styles.bottomNavIcon}>👥</span>
          <span>Users</span>
        </button>
        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'createEvent' ? styles.bottomNavItemActive : ''}`}
          onClick={() => { setActiveTab('createEvent'); setIsMobileDetailOpen(false); }}
        >
          <span className={styles.bottomNavIcon}>📅</span>
          <span>Events</span>
        </button>
        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'attendance' ? styles.bottomNavItemActive : ''}`}
          onClick={() => { setActiveTab('attendance'); setIsMobileDetailOpen(false); }}
        >
          <span className={styles.bottomNavIcon}>📋</span>
          <span>Attendance</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Detail Modal */}
      {isMobileDetailOpen && (
        <div className={styles.mobileSheetOverlay} onClick={() => setIsMobileDetailOpen(false)}>
          <div className={styles.mobileSheetContent} onClick={e => e.stopPropagation()}>
            <div className={styles.mobileSheetHeader}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                {activeTab === 'addUser' ? 'User Details' : activeTab === 'createEvent' ? 'Event Details' : 'Attendance Details'}
              </div>
              <button className={styles.mobileSheetCloseBtn} onClick={() => setIsMobileDetailOpen(false)}>✕</button>
            </div>

            {/* Mobile Content for Add User Tab */}
            {activeTab === 'addUser' && selectedUser && (
              <>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitleArea}>
                    <h3 className={styles.detailsTitle}>{selectedUser.name}</h3>
                    <a href={`tel:${selectedUser.contactNumber}`} className={styles.detailsPhone} style={{ textDecoration: 'none' }}>
                      📞 {selectedUser.contactNumber}
                    </a>
                  </div>
                  <button 
                    className={styles.btnDelete}
                    onClick={() => { handleDeleteUser(selectedUser._id); setIsMobileDetailOpen(false); }}
                  >
                    Delete User
                  </button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 className={styles.eventsSectionTitle}>Upcoming Events</h4>
                  {!userDetails ? (
                    <div className={styles.noEvents}>Loading...</div>
                  ) : userDetails.upcoming.length === 0 ? (
                    <div className={styles.noEvents}>No upcoming registrations.</div>
                  ) : (
                    userDetails.upcoming.map(ev => (
                      <div key={ev._id} className={styles.eventCard} style={{ marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem' }}>{ev.eventName}</h4>
                        <p style={{ margin: 0, color: 'var(--crimson)', fontSize: '0.85rem' }}>{ev.date} &bull; {ev.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Mobile Content for Event Tab */}
            {activeTab === 'createEvent' && selectedEvent && (
              <>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitleArea}>
                    <h3 className={styles.detailsTitle}>{selectedEvent.eventName}</h3>
                    <div className={styles.detailsPhone}>{selectedEvent.date} | {formatTimeWithAmPm(selectedEvent.time)}</div>
                    <div style={{color: '#888', marginTop: '0.4rem', fontSize: '0.85rem'}}>Cost: ₹{selectedEvent.travelCost}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      className={styles.btnEdit}
                      onClick={() => { setIsMobileDetailOpen(false); handleOpenEditEvent(selectedEvent); }}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.btnDelete}
                      onClick={() => { handleDeleteEvent(selectedEvent._id); setIsMobileDetailOpen(false); }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 className={styles.eventsSectionTitle}>Registered Users ({eventDetails?.registeredUsers?.length || 0})</h4>
                    <button
                      className={styles.btnEdit}
                      onClick={() => { setIsMobileDetailOpen(false); setIsAddUsersToEventOpen(true); }}
                    >
                      + Add Users
                    </button>
                  </div>
                  {!eventDetails ? (
                    <div className={styles.noEvents}>Loading...</div>
                  ) : eventDetails.registeredUsers.length === 0 ? (
                    <div className={styles.noEvents}>No users registered yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {eventDetails.registeredUsers.map(user => (
                        <div key={user._id} style={{ padding: '0.75rem 0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</span>
                          <a href={`tel:${user.contactNumber}`} style={{ color: 'var(--crimson)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                            📞 {user.contactNumber}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Content for Attendance Tab */}
            {activeTab === 'attendance' && attendanceSelectedEvent && (
              <>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitleArea}>
                    <h3 className={styles.detailsTitle}>{attendanceSelectedEvent.eventName}</h3>
                    <div className={styles.detailsPhone}>{attendanceSelectedEvent.date} &bull; {formatTimeWithAmPm(attendanceSelectedEvent.time)}</div>
                  </div>
                  <button 
                    className={styles.btnAddUser}
                    onClick={exportAttendance}
                    disabled={!attendanceEventDetails?.registeredUsers?.length}
                    style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    Export Excel
                  </button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 className={styles.eventsSectionTitle}>Registered Users</h4>
                  {!attendanceEventDetails ? (
                    <div className={styles.noEvents}>Loading...</div>
                  ) : attendanceEventDetails.registeredUsers.length === 0 ? (
                    <div className={styles.noEvents}>No users registered yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {attendanceEventDetails.registeredUsers.map((user: any) => (
                        <div key={user._id} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: '10px' }}>
                          <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>{user.name}</h4>
                          <a href={`tel:${user.contactNumber}`} style={{ color: 'var(--crimson)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                            📞 {user.contactNumber}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
