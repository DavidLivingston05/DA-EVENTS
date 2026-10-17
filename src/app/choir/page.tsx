"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { playVocalPitch, stopVocalPitch, playMetronomeTick, NOTE_FREQUENCIES } from '@/lib/choirAudio';
import { playAudioFeedback } from '@/lib/soundEffects';
import { useAndroidBackClose } from '@/lib/useAndroidBackClose';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function ChoirSuitePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dasong' | 'setlist' | 'pitch' | 'metronome' | 'tips'>('dasong');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Pitch Pipe State
  const [activePlayingNote, setActivePlayingNote] = useState<string | null>(null);
  const [octaveOffset, setOctaveOffset] = useState<number>(0); // -1 (Oct 3), 0 (Oct 4), 1 (Oct 5)

  // Metronome State
  const [bpm, setBpm] = useState<number>(72);
  const [isPlayingMetronome, setIsPlayingMetronome] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [timeSignature, setTimeSignature] = useState<number>(4);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const metronomeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Songbook & Setlist State
  const [songs, setSongs] = useState<any[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeSongModal, setActiveSongModal] = useState<any | null>(null);
  const [lyricsScript, setLyricsScript] = useState<'english' | 'tamil'>('english');
  const [lyricsFontSize, setLyricsFontSize] = useState<number>(15);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // New Song Modal State
  const [isNewSongModalOpen, setIsNewSongModalOpen] = useState<boolean>(false);

  // Android hardware / gesture back handlers for modals
  useAndroidBackClose(!!activeSongModal, () => setActiveSongModal(null));
  useAndroidBackClose(isNewSongModalOpen, () => setIsNewSongModalOpen(false));
  const [newTitle, setNewTitle] = useState<string>('');
  const [newTamilTitle, setNewTamilTitle] = useState<string>('');
  const [newKey, setNewKey] = useState<string>('D');
  const [newTempo, setNewTempo] = useState<number>(72);
  const [newCategory, setNewCategory] = useState<string>('Worship');
  const [newLyrics, setNewLyrics] = useState<string>('');
  const [newTamilLyrics, setNewTamilLyrics] = useState<string>('');
  const [newChords, setNewChords] = useState<string>('');
  const [isSubmittingSong, setIsSubmittingSong] = useState<boolean>(false);

  // Fetch Choir Songs
  const fetchSongs = useCallback(async () => {
    try {
      setIsLoadingSongs(true);
      const res = await fetch('/api/choir/songs');
      const data = await res.json();
      if (res.ok && data.songs) {
        setSongs(data.songs);
      }
    } catch (err) {
      console.error('Failed to load choir songs:', err);
    } finally {
      setIsLoadingSongs(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Handle Vocal Pitch Play
  const handlePlayNote = (note: string) => {
    if (activePlayingNote === note) {
      stopVocalPitch();
      setActivePlayingNote(null);
    } else {
      playVocalPitch(note, octaveOffset, 3.5);
      setActivePlayingNote(note);
      setTimeout(() => {
        setActivePlayingNote(prev => prev === note ? null : prev);
      }, 3500);
    }
  };

  // Precision Metronome Engine
  useEffect(() => {
    if (!isPlayingMetronome) {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
        metronomeTimerRef.current = null;
      }
      setCurrentBeat(1);
      setPulseActive(false);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    let beat = 1;

    // Immediately trigger first beat
    playMetronomeTick(true);
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 90);

    metronomeTimerRef.current = setInterval(() => {
      beat = beat >= timeSignature ? 1 : beat + 1;
      setCurrentBeat(beat);
      playMetronomeTick(beat === 1);
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 90);
    }, intervalMs);

    return () => {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    };
  }, [isPlayingMetronome, bpm, timeSignature]);

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    // Filter taps older than 2.5 seconds
    const recent = taps.filter(t => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.min(220, Math.max(40, Math.round(60000 / avgInterval)));
      setBpm(calculatedBpm);
      playAudioFeedback('pop');
    }
  };

  // Share Full Setlist to WhatsApp
  const handleShareSetlist = () => {
    const setlistSongs = songs.filter(s => s.assignedDate === 'Sunday Setlist' || selectedCategory === 'All');
    if (setlistSongs.length === 0) return;

    let text = `🎶 *ROSE OF SHARON IPC — WORSHIP SETLIST* ⛪\n\n`;
    setlistSongs.forEach((s, idx) => {
      text += `${idx + 1}. *${s.title}* ${s.tamilTitle ? `(${s.tamilTitle})` : ''}\n   🎹 *Key:* ${s.originalKey} | ⏱️ *Tempo:* ${s.tempo} BPM | 🏷️ *${s.category}*\n\n`;
    });
    text += `👉 *Choir Practice & Lyrics Sheet:*\n${typeof window !== 'undefined' ? window.location.origin : ''}/choir\n\n"Sing to the Lord a new song; play skillfully, and shout for joy!" (Psalm 33:3) 🙏`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Share Single Song Lyrics to WhatsApp
  const handleShareSongLyrics = (song: any) => {
    const isTa = lyricsScript === 'tamil' && song.tamilLyrics;
    const body = isTa ? song.tamilLyrics : (song.lyrics || song.tamilLyrics);
    const text = `🎵 *${song.title}* ${song.tamilTitle ? `(${song.tamilTitle})` : ''}\n🎹 *Key:* ${song.originalKey} | ⏱️ *Tempo:* ${song.tempo} BPM | 🏷️ *${song.category}*\n\n${body}\n\n— *Rose of Sharon IPC Choir Suite*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Create Song Handler
  const handleCreateSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmittingSong(true);
    try {
      const res = await fetch('/api/choir/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          tamilTitle: newTamilTitle,
          originalKey: newKey,
          tempo: newTempo,
          category: newCategory,
          lyrics: newLyrics,
          tamilLyrics: newTamilLyrics,
          chords: newChords,
          assignedDate: 'Sunday Setlist'
        }),
      });
      const data = await res.json();
      if (res.ok && data.songs) {
        setSongs(data.songs);
        playAudioFeedback('success');
        setIsNewSongModalOpen(false);
        setNewTitle('');
        setNewTamilTitle('');
        setNewLyrics('');
        setNewTamilLyrics('');
        setNewChords('');
      }
    } catch (err) {
      console.error('Failed to save song:', err);
    } finally {
      setIsSubmittingSong(false);
    }
  };

  // Filter songs by search and category
  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchSearch = searchQuery.trim() === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tamilTitle && s.tamilTitle.includes(searchQuery)) ||
        (s.lyrics && s.lyrics.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === 'All' ||
        (selectedCategory === 'Setlist' && s.assignedDate === 'Sunday Setlist') ||
        s.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [songs, searchQuery, selectedCategory]);

  return (
    <div className={styles.container}>
      <div className={styles.bgScene} />

      {/* Navigation Header */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea} onClick={() => router.push('/home')}>
          <div className={styles.logoIcon}>🎶</div>
          <div>
            <div className={styles.logoTitle}>Choir & Worship Suite</div>
            <div className={styles.logoSub}>Rose of Sharon IPC Church</div>
          </div>
        </div>

        <div className={styles.navActions}>
          <Link href="/home" className={styles.backBtn}>
            ← Back to Church Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent}>

        {/* Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <div>
              <span style={{ 
                background: 'rgba(255, 77, 109, 0.25)', 
                color: '#ff4d6d', 
                fontSize: '11px', 
                fontWeight: 800, 
                padding: '4px 12px', 
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                ✦ Sanctuary Musicians & Vocalists
              </span>
              <h1 className={styles.heroTitle} style={{ marginTop: '8px' }}>
                Worship Team & Choir Hub
              </h1>
              <p className={styles.heroDesc}>
                Everything your choir needs for excellence in worship: Sunday service setlists, lyrics & chords, precision rehearsal metronome, and digital vocal pitch pipe.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href="https://dasong.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 6px 18px rgba(139, 92, 246, 0.4)'
                }}
              >
                <span>⚡</span> Open DaSong Studio ↗
              </a>

              <button
                type="button"
                onClick={handleShareSetlist}
                style={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 6px 18px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> Share Setlist on WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setIsNewSongModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #dc143c, #900d28)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 6px 18px rgba(220, 20, 60, 0.35)'
                }}
              >
                <span>+</span> Add Song
              </button>
            </div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className={styles.toolTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'dasong' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('dasong')}
          >
            <span>🎵</span> DaSong Studio (Live Teleprompter)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'setlist' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('setlist')}
          >
            <span>📜</span> Worship Setlist & Songbook ({songs.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'pitch' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('pitch')}
          >
            <span>🎹</span> Vocal Pitch Pipe (Key Finder)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'metronome' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('metronome')}
          >
            <span>⏱️</span> Practice Metronome
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'tips' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('tips')}
          >
            <span>🎤</span> SATB Voice Parts & Vocal Tips
          </button>
        </div>

        {/* TAB 0: DASONG STUDIO (LIVE EMBEDDED LYRICS & CHORDS) */}
        {activeTab === 'dasong' && (
          <div className={styles.card} style={{ padding: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎵</span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                    DaSong Studio — Live Lyrics & Chords
                  </h2>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Digital lyrics and chord library styled like professional DAW hardware with transposition and teleprompters
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current) {
                      iframeRef.current.src = 'https://dasong.vercel.app/';
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🔄 Reload
                </button>

                <a
                  href="https://dasong.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)'
                  }}
                >
                  <span>↗</span> Open in New Window
                </a>
              </div>
            </div>

            {/* Embedded Responsive Web App Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '75vh',
              minHeight: '560px',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              background: '#09090b',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
            }}>
              <iframe
                ref={iframeRef}
                src="https://dasong.vercel.app/"
                title="DaSong Studio"
                allow="autoplay; camera; microphone"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 1: WORSHIP SETLIST & SONGBOOK */}
        {activeTab === 'setlist' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <span>📜</span> Sanctuary Worship Songs & Lyrics
                </h2>
                <div className={styles.cardSubtitle}>
                  Sunday Service setlist, keys, chords, and lyrics in Tamil & English transliteration
                </div>
              </div>

              {/* Category Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Setlist', 'Worship', 'Praise', 'Tamil Hymn'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      background: selectedCategory === cat ? 'rgba(220, 20, 60, 0.25)' : 'rgba(255,255,255,0.04)',
                      border: selectedCategory === cat ? '1px solid rgba(220, 20, 60, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: selectedCategory === cat ? '#ff4d6d' : '#94a3b8',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {cat === 'Setlist' ? '⭐ Sunday Setlist' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="🔍 Search songs by title (e.g. En Uyirana Yesu, Way Maker, நன்றியோடு)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {isLoadingSongs ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                Loading songs...
              </div>
            ) : filteredSongs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                No songs match "{searchQuery}". Click "+ Add Song" above to add new worship songs!
              </div>
            ) : (
              <div className={styles.songGrid}>
                {filteredSongs.map((song) => (
                  <div
                    key={song._id}
                    className={styles.songCard}
                    onClick={() => setActiveSongModal(song)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 className={styles.songCardTitle}>{song.title}</h3>
                        {song.assignedDate === 'Sunday Setlist' && (
                          <span style={{ 
                            background: 'rgba(234, 179, 8, 0.2)', 
                            color: '#fbbf24', 
                            fontSize: '10px', 
                            fontWeight: 800, 
                            padding: '2px 8px', 
                            borderRadius: '6px',
                            border: '1px solid rgba(234, 179, 8, 0.4)'
                          }}>
                            ⭐ Sunday Setlist
                          </span>
                        )}
                      </div>

                      {song.tamilTitle && (
                        <div className={styles.songCardTamil}>{song.tamilTitle}</div>
                      )}

                      <div className={styles.songMetaRow}>
                        <span className={`${styles.metaBadge} ${styles.keyBadge}`}>
                          🎹 Key: {song.originalKey}
                        </span>
                        <span className={`${styles.metaBadge} ${styles.tempoBadge}`}>
                          ⏱️ {song.tempo} BPM
                        </span>
                        <span className={`${styles.metaBadge} ${styles.categoryBadge}`}>
                          {song.category}
                        </span>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingTop: '12px',
                      borderTop: '1px dashed rgba(255,255,255,0.08)'
                    }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Tap to view lyrics & chords →
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayNote(song.originalKey[0]);
                        }}
                        title={`Sound starting key ${song.originalKey}`}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🔊 Pitch Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VOCAL PITCH PIPE */}
        {activeTab === 'pitch' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <span>🎹</span> Digital Vocal Pitch Pipe (Key Finder)
                </h2>
                <div className={styles.cardSubtitle}>
                  Pure acoustic reference pitches for worship leaders and choir section leaders
                </div>
              </div>

              {/* Octave Selector & Stop */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Octave:</span>
                {[-1, 0, 1].map(oct => (
                  <button
                    key={oct}
                    type="button"
                    onClick={() => setOctaveOffset(oct)}
                    style={{
                      background: octaveOffset === oct ? '#dc143c' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {oct === -1 ? 'Low (C3)' : oct === 0 ? 'Mid (C4)' : 'High (C5)'}
                  </button>
                ))}

                {activePlayingNote && (
                  <button
                    type="button"
                    onClick={() => { stopVocalPitch(); setActivePlayingNote(null); }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⏹ Stop Note
                  </button>
                )}
              </div>
            </div>

            {/* 12 Note Pitch Pipe Matrix */}
            <div className={styles.pitchGrid}>
              {NOTES.map(note => {
                const isPlaying = activePlayingNote === note;
                const freq = (NOTE_FREQUENCIES[note] || 440) * Math.pow(2, octaveOffset);
                return (
                  <button
                    key={note}
                    type="button"
                    className={`${styles.pitchBtn} ${isPlaying ? styles.pitchBtnPlaying : ''}`}
                    onClick={() => handlePlayNote(note)}
                  >
                    <span>{note}</span>
                    <span className={styles.pitchFreq}>{Math.round(freq)} Hz</span>
                  </button>
                );
              })}
            </div>

            {/* Choir Voice Section Quick Cues */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#ff4d6d', letterSpacing: '0.06em', marginBottom: '12px' }}>
                ⚡ Quick Starting Note Cues for Choir Sections
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '13px' }}>👨‍🦳 Bass & Baritone</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 8px' }}>Range: E2 - E4 (Typical: G3, A3)</div>
                  <button
                    type="button"
                    onClick={() => { setOctaveOffset(-1); handlePlayNote('G'); }}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: 'none', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🔊 Play G3 Pitch
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#a855f7', fontSize: '13px' }}>🧔 Tenor</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 8px' }}>Range: C3 - A4 (Typical: D4, E4)</div>
                  <button
                    type="button"
                    onClick={() => { setOctaveOffset(0); handlePlayNote('D'); }}
                    style={{ background: 'rgba(168, 85, 247, 0.2)', border: 'none', color: '#a855f7', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🔊 Play D4 Pitch
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#facc15', fontSize: '13px' }}>👩 Alto</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 8px' }}>Range: F3 - D5 (Typical: A3, C4)</div>
                  <button
                    type="button"
                    onClick={() => { setOctaveOffset(0); handlePlayNote('A'); }}
                    style={{ background: 'rgba(250, 204, 21, 0.2)', border: 'none', color: '#facc15', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🔊 Play A3 Pitch
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#34d399', fontSize: '13px' }}>👧 Soprano</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 8px' }}>Range: C4 - A5 (Typical: E4, G4)</div>
                  <button
                    type="button"
                    onClick={() => { setOctaveOffset(0); handlePlayNote('G'); }}
                    style={{ background: 'rgba(52, 211, 153, 0.2)', border: 'none', color: '#34d399', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🔊 Play G4 Pitch
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRACTICE METRONOME */}
        {activeTab === 'metronome' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <span>⏱️</span> Precision Rehearsal Metronome
                </h2>
                <div className={styles.cardSubtitle}>
                  Real-time audio click and visual pulse ring for choir rehearsals and band timing
                </div>
              </div>

              {/* Time Signature Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { val: 4, label: '4/4' },
                  { val: 3, label: '3/4' },
                  { val: 6, label: '6/8' },
                ].map(ts => (
                  <button
                    key={ts.val}
                    type="button"
                    onClick={() => setTimeSignature(ts.val)}
                    style={{
                      background: timeSignature === ts.val ? '#dc143c' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#fff',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {ts.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.metronomeContainer}>
              {/* Pulsing Visual Ring */}
              <div className={`${styles.pulseRing} ${pulseActive ? styles.pulseRingActive : ''}`}>
                <div className={styles.bpmDisplay}>{bpm}</div>
                <div className={styles.bpmLabel}>BPM</div>
              </div>

              {/* Beat Dots */}
              <div className={styles.beatDots}>
                {Array.from({ length: timeSignature }, (_, i) => i + 1).map(b => (
                  <div
                    key={b}
                    className={`${styles.beatDot} ${
                      currentBeat === b && isPlayingMetronome
                        ? (b === 1 ? styles.beatDotAccent : styles.beatDotActive)
                        : ''
                    }`}
                  />
                ))}
              </div>

              {/* Slider & Quick +/- */}
              <div className={styles.sliderRow}>
                <button
                  type="button"
                  className={styles.metronomeBtn}
                  onClick={() => setBpm(prev => Math.max(40, prev - 1))}
                >
                  -
                </button>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className={styles.bpmSlider}
                />
                <button
                  type="button"
                  className={styles.metronomeBtn}
                  onClick={() => setBpm(prev => Math.min(220, prev + 1))}
                >
                  +
                </button>
              </div>

              {/* Tap Tempo & Play/Stop Actions */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleTapTempo}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  👆 Tap Tempo
                </button>

                <button
                  type="button"
                  className={styles.playToggleBtn}
                  onClick={() => setIsPlayingMetronome(prev => !prev)}
                >
                  <span>{isPlayingMetronome ? '⏸ Pause' : '▶ Start Metronome'}</span>
                </button>
              </div>

              {/* Service Tempo Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                {[
                  { label: '🕊️ Slow Worship (68 BPM)', val: 68 },
                  { label: '⛪ Medium Hymn (85 BPM)', val: 85 },
                  { label: '🙌 Joyful Praise (112 BPM)', val: 112 },
                  { label: '⚡ Fast Celebration (132 BPM)', val: 132 },
                ].map(preset => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setBpm(preset.val)}
                    style={{
                      background: bpm === preset.val ? 'rgba(220, 20, 60, 0.25)' : 'rgba(255,255,255,0.04)',
                      border: bpm === preset.val ? '1px solid rgba(220, 20, 60, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                      color: bpm === preset.val ? '#ff4d6d' : '#cbd5e1',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SATB VOICE PARTS & VOCAL HEALTH */}
        {activeTab === 'tips' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <span>🎤</span> SATB Harmony Guide & Vocal Care
                </h2>
                <div className={styles.cardSubtitle}>
                  Essential vocal training notes for choir singers and praise teams
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', margin: '0 0 8px 0' }}>
                  👧 Soprano Section
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  Carries the primary melody and leads the congregation. Focus on forward resonance, relaxed jaw, and soft palate lift on higher notes above D5. Keep breathing from the diaphragm rather than chest.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#facc15', margin: '0 0 8px 0' }}>
                  👩 Alto Section
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  Provides the rich harmonic foundation right below the soprano melody. Aim for warm chest-mix resonance and clear diction, locking in 3rds and 6ths with the lead vocalists.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#a855f7', margin: '0 0 8px 0' }}>
                  🧔 Tenor Section
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  Brightens the harmonic texture. Transition smoothly through the vocal bridge (passaggio around E4-G4) by avoiding excessive throat strain; use light, ringing head-voice resonance.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', margin: '0 0 8px 0' }}>
                  👨‍🦳 Bass Section
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  Anchors the harmonic root of every chord with the bass guitar and keyboard. Emphasize low chest resonance and tight rhythmic synchronization with the metronome beat.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: 'rgba(220, 20, 60, 0.1)', border: '1px solid rgba(220, 20, 60, 0.3)', borderRadius: '18px', padding: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#ff4d6d', margin: '0 0 8px 0' }}>
                💧 Sunday Morning Vocal Warm-Up Routine (10 Minutes Before Service)
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.7 }}>
                <li><strong>2 Mins:</strong> Gentle lip trills and tongue rolls (ascending 5-note scales).</li>
                <li><strong>3 Mins:</strong> Soft humming on "Mmm" feeling nasal bone vibration to warm up resonance cavities.</li>
                <li><strong>3 Mins:</strong> Sirens and gentle vowel arpeggios ("Ah - Eh - Ee - Oh - Oo") with dropped jaw.</li>
                <li><strong>2 Mins:</strong> Hydrate with room-temperature water. Avoid cold water and dairy before singing.</li>
              </ul>
            </div>
          </div>
        )}

      </main>

      {/* LYRICS & CHORDS DETAIL MODAL */}
      {activeSongModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveSongModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>
                  {activeSongModal.title}
                </h3>
                {activeSongModal.tamilTitle && (
                  <div style={{ fontSize: '14px', color: '#ff4d6d', fontWeight: 600, marginTop: '2px' }}>
                    {activeSongModal.tamilTitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveSongModal(null)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Controls Bar: Script Toggle + Zoom + Sound Key */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* Script Toggle */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setLyricsScript('english')}
                  style={{
                    background: lyricsScript === 'english' ? '#dc143c' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  English / Roman
                </button>
                <button
                  type="button"
                  onClick={() => setLyricsScript('tamil')}
                  style={{
                    background: lyricsScript === 'tamil' ? '#dc143c' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  தமிழ் Script
                </button>
              </div>

              {/* Font Size & Key */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePlayNote(activeSongModal.originalKey[0])}
                  style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔊 Key: {activeSongModal.originalKey}
                </button>
                <button
                  type="button"
                  onClick={() => setLyricsFontSize(prev => Math.max(12, prev - 2))}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setLyricsFontSize(prev => Math.min(24, prev + 2))}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                >
                  A+
                </button>
              </div>
            </div>

            {/* Lyrics Content */}
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ 
                fontSize: `${lyricsFontSize}px`, 
                lineHeight: 1.8, 
                whiteSpace: 'pre-wrap', 
                color: '#f1f5f9',
                fontFamily: lyricsScript === 'tamil' ? 'system-ui, sans-serif' : 'monospace'
              }}>
                {lyricsScript === 'tamil' && activeSongModal.tamilLyrics
                  ? activeSongModal.tamilLyrics
                  : (activeSongModal.lyrics || activeSongModal.tamilLyrics || 'No lyrics added yet.')}
              </div>

              {/* Optional Chords Section */}
              {activeSongModal.chords && (
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🎸 Chord Progression / Lead Sheet
                  </div>
                  <pre style={{
                    background: 'rgba(0,0,0,0.5)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {activeSongModal.chords}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleShareSongLyrics(activeSongModal)}
                style={{
                  background: '#25D366',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span> Share Lyrics on WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setActiveSongModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SONG MODAL */}
      {isNewSongModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNewSongModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                ➕ Add Worship Song to Songbook
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSongModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSongSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Song Title (English/Transliteration)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. En Uyirana Yesu / Way Maker"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tamil Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. என் உயிரான இயேசு"
                  value={newTamilTitle}
                  onChange={(e) => setNewTamilTitle(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Original Key</label>
                  <select
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff' }}
                  >
                    {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Em', 'Am', 'Dm', 'Bm'].map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tempo (BPM)</label>
                  <input
                    type="number"
                    value={newTempo}
                    onChange={(e) => setNewTempo(Number(e.target.value))}
                    min="40"
                    max="220"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff' }}
                  >
                    {['Worship', 'Praise', 'Tamil Hymn', 'Special Number', 'Offertory', 'Communion'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lyrics (English / Roman Transliteration)</label>
                <textarea
                  rows={5}
                  placeholder="Paste English or Tanglish lyrics here..."
                  value={newLyrics}
                  onChange={(e) => setNewLyrics(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tamil Script Lyrics (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Paste தமிழ் வரிகள் here..."
                  value={newTamilLyrics}
                  onChange={(e) => setNewTamilLyrics(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewSongModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSong}
                  style={{ background: 'linear-gradient(135deg, #dc143c, #900d28)', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingSong ? 'Saving...' : 'Save Song'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
