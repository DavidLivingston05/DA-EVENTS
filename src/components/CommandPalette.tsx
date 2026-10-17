'use client';

import { useState, useEffect, useRef } from 'react';
import { useAndroidBackClose } from '@/lib/useAndroidBackClose';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'addUser' | 'createEvent' | 'attendance') => void;
  onOpenScanner: () => void;
  onOpenAddMember: () => void;
  onOpenCreateEvent: () => void;
  onOpenImport: () => void;
  onOpenBroadcast: () => void;
  onExportExcel: () => void;
  users: any[];
  events: any[];
  onSelectUser: (user: any) => void;
  onSelectEvent: (event: any) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenScanner,
  onOpenAddMember,
  onOpenCreateEvent,
  onOpenImport,
  onOpenBroadcast,
  onExportExcel,
  users,
  events,
  onSelectUser,
  onSelectEvent
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useAndroidBackClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Built-in actions
  const defaultActions = [
    { id: 'dasong-app', label: '🎵 Launch DaSong Studio (Live Lyrics & Chords)', category: 'Lyrics', run: () => { window.open('https://dasong.vercel.app/', '_blank'); } },
    { id: 'scan', label: '⚡ Launch Live QR Check-in Scanner', category: 'Action', run: onOpenScanner },
    { id: 'choir-suite', label: '🎶 Open Choir & Worship Team Suite', category: 'Music', run: () => { window.location.href = '/choir'; } },
    { id: 'pitch-pipe', label: '🎹 Vocal Pitch Pipe & Key Tuner', category: 'Music', run: () => { window.location.href = '/choir'; } },
    { id: 'tab-attendance', label: '📋 Go to Attendance Management', category: 'Navigation', run: () => onNavigateTab('attendance') },
    { id: 'tab-events', label: '📅 Go to Events & Services Calendar', category: 'Navigation', run: () => onNavigateTab('createEvent') },
    { id: 'tab-members', label: '👥 Go to Member Directory', category: 'Navigation', run: () => onNavigateTab('addUser') },
    { id: 'create-event', label: '➕ Create New Service or Gathering', category: 'Action', run: onOpenCreateEvent },
    { id: 'add-member', label: '👤 Add Single Church Member', category: 'Action', run: onOpenAddMember },
    { id: 'import-excel', label: '📥 Bulk Import Members from Excel', category: 'Action', run: onOpenImport },
    { id: 'export-excel', label: '📊 Download Current Attendance to Excel', category: 'Action', run: onExportExcel },
    { id: 'broadcast-wa', label: '💬 Send WhatsApp Broadcast / Reminders', category: 'Action', run: onOpenBroadcast },
  ];

  // Filter actions, members, and events
  const filteredActions = defaultActions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredMembers = query.trim().length > 1
    ? users.filter(u =>
        u.name?.toLowerCase().includes(query.toLowerCase()) ||
        u.contactNumber?.includes(query)
      ).slice(0, 5)
    : [];

  const filteredEventsList = query.trim().length > 1
    ? events.filter(e =>
        e.eventName?.toLowerCase().includes(query.toLowerCase()) ||
        e.date?.includes(query)
      ).slice(0, 4)
    : [];

  const allItems: { id: string; label: string; sub?: string; type: 'action' | 'member' | 'event'; data?: any; run: () => void }[] = [
    ...filteredActions.map(a => ({ id: a.id, label: a.label, sub: a.category, type: 'action' as const, run: a.run })),
    ...filteredMembers.map(m => ({
      id: `m-${m._id}`,
      label: `👤 ${m.name}`,
      sub: `${m.contactNumber || 'No phone'} • ${m.category || 'General'}`,
      type: 'member' as const,
      data: m,
      run: () => {
        onNavigateTab('addUser');
        onSelectUser(m);
      }
    })),
    ...filteredEventsList.map(e => ({
      id: `e-${e._id}`,
      label: `🗓️ ${e.eventName}`,
      sub: `${e.date} • ${e.locationAddress}`,
      type: 'event' as const,
      data: e,
      run: () => {
        onNavigateTab('attendance');
        onSelectEvent(e);
      }
    }))
  ];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'linear-gradient(180deg, #181824 0%, #101018 100%)',
          border: '1px solid rgba(220, 20, 60, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 35px rgba(220,20,60,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <span style={{ fontSize: '18px', color: '#dc143c' }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, member name, or event... (Press Esc to exit)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '15px'
            }}
          />
          <span style={{
            fontSize: '11px',
            color: '#71717a',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontFamily: 'monospace'
          }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {allItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
              No matching commands or church records found.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(220, 20, 60, 0.2)' : 'transparent',
                    border: isSelected ? '1px solid rgba(220, 20, 60, 0.4)' : '1px solid transparent',
                    transition: 'background 0.1s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                      {item.label}
                    </span>
                    {item.sub && (
                      <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {item.sub}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '11px', color: '#ff4d6d', fontWeight: 700 }}>
                      Jump ↵
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#71717a',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <span>Use ↑ and ↓ to navigate • Enter to select</span>
          <span style={{ color: '#dc143c', fontWeight: 600 }}>Rose of Sharon IPC Admin</span>
        </div>
      </div>
    </div>
  );
}
