"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { formatTimeWithAmPm, isEventUpcoming } from '@/lib/formatTime';
import styles from './page.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'addUser' | 'createEvent' | 'attendance'>('addUser');

  // Add User Tab States
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<{ upcoming: any[], history: any[] } | null>(null);

  // Category Management State
  const [categories, setCategories] = useState<{ _id: string; name: string; color?: string }[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // Search & Filter state for Users
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserCategory, setNewUserCategory] = useState<string>('General');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserCategory, setEditUserCategory] = useState<string>('General');

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
  const [newEventOrganizerPhone, setNewEventOrganizerPhone] = useState('');
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
  const [editEventOrganizerPhone, setEditEventOrganizerPhone] = useState('');

  // Attendance Tab States
  const [attendanceSelectedEvent, setAttendanceSelectedEvent] = useState<any | null>(null);
  const [attendanceEventDetails, setAttendanceEventDetails] = useState<{
    attendances?: any[];
    registeredUsers?: any[];
    totalMembers?: number;
    totalGuests?: number;
    totalHeadcount?: number;
    presentCount?: number;
    absentCount?: number;
    registeredCount?: number;
  } | null>(null);
  const [attendanceFilterMode, setAttendanceFilterMode] = useState<'all' | 'upcoming' | 'past'>('all');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');

  // Direct Registration State (from Attendance Dashboard)
  const [isRegMemberModalOpen, setIsRegMemberModalOpen] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCategoryFilter, setRegCategoryFilter] = useState<string>('All');
  const [regGuestCounts, setRegGuestCounts] = useState<Record<string, number>>({});
  const [regGuestNamesMap, setRegGuestNamesMap] = useState<Record<string, string>>({});
  const [regSubmittingUserId, setRegSubmittingUserId] = useState<string | null>(null);

  // Direct Registration State (from User Management Tab)
  const [isUserRegEventModalOpen, setIsUserRegEventModalOpen] = useState(false);
  const [userRegSelectedEventId, setUserRegSelectedEventId] = useState<string>('');
  const [userRegAdditionalCount, setUserRegAdditionalCount] = useState<number>(0);
  const [userRegGuestNames, setUserRegGuestNames] = useState<string>('');
  const [isUserRegSubmitting, setIsUserRegSubmitting] = useState(false);
  const [userRegError, setUserRegError] = useState<string>('');

  // Broadcast & Batch Attendance State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'announcement' | 'reminder'>('announcement');
  const [broadcastCopied, setBroadcastCopied] = useState(false);

  // Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 3D Parallax Background
  const bgRef = useRef<HTMLDivElement>(null);

  // Initialize scroll reveal
  useScrollReveal();

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let scrollY = 0;
    let rafId: number | null = null;

    const updateTransform = () => {
      if (bgRef.current) {
        const xPercent = (mouseX / window.innerWidth - 0.5) * 12;
        const yPercent = (mouseY / window.innerHeight - 0.5) * 8 + (scrollY * 0.2);
        bgRef.current.style.transform = `translate3d(${xPercent.toFixed(2)}px, ${yPercent.toFixed(2)}px, 0px) scale(1.08)`;
      }
      rafId = null;
    };

    const requestUpdate = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(updateTransform);
      }
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      requestUpdate();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      requestUpdate();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
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

  // Weekly Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});

  // Add Users to Event modal
  const [isAddUsersToEventOpen, setIsAddUsersToEventOpen] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Mobile detail sheet state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    const headers = new Headers(options.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  }, []);

  // Admin authentication check on mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login?mode=admin');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'admin') {
          router.push('/login?mode=admin');
          return;
        }
      } catch (err) {
        router.push('/login?mode=admin');
      }
    };
    checkAdminAuth();
  }, [router, authFetch]);

  const handleAdminLogout = async () => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('auth-token');
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to logout', err);
    } finally {
      window.location.href = '/login?mode=admin';
    }
  };


  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    setCategoryError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');

      setCategories(data.categories || []);
      setNewCategoryName('');
    } catch (err: any) {
      setCategoryError(err.message);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  // Fetch users when on Add User tab
  useEffect(() => {
    fetchCategories();
    if (activeTab === 'addUser') {
      fetchUsers();
    } else if (activeTab === 'createEvent') {
      fetchEvents();
      fetchUsers();
      fetchWeeklySchedule();
    } else if (activeTab === 'attendance') {
      fetchEvents(true);
      fetchUsers();
    }
  }, [activeTab]);

  const fetchWeeklySchedule = async () => {
    try {
      const res = await authFetch('/api/admin/weekly-schedule');
      const data = await res.json();
      if (data.schedule && data.schedule.length > 0) {
        const map: Record<string, string[]> = {};
        data.schedule.forEach((s: any) => { map[s.day] = s.services; });
        setWeeklySchedule(map);
      } else {
        await authFetch('/api/admin/weekly-schedule/seed', { method: 'POST' });
        const seeded = await authFetch('/api/admin/weekly-schedule');
        const seededData = await seeded.json();
        if (seededData.schedule) {
          const map: Record<string, string[]> = {};
          seededData.schedule.forEach((s: any) => { map[s.day] = s.services; });
          setWeeklySchedule(map);
        }
      }
    } catch (err) {
      console.error('Failed to fetch weekly schedule', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchEvents = async (autoSelectAttendance = false) => {
    try {
      const res = await authFetch('/api/admin/events');
      const data = await res.json();
      const loadedEvents = data.events || [];
      setEvents(loadedEvents);

      if (autoSelectAttendance && loadedEvents.length > 0) {
        handleSelectAttendanceEvent(loadedEvents[0]);
      } else if (autoSelectAttendance && loadedEvents.length === 0) {
        setAttendanceEventDetails({
          attendances: [],
          registeredUsers: [],
          totalMembers: 0,
          totalGuests: 0,
          totalHeadcount: 0,
          presentCount: 0,
          absentCount: 0,
          registeredCount: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
      if (autoSelectAttendance) {
        setAttendanceEventDetails({
          attendances: [],
          registeredUsers: [],
          totalMembers: 0,
          totalGuests: 0,
          totalHeadcount: 0,
          presentCount: 0,
          absentCount: 0,
          registeredCount: 0
        });
      }
    }
  };

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    setUserDetails(null);
    setIsMobileDetailOpen(true);

    try {
      const res = await fetch(`/api/admin/users/${user._id}`);
      const data = await res.json();

      const registeredEvents: any[] = data.registeredEvents || [];
      const now = new Date();
      const upcoming: any[] = [];
      const history: any[] = [];

      registeredEvents.forEach((event: any) => {
        if (isEventUpcoming(event.date)) {
          upcoming.push(event);
        } else {
          history.push(event);
        }
      });

      setUserDetails({ upcoming, history });
    } catch (err) {
      console.error('Failed to fetch user details', err);
      setUserDetails({ upcoming: [], history: [] });
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
        body: JSON.stringify({ 
          name: newUserName, 
          contactNumber: newUserPhone,
          category: newUserCategory 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUsers([data.user, ...users]);
      setIsModalOpen(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserCategory('General');
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditUser = (user: any) => {
    setEditUserId(user._id);
    setEditUserName(user.name);
    setEditUserPhone(user.contactNumber);
    setEditUserCategory(user.category || 'General');
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${editUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editUserName, 
          contactNumber: editUserPhone,
          category: editUserCategory 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setUsers(users.map(u => u._id === editUserId ? data.user : u));
      if (selectedUser?._id === editUserId) {
        setSelectedUser(data.user);
      }
      setIsEditUserModalOpen(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also remove all their registrations.')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

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
      const dataBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const usersToImport: any[] = [];
      
      rawRows.forEach((row: any[]) => {
        if (!row || !row.some(c => String(c).trim() !== '')) return;

        let detectedName = '';
        const detectedNumbers: string[] = [];

        row.forEach(cell => {
          const cellStr = String(cell).trim();
          if (!cellStr) return;

          const digitsOnly = cellStr.replace(/\D/g, '');
          if (digitsOnly.length >= 10) {
            const parts = cellStr.split(/[\/,\n|&]/);
            parts.forEach(part => {
              const d = part.replace(/\D/g, '');
              if (d.length >= 10) {
                detectedNumbers.push(d.slice(-10));
              }
            });
          } else if (!detectedName && cellStr.length >= 2 && /[a-zA-Z\u0900-\u097F]/.test(cellStr)) {
            if (!cellStr.includes('@')) {
               const lower = cellStr.toLowerCase();
               if (!['name', 'phone', 'contact', 'mobile', 's.no', 'sl no', 'sl.no'].includes(lower)) {
                 detectedName = cellStr;
               }
            }
          }
        });

        if (detectedName) {
          usersToImport.push({
            name: detectedName,
            contactNumber: detectedNumbers.length > 0 ? detectedNumbers.join(' / ') : 'no number',
            category: 'General'
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
        body: JSON.stringify({ userId, action: 'delete' }),
      });
      const data = await res.json();
      if (res.ok && data.registeredUsers) {
        setEventDetails({ registeredUsers: data.registeredUsers });
      }
    } catch (err) {
      console.error('Failed to remove user', err);
    }
  };

  const handleSelectAttendanceEvent = async (event: any) => {
    if (!event) return;
    setAttendanceSelectedEvent(event);
    setAttendanceEventDetails(null);
    setIsMobileDetailOpen(true);

    try {
      const res = await authFetch(`/api/admin/events/${event._id}`);
      const data = await res.json();
      setAttendanceEventDetails({
        attendances: data.attendances || [],
        registeredUsers: data.registeredUsers || [],
        totalMembers: data.totalMembers || (data.registeredUsers ? data.registeredUsers.length : 0),
        totalGuests: data.totalGuests || 0,
        totalHeadcount: data.totalHeadcount || (data.registeredUsers ? data.registeredUsers.length : 0),
        presentCount: data.presentCount || 0,
        absentCount: data.absentCount || 0,
        registeredCount: data.registeredCount || (data.registeredUsers ? data.registeredUsers.length : 0)
      });
    } catch (err) {
      console.error('Failed to fetch attendance details', err);
      setAttendanceEventDetails({
        attendances: [],
        registeredUsers: [],
        totalMembers: 0,
        totalGuests: 0,
        totalHeadcount: 0,
        presentCount: 0,
        absentCount: 0,
        registeredCount: 0
      });
    }
  };

  const handleUpdateAttendanceStatus = async (userId: string, status: 'Registered' | 'Present' | 'Absent') => {
    if (!attendanceSelectedEvent || !attendanceEventDetails) return;

    // Optimistic UI Update (0ms delay)
    const updatedAttendances = (attendanceEventDetails.attendances || []).map((att: any) => {
      if (att.userId?._id === userId || att.userId === userId) {
        return { ...att, status };
      }
      return att;
    });

    const presentCount = updatedAttendances.filter((a: any) => a.status === 'Present').length;
    const absentCount = updatedAttendances.filter((a: any) => a.status === 'Absent').length;
    const registeredCount = updatedAttendances.filter((a: any) => !a.status || a.status === 'Registered').length;

    setAttendanceEventDetails(prev => prev ? {
      ...prev,
      attendances: updatedAttendances,
      presentCount,
      absentCount,
      registeredCount
    } : null);

    try {
      const res = await fetch(`/api/admin/events/${attendanceSelectedEvent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceEventDetails({
          attendances: data.attendances || [],
          registeredUsers: data.registeredUsers || [],
          totalMembers: data.totalMembers || 0,
          totalGuests: data.totalGuests || 0,
          totalHeadcount: data.totalHeadcount || 0,
          presentCount: data.presentCount || 0,
          absentCount: data.absentCount || 0,
          registeredCount: data.registeredCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to update attendance status', err);
    }
  };

  const handleRegisterMemberToCurrentEvent = async (userId: string, count: number = 0, guestNames: string = '') => {
    if (!attendanceSelectedEvent) return;
    setRegSubmittingUserId(userId);

    try {
      const res = await fetch(`/api/admin/events/${attendanceSelectedEvent._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          additionalCount: count,
          guestNames,
          status: 'Registered'
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceEventDetails({
          attendances: data.attendances || [],
          registeredUsers: data.registeredUsers || [],
          totalMembers: data.totalMembers || 0,
          totalGuests: data.totalGuests || 0,
          totalHeadcount: data.totalHeadcount || 0,
          presentCount: data.presentCount || 0,
          absentCount: data.absentCount || 0,
          registeredCount: data.registeredCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to register member to event', err);
    } finally {
      setRegSubmittingUserId(null);
    }
  };

  const handleRemoveMemberFromCurrentEvent = async (userId: string) => {
    if (!attendanceSelectedEvent) return;
    setRegSubmittingUserId(userId);

    try {
      const res = await fetch(`/api/admin/events/${attendanceSelectedEvent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'delete' }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceEventDetails({
          attendances: data.attendances || [],
          registeredUsers: data.registeredUsers || [],
          totalMembers: data.totalMembers || 0,
          totalGuests: data.totalGuests || 0,
          totalHeadcount: data.totalHeadcount || 0,
          presentCount: data.presentCount || 0,
          absentCount: data.absentCount || 0,
          registeredCount: data.registeredCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to remove member from event', err);
    } finally {
      setRegSubmittingUserId(null);
    }
  };

  const handleOpenUserRegEventModal = (user: any) => {
    setSelectedUser(user);
    setUserRegAdditionalCount(0);
    setUserRegGuestNames('');
    setUserRegError('');
    const upcomingEvents = events.filter(e => isEventUpcoming(e.date));
    setUserRegSelectedEventId(upcomingEvents.length > 0 ? upcomingEvents[0]._id : (events.length > 0 ? events[0]._id : ''));
    setIsUserRegEventModalOpen(true);
  };

  const handleUserRegEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !userRegSelectedEventId) return;
    setIsUserRegSubmitting(true);
    setUserRegError('');

    try {
      const res = await fetch(`/api/admin/events/${userRegSelectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser._id,
          additionalCount: Number(userRegAdditionalCount),
          guestNames: userRegGuestNames.trim(),
          status: 'Registered'
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register member to event');
      }
      await handleSelectUser(selectedUser);
      setIsUserRegEventModalOpen(false);
    } catch (err: any) {
      setUserRegError(err.message);
    } finally {
      setIsUserRegSubmitting(false);
    }
  };

  const exportAttendance = () => {
    if (!attendanceEventDetails) return;
    const attList = attendanceEventDetails.attendances || [];
    const legacyList = attendanceEventDetails.registeredUsers || [];

    if (attList.length === 0 && legacyList.length === 0) {
      alert("No attendance records to export.");
      return;
    }

    const eventName = attendanceSelectedEvent?.eventName || 'Event';
    const eventDate = attendanceSelectedEvent?.date || '';
    const eventTime = attendanceSelectedEvent?.time || '';
    const location = attendanceSelectedEvent?.locationAddress || '';

    const sheetData: (string | number)[][] = [
      [`ATTENDANCE REPORT: ${eventName.toUpperCase()}`],
      [`Date: ${eventDate}   |   Time: ${eventTime}`],
      [`Location: ${location}`],
      [`Total Registered Members: ${attendanceEventDetails.totalMembers || legacyList.length}   |   Total Guests: ${attendanceEventDetails.totalGuests || 0}`],
      [`TOTAL HEADCOUNT: ${attendanceEventDetails.totalHeadcount || legacyList.length}   |   Present: ${attendanceEventDetails.presentCount || 0}   |   Absent: ${attendanceEventDetails.absentCount || 0}`],
      [], 
      ['S.No', 'Member Name', 'Contact Number', 'Fellowship Category', 'Additional Guests (+)', 'Guest Names / Notes', 'Party Size', 'Attendance Status'], 
    ];

    if (attList.length > 0) {
      attList.forEach((att: any, i: number) => {
        const memberName = att.userId?.name || 'Member';
        const phone = att.userId?.contactNumber || 'no number';
        const cat = att.userId?.category || 'General';
        const addCount = att.additionalCount || 0;
        const gNames = att.guestNames || 'None';
        const partySize = 1 + addCount;
        const attStatus = att.status || 'Registered';

        sheetData.push([i + 1, memberName, phone, cat, addCount, gNames, partySize, attStatus]);
      });
    } else {
      legacyList.forEach((u: any, i: number) => {
        sheetData.push([i + 1, u.name, u.contactNumber, u.category || 'General', 0, 'None', 1, 'Registered']);
      });
    }

    sheetData.push([]);
    sheetData.push([
      'SUMMARY',
      `Members: ${attendanceEventDetails.totalMembers || legacyList.length}`,
      `Guests: ${attendanceEventDetails.totalGuests || 0}`,
      `Present: ${attendanceEventDetails.presentCount || 0}`,
      `Absent: ${attendanceEventDetails.absentCount || 0}`,
      'TOTAL HEADCOUNT:',
      attendanceEventDetails.totalHeadcount || legacyList.length
    ]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    ws['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 30 }, // Member Name
      { wch: 20 }, // Contact Number
      { wch: 18 }, // Category
      { wch: 20 }, // Additional Guests
      { wch: 28 }, // Guest Names
      { wch: 14 }, // Party Size
      { wch: 18 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${eventName}_Attendance_Report.xlsx`);
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventModalError('');
    setIsEventSubmitting(true);

    try {
      const formattedTime = `${newEventHour}:${newEventMinute} ${newEventAmPm}`;
      const res = await authFetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: newEventName, 
          date: newEventDate, 
          time: formattedTime, 
          locationAddress: newEventLocation, 
          gmapLink: newEventGmapLink,
          travelCost: newEventCost,
          organizerPhone: newEventOrganizerPhone
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
      setNewEventOrganizerPhone('');
    } catch (err: any) {
      setEventModalError(err.message);
    } finally {
      setIsEventSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all registrations for it.')) return;
    try {
      const res = await authFetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
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
    setEditEventOrganizerPhone(event.organizerPhone || '');
    setIsEditEventModalOpen(true);
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventModalError('');
    setIsEventSubmitting(true);

    try {
      const formattedTime = `${editEventHour}:${editEventMinute} ${editEventAmPm}`;
      const res = await authFetch(`/api/admin/events/${editEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: editEventName, 
          date: editEventDate, 
          time: formattedTime, 
          locationAddress: editEventLocation, 
          gmapLink: editEventGmapLink,
          travelCost: editEventCost,
          organizerPhone: editEventOrganizerPhone
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

  // Category counts map
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const cat = u.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [users]);

  // Broadcast text generator
  const getBroadcastMessageText = useCallback(() => {
    const ev = attendanceSelectedEvent || selectedEvent;
    if (!ev) return '';
    const formattedDate = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const timeStr = formatTimeWithAmPm(ev.time);

    if (broadcastType === 'announcement') {
      return `⛪ *UPCOMING EVENT: ${ev.eventName.toUpperCase()}*\n\n📅 *Date:* ${formattedDate}\n⏰ *Time:* ${timeStr}\n📍 *Location:* ${ev.locationAddress}${ev.gmapLink ? `\n🗺️ *Map:* ${ev.gmapLink}` : ''}${ev.travelCost ? `\n💵 *Cost:* ₹${ev.travelCost}` : ''}\n\n👉 *Click here to confirm attendance:*\n${typeof window !== 'undefined' ? window.location.origin : ''}/home/events/${ev._id}`;
    } else {
      return `🔔 *EVENT REMINDER: ${ev.eventName.toUpperCase()}*\n\nDear Member,\nThis is a friendly reminder for our upcoming event:\n\n📅 *Date:* ${formattedDate}\n⏰ *Time:* ${timeStr}\n📍 *Location:* ${ev.locationAddress}\n\nWe look forward to seeing you there! 🙏`;
    }
  }, [attendanceSelectedEvent, selectedEvent, broadcastType]);

  const handleCopyBroadcastMessage = () => {
    const text = getBroadcastMessageText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setBroadcastCopied(true);
    setTimeout(() => setBroadcastCopied(false), 2500);
  };

  const handleShareWhatsAppBroadcast = () => {
    const text = getBroadcastMessageText();
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleMarkAllPresent = async () => {
    if (!attendanceSelectedEvent || !attendanceEventDetails?.attendances) return;
    const unconfirmed = attendanceEventDetails.attendances.filter(a => (!a.status || a.status === 'Registered'));
    if (unconfirmed.length === 0) {
      alert('All registered members are already marked Present!');
      return;
    }
    if (!window.confirm(`Mark all ${unconfirmed.length} registered member(s) as Present?`)) return;

    try {
      for (const att of unconfirmed) {
        const uId = att.userId?._id || att.userId;
        if (uId) {
          await fetch(`/api/admin/events/${attendanceSelectedEvent._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uId, status: 'Present' }),
          });
        }
      }
      handleSelectAttendanceEvent(attendanceSelectedEvent);
    } catch (err) {
      console.error('Failed to mark all present', err);
    }
  };

  // Memoized user search & category filtering
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = userSearchQuery.trim() === '' || 
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.contactNumber?.includes(userSearchQuery);
      
      const matchesCategory = selectedCategoryFilter === 'All' || 
        (user.category || 'General') === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [users, userSearchQuery, selectedCategoryFilter]);

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

  return (
    <div className={styles.container}>

      {/* 3D Parallax Background Layer */}
      <div className={styles.bgScene}>
        <div ref={bgRef} className={styles.bgImage} />
        <div className={styles.bgOverlay} />
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
            Users ({users.length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'createEvent' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('createEvent')}
          >
            Events ({events.length})
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

                <button 
                  type="button"
                  className={styles.profileDropdownItem}
                  onClick={handleAdminLogout}
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        
        {/* USER MANAGEMENT SECTION */}
        {activeTab === 'addUser' && (
          <div className={styles.sectionContent} key="addUser">
            
            <div className={`${styles.sectionHeader} ${styles.pageHeader}`}>
              <h2 className={styles.sectionTitle}>User Management</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={styles.btnImport} onClick={() => setIsCategoryModalOpen(true)}>
                  ⚙️ Categories
                </button>
                <button className={styles.btnImport} onClick={() => setIsImportModalOpen(true)}>
                  Import
                </button>
                <button className={styles.btnAddUser} onClick={() => setIsModalOpen(true)}>
                  + Add User
                </button>
              </div>
            </div>

            {/* Search Bar & Category Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Search members by name or phone..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', maxWidth: '100%' }}>
                {['All', ...categories.map(c => c.name)].map((cat) => {
                  const count = cat === 'All' ? users.length : (categoryCounts[cat] || 0);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: selectedCategoryFilter === cat ? 'var(--crimson)' : 'transparent',
                        color: selectedCategoryFilter === cat ? '#fff' : '#888',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.usersLayout}>
              {/* Left Column: Users List */}
              <div className={styles.usersSidebar}>
                <div className={styles.sidebarTitle}>
                  Members ({filteredUsers.length} of {users.length})
                </div>
                {filteredUsers.length === 0 ? (
                  <div className={styles.noUsers}>No matching members found.</div>
                ) : (
                  filteredUsers.map(user => {
                    const badge = getCategoryBadgeStyle(user.category);
                    return (
                      <div 
                        key={user._id} 
                        className={`${styles.userListItem} ${selectedUser?._id === user._id ? styles.activeUser : ''}`}
                        onClick={() => handleSelectUser(user)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span className={styles.userName}>{user.name}</span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}>
                            {user.category || 'General'}
                          </span>
                        </div>
                        <span className={styles.userPhone}>📞 {user.contactNumber}</span>
                      </div>
                    );
                  })
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 className={styles.detailsTitle}>{selectedUser.name}</h3>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: getCategoryBadgeStyle(selectedUser.category).bg,
                            color: getCategoryBadgeStyle(selectedUser.category).color,
                            border: `1px solid ${getCategoryBadgeStyle(selectedUser.category).border}`
                          }}>
                            {selectedUser.category || 'General'}
                          </span>
                        </div>
                        <a href={`tel:${selectedUser.contactNumber}`} className={styles.detailsPhone} style={{ textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
                          📞 {selectedUser.contactNumber}
                        </a>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          className={styles.btnAddUser}
                          onClick={() => handleOpenUserRegEventModal(selectedUser)}
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          + Register to Event
                        </button>
                        <button 
                          className={styles.btnEdit}
                          onClick={() => handleOpenEditUser(selectedUser)}
                        >
                          Edit Details
                        </button>
                        <button 
                          className={styles.btnDelete}
                          onClick={() => handleDeleteUser(selectedUser._id)}
                        >
                          Delete Member
                        </button>
                      </div>
                    </div>

                    <div className={styles.eventsGrid}>
                      <div>
                        <h4 className={styles.eventsSectionTitle}>Upcoming Events</h4>
                        {!userDetails ? (
                          <div className={styles.noEvents}>Loading...</div>
                        ) : userDetails.upcoming.length === 0 ? (
                          <div className={styles.noEvents}>No upcoming registrations.</div>
                        ) : (
                          userDetails.upcoming.map(ev => (
                            <div key={ev._id} className={styles.eventCard}>
                              <h4 style={{ margin: '0 0 0.25rem' }}>{ev.eventName}</h4>
                              <p style={{ margin: 0, color: 'var(--crimson)', fontSize: '0.85rem' }}>{ev.date} &bull; {ev.time}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ADD USER MODAL */}
            {isModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Add New Member</h3>
                  {modalError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{modalError}</div>}
                  <form onSubmit={handleAddUserSubmit}>
                    <div className={styles.formGroup}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={newUserName} 
                        onChange={e => setNewUserName(e.target.value)} 
                        placeholder="e.g. John Doe"
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>10-Digit Contact Number</label>
                      <input 
                        type="tel" 
                        maxLength={10}
                        value={newUserPhone} 
                        onChange={e => setNewUserPhone(e.target.value)} 
                        placeholder="e.g. 9876543210"
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Category</label>
                      <input 
                        type="text" 
                        list="add-category-list" 
                        value={newUserCategory} 
                        onChange={e => setNewUserCategory(e.target.value)}
                        placeholder="Select or type custom category..."
                        style={{
                          background: '#000',
                          border: '1px solid #333',
                          padding: '0.8rem',
                          borderRadius: '6px',
                          color: '#fff',
                          width: '100%'
                        }}
                      />
                      <datalist id="add-category-list">
                        {categories.map(c => (
                          <option key={c._id} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsModalOpen(false)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Member'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT USER MODAL */}
            {isEditUserModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setIsEditUserModalOpen(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Edit Member Details</h3>
                  {modalError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{modalError}</div>}
                  <form onSubmit={handleEditUserSubmit}>
                    <div className={styles.formGroup}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={editUserName} 
                        onChange={e => setEditUserName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>10-Digit Contact Number</label>
                      <input 
                        type="tel" 
                        maxLength={10}
                        value={editUserPhone} 
                        onChange={e => setEditUserPhone(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Category</label>
                      <input 
                        type="text" 
                        list="edit-category-list" 
                        value={editUserCategory} 
                        onChange={e => setEditUserCategory(e.target.value)}
                        placeholder="Select or type custom category..."
                        style={{
                          background: '#000',
                          border: '1px solid #333',
                          padding: '0.8rem',
                          borderRadius: '6px',
                          color: '#fff',
                          width: '100%'
                        }}
                      />
                      <datalist id="edit-category-list">
                        {categories.map(c => (
                          <option key={c._id} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsEditUserModalOpen(false)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* IMPORT MODAL */}
            {isImportModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setIsImportModalOpen(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Import Members (Excel)</h3>
                  {importError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{importError}</div>}
                  <form onSubmit={handleImportSubmit}>
                    <div className={styles.formGroup}>
                      <label>Select .xlsx / .xls file</label>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={e => setImportFile(e.target.files?.[0] || null)}
                        required 
                      />
                    </div>
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsImportModalOpen(false)}>Cancel</button>
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
                + Create Event
              </button>
            </div>

            <div className={styles.eventsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {events.map(event => (
                <div key={event._id} className={styles.eventCard} style={{ cursor: 'pointer' }} onClick={() => handleOpenEditEvent(event)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{event.eventName}</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isEventUpcoming(event.date) ? 'rgba(220,20,60,0.2)' : 'rgba(255,255,255,0.08)', color: isEventUpcoming(event.date) ? 'var(--crimson)' : '#888' }}>
                      {isEventUpcoming(event.date) ? 'UPCOMING' : 'PAST'}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--crimson)', fontSize: '0.9rem', fontWeight: 600 }}>
                    📅 {event.date} &bull; ⏰ {formatTimeWithAmPm(event.time)}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '0.85rem' }}>
                    📍 {event.locationAddress}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className={styles.btnEdit} onClick={(e) => { e.stopPropagation(); handleOpenEditEvent(event); }}>Edit</button>
                    <button className={styles.btnDelete} onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event._id); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* CREATE EVENT MODAL */}
            {isEventModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setIsEventModalOpen(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Create New Event</h3>
                  {eventModalError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{eventModalError}</div>}
                  <form onSubmit={handleAddEventSubmit}>
                    <div className={styles.formGroup}>
                      <label>Event Name</label>
                      <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Date</label>
                      <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Time</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select value={newEventHour} onChange={e => setNewEventHour(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select value={newEventMinute} onChange={e => setNewEventMinute(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select value={newEventAmPm} onChange={e => setNewEventAmPm(e.target.value as any)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Location (Physical Address)</label>
                      <input type="text" value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Google Maps Link (Optional)</label>
                      <input type="text" value={newEventGmapLink} onChange={e => setNewEventGmapLink(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Travel Cost (₹)</label>
                      <input type="number" value={newEventCost} onChange={e => setNewEventCost(e.target.value)} required min="0" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Organizer Phone Number (Optional)</label>
                      <input type="tel" placeholder="e.g. 9876543210" value={newEventOrganizerPhone} onChange={e => setNewEventOrganizerPhone(e.target.value)} />
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

            {/* EDIT EVENT MODAL */}
            {isEditEventModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setIsEditEventModalOpen(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Edit Event Details</h3>
                  {eventModalError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{eventModalError}</div>}
                  <form onSubmit={handleEditEventSubmit}>
                    <div className={styles.formGroup}>
                      <label>Event Name</label>
                      <input type="text" value={editEventName} onChange={e => setEditEventName(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Date</label>
                      <input type="date" value={editEventDate} onChange={e => setEditEventDate(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Time</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select value={editEventHour} onChange={e => setEditEventHour(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select value={editEventMinute} onChange={e => setEditEventMinute(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select value={editEventAmPm} onChange={e => setEditEventAmPm(e.target.value as any)} style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', flex: 1 }}>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Location (Physical Address)</label>
                      <input type="text" value={editEventLocation} onChange={e => setEditEventLocation(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Google Maps Link (Optional)</label>
                      <input type="text" value={editEventGmapLink} onChange={e => setEditEventGmapLink(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Travel Cost (₹)</label>
                      <input type="number" value={editEventCost} onChange={e => setEditEventCost(e.target.value)} required min="0" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Organizer Phone Number (Optional)</label>
                      <input type="tel" placeholder="e.g. 9876543210" value={editEventOrganizerPhone} onChange={e => setEditEventOrganizerPhone(e.target.value)} />
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
              {/* Left Column: Event List with Filter Controls */}
              <div className={styles.eventSidebar}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div className={styles.sidebarTitle} style={{ margin: 0 }}>Select Event</div>
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => setAttendanceFilterMode('all')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: attendanceFilterMode === 'all' ? 'var(--crimson)' : 'transparent',
                      color: attendanceFilterMode === 'all' ? '#fff' : '#888'
                    }}
                  >
                    All ({events.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceFilterMode('upcoming')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: attendanceFilterMode === 'upcoming' ? 'var(--crimson)' : 'transparent',
                      color: attendanceFilterMode === 'upcoming' ? '#fff' : '#888'
                    }}
                  >
                    Upcoming ({activeEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceFilterMode('past')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: attendanceFilterMode === 'past' ? 'var(--crimson)' : 'transparent',
                      color: attendanceFilterMode === 'past' ? '#fff' : '#888'
                    }}
                  >
                    Past ({events.length - activeEvents.length})
                  </button>
                </div>
                
                {events.length === 0 ? (
                  <div className={styles.noUsers}>No events found.</div>
                ) : (
                  events
                    .filter(event => {
                      if (attendanceFilterMode === 'upcoming') return isEventUpcoming(event.date);
                      if (attendanceFilterMode === 'past') return !isEventUpcoming(event.date);
                      return true;
                    })
                    .map(event => {
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
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          className={styles.btnAddUser}
                          onClick={() => setIsBroadcastModalOpen(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
                        >
                          📢 Broadcast
                        </button>
                        <button 
                          className={styles.btnAddUser}
                          onClick={() => {
                            setRegSearchQuery('');
                            setRegCategoryFilter('All');
                            setIsRegMemberModalOpen(true);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--crimson)' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                          </svg>
                          + Register Member
                        </button>
                        <button 
                          className={styles.btnAddUser}
                          onClick={exportAttendance}
                          disabled={!attendanceEventDetails?.attendances?.length && !attendanceEventDetails?.registeredUsers?.length}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (!attendanceEventDetails?.attendances?.length && !attendanceEventDetails?.registeredUsers?.length) ? 0.5 : 1 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Export Excel
                        </button>
                      </div>
                    </div>

                    {/* Attendance Stats Summary Cards */}
                    {attendanceEventDetails && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Total Headcount</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--crimson)', marginTop: '2px' }}>
                            {attendanceEventDetails.totalHeadcount || 0}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#30d158', textTransform: 'uppercase', fontWeight: 600 }}>Present ✓</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#30d158', marginTop: '2px' }}>
                            {attendanceEventDetails.presentCount || 0}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Registered ⏰</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                            {attendanceEventDetails.registeredCount || 0}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#ff453a', textTransform: 'uppercase', fontWeight: 600 }}>Absent ✗</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ff453a', marginTop: '2px' }}>
                            {attendanceEventDetails.absentCount || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attendee Search Input */}
                    <div style={{ marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="🔍 Filter attendees by name or phone..."
                        value={attendanceSearchQuery}
                        onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 className={styles.eventsSectionTitle} style={{ margin: 0 }}>Attendance Roster</h4>
                        {attendanceEventDetails?.attendances && attendanceEventDetails.attendances.length > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllPresent}
                            style={{
                              background: 'rgba(48,209,88,0.15)',
                              color: '#30d158',
                              border: '1px solid rgba(48,209,88,0.3)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ✓ Mark All Present
                          </button>
                        )}
                      </div>
                      
                      {!attendanceEventDetails ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                           <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                           Loading attendance...
                        </div>
                      ) : (attendanceEventDetails.attendances?.length === 0 && attendanceEventDetails.registeredUsers?.length === 0) ? (
                        <p style={{ color: '#888', fontStyle: 'italic' }}>No users are registered for this event yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {attendanceEventDetails.attendances && attendanceEventDetails.attendances.length > 0 ? (
                            attendanceEventDetails.attendances
                              .filter((att: any) => {
                                if (!attendanceSearchQuery.trim()) return true;
                                const q = attendanceSearchQuery.toLowerCase();
                                return (att.userId?.name || '').toLowerCase().includes(q) ||
                                       (att.userId?.contactNumber || '').includes(q);
                              })
                              .map((att: any) => {
                                const badge = getCategoryBadgeStyle(att.userId?.category);
                                const currentStatus = att.status || 'Registered';

                                return (
                                  <div key={att._id} style={{ 
                                      background: 'rgba(255, 255, 255, 0.03)', 
                                      padding: '1rem', 
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255, 255, 255, 0.05)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between'
                                    }}>
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                          <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--foreground)', fontSize: '1rem' }}>{att.userId?.name || 'Member'}</h4>
                                          <span style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: '8px',
                                            background: badge.bg,
                                            color: badge.color,
                                            border: `1px solid ${badge.border}`
                                          }}>
                                            {att.userId?.category || 'General'}
                                          </span>
                                        </div>

                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          background: att.additionalCount > 0 ? 'rgba(220,20,60,0.2)' : 'rgba(255,255,255,0.08)',
                                          color: att.additionalCount > 0 ? '#ff4d6d' : '#a1a1aa',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          border: att.additionalCount > 0 ? '1px solid rgba(220,20,60,0.4)' : '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                          {att.additionalCount > 0 ? `+${att.additionalCount} Guests` : 'Self (1)'}
                                        </span>
                                      </div>

                                      <a 
                                        href={`tel:${att.userId?.contactNumber}`}
                                        style={{ 
                                          color: 'var(--crimson)', 
                                          fontSize: '0.85rem', 
                                          textDecoration: 'none', 
                                          fontWeight: 600,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          marginTop: '4px',
                                        }}
                                      >
                                        📞 {att.userId?.contactNumber || 'no number'}
                                      </a>

                                      {att.guestNames && (
                                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#888' }}>
                                          👥 <strong>With:</strong> {att.guestNames}
                                        </div>
                                      )}
                                    </div>

                                    {/* 1-Click Attendance Status Toggles */}
                                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Registered')}
                                        style={{
                                          flex: 1,
                                          padding: '4px 6px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          borderRadius: '6px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          background: currentStatus === 'Registered' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
                                          color: currentStatus === 'Registered' ? '#fff' : '#666'
                                        }}
                                      >
                                        Registered
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Present')}
                                        style={{
                                          flex: 1,
                                          padding: '4px 6px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          borderRadius: '6px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          background: currentStatus === 'Present' ? '#30d158' : 'rgba(48,209,88,0.1)',
                                          color: currentStatus === 'Present' ? '#fff' : '#30d158'
                                        }}
                                      >
                                        Present ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Absent')}
                                        style={{
                                          flex: 1,
                                          padding: '4px 6px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          borderRadius: '6px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          background: currentStatus === 'Absent' ? '#ff453a' : 'rgba(255,69,58,0.1)',
                                          color: currentStatus === 'Absent' ? '#fff' : '#ff453a'
                                        }}
                                      >
                                        Absent ✗
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            attendanceEventDetails.registeredUsers?.map((user: any) => (
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
                                >
                                  📞 {user.contactNumber}
                                </a>
                              </div>
                            ))
                          )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 className={styles.detailsTitle}>{selectedUser.name}</h3>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: getCategoryBadgeStyle(selectedUser.category).bg,
                        color: getCategoryBadgeStyle(selectedUser.category).color,
                        border: `1px solid ${getCategoryBadgeStyle(selectedUser.category).border}`
                      }}>
                        {selectedUser.category || 'General'}
                      </span>
                    </div>
                    <a href={`tel:${selectedUser.contactNumber}`} className={styles.detailsPhone} style={{ textDecoration: 'none' }}>
                      📞 {selectedUser.contactNumber}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button 
                      className={styles.btnAddUser}
                      onClick={() => { setIsMobileDetailOpen(false); handleOpenUserRegEventModal(selectedUser); }}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      + Register to Event
                    </button>
                    <button 
                      className={styles.btnEdit}
                      onClick={() => { setIsMobileDetailOpen(false); handleOpenEditUser(selectedUser); }}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.btnDelete}
                      onClick={() => { handleDeleteUser(selectedUser._id); setIsMobileDetailOpen(false); }}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Delete
                    </button>
                  </div>
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
                  </div>
                  {!eventDetails ? (
                    <div className={styles.noEvents}>Loading...</div>
                  ) : eventDetails.registeredUsers?.length === 0 ? (
                    <div className={styles.noEvents}>No users registered yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {eventDetails.registeredUsers?.map(user => (
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
                  <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className={styles.btnAddUser}
                      onClick={() => {
                        setRegSearchQuery('');
                        setRegCategoryFilter('All');
                        setIsRegMemberModalOpen(true);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', padding: '6px 10px', background: 'var(--crimson)' }}
                    >
                      + Register Member
                    </button>
                    <button 
                      className={styles.btnAddUser}
                      onClick={exportAttendance}
                      disabled={!attendanceEventDetails?.attendances?.length && !attendanceEventDetails?.registeredUsers?.length}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', padding: '6px 10px' }}
                    >
                      Export Excel
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 className={styles.eventsSectionTitle}>
                    Attendance Roster ({attendanceEventDetails?.totalHeadcount || 0} Headcount)
                  </h4>
                  {!attendanceEventDetails ? (
                    <div className={styles.noEvents}>Loading...</div>
                  ) : (!attendanceEventDetails.attendances?.length && !attendanceEventDetails.registeredUsers?.length) ? (
                    <div className={styles.noEvents}>No users registered yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {attendanceEventDetails.attendances && attendanceEventDetails.attendances.length > 0 ? (
                        attendanceEventDetails.attendances.map((att: any) => {
                          const currentStatus = att.status || 'Registered';
                          return (
                            <div key={att._id} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{att.userId?.name || 'Member'}</h4>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: att.additionalCount > 0 ? '#ff4d6d' : '#888' }}>
                                  {att.additionalCount > 0 ? `+${att.additionalCount} Guests` : 'Self (1)'}
                                </span>
                              </div>
                              <a href={`tel:${att.userId?.contactNumber}`} style={{ color: 'var(--crimson)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px', display: 'inline-block' }}>
                                📞 {att.userId?.contactNumber || 'no number'}
                              </a>
                              {att.guestNames && (
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                  👥 With: {att.guestNames}
                                </div>
                              )}

                              {/* Mobile 1-Click Status Toggles */}
                              <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Registered')}
                                  style={{
                                    flex: 1, padding: '4px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: 'none',
                                    background: currentStatus === 'Registered' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
                                    color: currentStatus === 'Registered' ? '#fff' : '#666'
                                  }}
                                >
                                  Registered
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Present')}
                                  style={{
                                    flex: 1, padding: '4px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: 'none',
                                    background: currentStatus === 'Present' ? '#30d158' : 'rgba(48,209,88,0.1)',
                                    color: currentStatus === 'Present' ? '#fff' : '#30d158'
                                  }}
                                >
                                  Present ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendanceStatus(att.userId?._id, 'Absent')}
                                  style={{
                                    flex: 1, padding: '4px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: 'none',
                                    background: currentStatus === 'Absent' ? '#ff453a' : 'rgba(255,69,58,0.1)',
                                    color: currentStatus === 'Absent' ? '#fff' : '#ff453a'
                                  }}
                                >
                                  Absent ✗
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        attendanceEventDetails.registeredUsers?.map((user: any) => (
                          <div key={user._id} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: '10px' }}>
                            <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>{user.name}</h4>
                            <a href={`tel:${user.contactNumber}`} style={{ color: 'var(--crimson)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                              📞 {user.contactNumber}
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* REGISTER MEMBER TO CURRENT EVENT MODAL (Attendance Dashboard) */}
      {isRegMemberModalOpen && attendanceSelectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setIsRegMemberModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '650px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 className={styles.modalTitle} style={{ margin: 0 }}>Register Members to Event</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--crimson)', fontWeight: 600 }}>
                  {attendanceSelectedEvent.eventName} ({attendanceSelectedEvent.date})
                </p>
              </div>
              <button onClick={() => setIsRegMemberModalOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Search & Category Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="🔍 Search member by name or phone..."
                value={regSearchQuery}
                onChange={e => setRegSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', maxWidth: '100%' }}>
                {['All', ...categories.map(c => c.name)].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setRegCategoryFilter(cat)}
                    style={{
                      padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      background: regCategoryFilter === cat ? 'var(--crimson)' : 'transparent',
                      color: regCategoryFilter === cat ? '#fff' : '#888'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Members List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {users
                .filter(u => {
                  const matchesSearch = !regSearchQuery.trim() || 
                    u.name.toLowerCase().includes(regSearchQuery.toLowerCase()) || 
                    (u.contactNumber || '').includes(regSearchQuery);
                  const matchesCat = regCategoryFilter === 'All' || u.category === regCategoryFilter;
                  return matchesSearch && matchesCat;
                })
                .map(user => {
                  const existingAtt = (attendanceEventDetails?.attendances || []).find(
                    (att: any) => (att.userId?._id === user._id || att.userId === user._id)
                  );
                  const isSubmitting = regSubmittingUserId === user._id;
                  const extraCount = regGuestCounts[user._id] || 0;
                  const guestNamesStr = regGuestNamesMap[user._id] || '';
                  const badge = getCategoryBadgeStyle(user.category);

                  return (
                    <div key={user._id} style={{
                      background: existingAtt ? 'rgba(48,209,88,0.05)' : 'rgba(255,255,255,0.03)',
                      border: existingAtt ? '1px solid rgba(48,209,88,0.2)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{user.name}</span>
                          <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            {user.category || 'General'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>📞 {user.contactNumber}</div>

                        {!existingAtt && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              + Guests:
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={extraCount}
                                onChange={e => setRegGuestCounts(prev => ({ ...prev, [user._id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                                style={{ width: '45px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', textAlign: 'center' }}
                              />
                            </label>
                            {extraCount > 0 && (
                              <input
                                type="text"
                                placeholder="Guest names..."
                                value={guestNamesStr}
                                onChange={e => setRegGuestNamesMap(prev => ({ ...prev, [user._id]: e.target.value }))}
                                style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px' }}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        {existingAtt ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleRemoveMemberFromCurrentEvent(user._id)}
                            style={{
                              padding: '5px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: '1px solid rgba(255,69,58,0.4)',
                              background: 'rgba(255,69,58,0.1)', color: '#ff453a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            {isSubmitting ? '...' : '✓ Registered (Remove)'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleRegisterMemberToCurrentEvent(user._id, extraCount, guestNamesStr)}
                            style={{
                              padding: '5px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: 'none',
                              background: 'var(--crimson)', color: '#fff', cursor: 'pointer'
                            }}
                          >
                            {isSubmitting ? 'Registering...' : '+ Register'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsRegMemberModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MEMBER TO EVENT MODAL (User Management Tab) */}
      {isUserRegEventModalOpen && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setIsUserRegEventModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Register Member to Event</h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
              Registering <strong>{selectedUser.name}</strong> ({selectedUser.contactNumber})
            </p>

            {userRegError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{userRegError}</div>}

            <form onSubmit={handleUserRegEventSubmit}>
              <div className={styles.formGroup}>
                <label>Select Event</label>
                <select
                  value={userRegSelectedEventId}
                  onChange={e => setUserRegSelectedEventId(e.target.value)}
                  required
                  style={{ background: '#000', border: '1px solid #333', padding: '0.8rem', borderRadius: '6px', color: '#fff', width: '100%' }}
                >
                  {events.length === 0 ? (
                    <option value="">No events available</option>
                  ) : (
                    events.map(ev => (
                      <option key={ev._id} value={ev._id}>
                        {ev.eventName} ({ev.date} - {formatTimeWithAmPm(ev.time)}) {isEventUpcoming(ev.date) ? '[UPCOMING]' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Additional Guests (+)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={userRegAdditionalCount}
                  onChange={e => setUserRegAdditionalCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              {userRegAdditionalCount > 0 && (
                <div className={styles.formGroup}>
                  <label>Guest Names / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse, Children"
                    value={userRegGuestNames}
                    onChange={e => setUserRegGuestNames(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsUserRegEventModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={isUserRegSubmitting || !userRegSelectedEventId}>
                  {isUserRegSubmitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MANAGE CATEGORIES MODAL */}
      {isCategoryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCategoryModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 className={styles.modalTitle}>Manage Member Categories</h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
              Create custom categories for organizing members (e.g. Volunteers, Seniors, Worship Team).
            </p>

            {categoryError && <div className={styles.errorMsg} style={{ marginBottom: '1rem', color: '#ff4d6d' }}>{categoryError}</div>}

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="New Category Name..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                required
                style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }}
              />
              <button type="submit" className={styles.btnPrimary} disabled={isCreatingCategory || !newCategoryName.trim()}>
                {isCreatingCategory ? 'Adding...' : '+ Add'}
              </button>
            </form>

            <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '0.5rem' }}>Existing Categories ({categories.length})</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', fontSize: '13px' }}>No categories created yet. Create your first category above!</p>
              ) : (
                categories.map(cat => {
                  const badge = getCategoryBadgeStyle(cat.name);
                  return (
                    <div key={cat._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {cat.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id)}
                        style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* WHATSAPP BROADCAST MODAL */}
      {isBroadcastModalOpen && (attendanceSelectedEvent || selectedEvent) && (
        <div className={styles.modalOverlay} onClick={() => setIsBroadcastModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>📢 Event Broadcast Generator</h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
              Generate pre-formatted announcement and reminder messages to share on WhatsApp groups or send to members.
            </p>

            {/* Broadcast Mode Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setBroadcastType('announcement')}
                style={{
                  flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: broadcastType === 'announcement' ? 'var(--crimson)' : 'transparent',
                  color: broadcastType === 'announcement' ? '#fff' : '#888'
                }}
              >
                📣 Announcement & Invite
              </button>
              <button
                type="button"
                onClick={() => setBroadcastType('reminder')}
                style={{
                  flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: broadcastType === 'reminder' ? 'var(--crimson)' : 'transparent',
                  color: broadcastType === 'reminder' ? '#fff' : '#888'
                }}
              >
                🔔 Attendee Reminder
              </button>
            </div>

            {/* Generated Message Textarea */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <textarea
                readOnly
                rows={9}
                value={getBroadcastMessageText()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#25D366',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  resize: 'none'
                }}
              />
            </div>

            <div className={styles.modalActions} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsBroadcastModalOpen(false)}>Close</button>
              <button
                type="button"
                className={styles.btnAddUser}
                onClick={handleCopyBroadcastMessage}
                style={{ background: broadcastCopied ? '#30d158' : 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {broadcastCopied ? '✓ Copied!' : '📋 Copy Text'}
              </button>
              <button
                type="button"
                className={styles.btnAddUser}
                onClick={handleShareWhatsAppBroadcast}
                style={{ background: '#25D366', color: '#fff' }}
              >
                💬 Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
