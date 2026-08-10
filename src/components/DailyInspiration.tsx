'use client';

import { useState, useEffect } from 'react';

const VERSES = [
  {
    verse: "I can do all things through Christ who strengthens me.",
    ref: "Philippians 4:13",
    theme: "Strength & Perseverance"
  },
  {
    verse: "For where two or three gather in my name, there am I with them.",
    ref: "Matthew 18:20",
    theme: "Fellowship & Unity"
  },
  {
    verse: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.",
    ref: "Matthew 5:16",
    theme: "Inspiration & Hope"
  },
  {
    verse: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures.",
    ref: "Psalm 23:1-2",
    theme: "Peace & Comfort"
  },
  {
    verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    ref: "Joshua 1:9",
    theme: "Courage & Faith"
  },
  {
    verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
    ref: "Proverbs 3:5",
    theme: "Trust & Guidance"
  },
  {
    verse: "And now these three remain: faith, hope and love. But the greatest of these is love.",
    ref: "1 Corinthians 13:13",
    theme: "Love & Faith"
  }
];

export default function DailyInspiration() {
  const [todayVerse, setTodayVerse] = useState(VERSES[0]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / 86400000);
    setTodayVerse(VERSES[dayOfYear % VERSES.length]);
  }, []);

  const handleShareWhatsApp = () => {
    const text = `📖 *Daily Reflection from DA-ROS Church*\n\n"${todayVerse.verse}"\n— *${todayVerse.ref}*\n\n✨ Have a blessed and inspired day!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(220,20,60,0.18) 0%, rgba(20,20,28,0.9) 100%)',
      border: '1px solid rgba(220,20,60,0.3)',
      borderRadius: '20px',
      padding: '24px 28px',
      marginBottom: '24px',
      boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(220,20,60,0.2)', border: '1px solid rgba(220,20,60,0.4)', color: '#ff4d6d', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>✨</span> SCRIPTURE OF THE DAY
        </div>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          style={{
            background: '#25D366',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(37,211,102,0.3)'
          }}
        >
          <span>📲</span> Share Verse
        </button>
      </div>

      <blockquote style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: '#f4f8fb', fontStyle: 'italic', lineHeight: 1.5 }}>
        &quot;{todayVerse.verse}&quot;
      </blockquote>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
        <span style={{ fontWeight: 800, color: '#dc143c' }}>— {todayVerse.ref}</span>
        <span style={{ color: '#86868b', fontSize: '12px' }}>Theme: {todayVerse.theme}</span>
      </div>
    </div>
  );
}
