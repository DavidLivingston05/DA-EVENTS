'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    // Embed a structured pass token that the Admin Live Scanner parses instantly
    const passToken = `ROS-PASS:${registrationId}:${userName}`;
    QRCode.toDataURL(passToken, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0a0a0f',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [registrationId, userName]);

  const handlePrint = () => {
    window.print();
  };

  const shortCode = registrationId ? registrationId.slice(-6).toUpperCase() : 'PASS';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #181822 0%, #0d0d14 100%)',
      border: '1px solid rgba(220,20,60,0.4)',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.8), 0 0 35px rgba(220,20,60,0.2)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative top shimmer line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #dc143c, #ff4d6d, #8028dd, #dc143c)',
        backgroundSize: '200% 100%'
      }} />

      {/* Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px', 
          background: 'rgba(48,209,88,0.18)', 
          border: '1px solid rgba(48,209,88,0.5)', 
          color: '#34d399', 
          fontSize: '11px', 
          fontWeight: 800, 
          padding: '5px 14px', 
          borderRadius: '20px', 
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          <span>✦</span> OFFICIAL GATHERING PASS
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            🖨️ <span>Print / Save</span>
          </button>
        </div>
      </div>

      {/* Main Grid: QR & Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '22px', alignItems: 'center' }}>
        {/* QR Code Container */}
        <div style={{
          background: '#ffffff',
          padding: '12px',
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '140px',
          minHeight: '140px'
        }}>
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="Official Entry Pass QR" 
              style={{ width: '130px', height: '130px', display: 'block', borderRadius: '4px' }} 
            />
          ) : (
            <div style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '11px' }}>
              Generating QR...
            </div>
          )}
          <span style={{ 
            marginTop: '6px', 
            fontSize: '11px', 
            fontWeight: 800, 
            letterSpacing: '0.12em', 
            color: '#111', 
            fontFamily: 'monospace' 
          }}>
            #{shortCode}
          </span>
        </div>

        {/* Ticket Details */}
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ff4d6d', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '2px' }}>
            Rose of Sharon IPC
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff', lineHeight: 1.25 }}>
            {eventName}
          </h3>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 700, 
            color: '#f87171', 
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>👤</span>
            <span>{userName}</span>
            {partySize > 1 && (
              <span style={{ 
                background: 'rgba(220, 20, 60, 0.25)', 
                border: '1px solid rgba(220, 20, 60, 0.5)', 
                fontSize: '11px', 
                padding: '2px 8px', 
                borderRadius: '8px',
                color: '#fff'
              }}>
                +{partySize - 1} Guests
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#d4d4d8', lineHeight: 1.7 }}>
            <div>📅 <strong style={{ color: '#fff' }}>{date}</strong></div>
            <div>⏰ <strong style={{ color: '#fff' }}>{time}</strong></div>
            <div>📍 <span>{location}</span></div>
            {specialNotes && (
              <div style={{ marginTop: '6px', color: '#fbbf24', fontWeight: 600, fontSize: '12px' }}>
                ♿ Assistance: {specialNotes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ 
        marginTop: '22px', 
        paddingTop: '16px', 
        borderTop: '1px dashed rgba(255,255,255,0.14)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        fontSize: '12px', 
        color: '#9ca3af' 
      }}>
        <span>⚡ Show at sanctuary entrance for 1-second check-in</span>
        <span style={{ 
          fontWeight: 800, 
          color: '#fff',
          background: 'rgba(255,255,255,0.08)',
          padding: '4px 10px',
          borderRadius: '8px'
        }}>
          Total Headcount: {partySize}
        </span>
      </div>
    </div>
  );
}
