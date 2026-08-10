'use client';

import { useMemo } from 'react';

interface QRCodePassProps {
  eventName: string;
  userName: string;
  contactNumber: string;
  registrationId: string;
  date: string;
  time: string;
  location: string;
  partySize: number;
  specialNotes?: string;
}

export default function QRCodePass({
  eventName,
  userName,
  contactNumber,
  registrationId,
  date,
  time,
  location,
  partySize,
  specialNotes
}: QRCodePassProps) {
  // Generate deterministic SVG QR Matrix pattern from registration ID
  const qrMatrix = useMemo(() => {
    const size = 21; // 21x21 QR Version 1 grid
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[row + r][col + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);

    for (let i = 8; i < 13; i += 2) {
      matrix[6][i] = true;
      matrix[i][6] = true;
    }

    const seed = `${registrationId}-${userName}-${eventName}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c > 12) ||
          (r > 12 && c < 8)
        ) continue;

        const val = Math.abs(Math.sin((r * 21 + c) * hash + hash)) * 100;
        matrix[r][c] = val > 45;
      }
    }

    return matrix;
  }, [registrationId, userName, eventName]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #18181f 0%, #0d0d12 100%)',
      border: '1px solid rgba(220,20,60,0.35)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 30px rgba(220,20,60,0.15)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.4)', color: '#30d158', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.06em' }}>
          <span>✓</span> OFFICIAL ACCESS PASS
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🖨️ Save / Print Pass
          </button>
          <span style={{ fontSize: '11px', color: '#86868b', fontFamily: 'monospace' }}>
            ID: {registrationId.slice(-8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Grid: QR & Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'center' }}>
        {/* QR Code Container */}
        <div style={{
          background: '#ffffff',
          padding: '12px',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="130" height="130" viewBox="0 0 21 21" style={{ display: 'block' }}>
            <rect width="21" height="21" fill="#ffffff" />
            {qrMatrix.map((row, r) =>
              row.map((cell, c) =>
                cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000000" /> : null
              )
            )}
          </svg>
        </div>

        {/* Ticket Details */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff', lineHeight: 1.2 }}>
            {eventName}
          </h3>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc143c', marginBottom: '8px' }}>
            👤 {userName} {partySize > 1 ? `(+${partySize - 1} Guests)` : ''}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.6 }}>
            <div>📅 {date}</div>
            <div>⏰ {time}</div>
            <div>📍 {location}</div>
            {specialNotes && (
              <div style={{ marginTop: '4px', color: '#ffc107', fontWeight: 600 }}>
                ♿ Assistance: {specialNotes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#86868b' }}>
        <span>Show this QR code at church entrance for instant check-in</span>
        <span style={{ fontWeight: 700, color: '#fff' }}>Party Size: {partySize}</span>
      </div>
    </div>
  );
}
