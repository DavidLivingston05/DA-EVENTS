'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { playAudioFeedback } from '@/lib/soundEffects';
import { useAndroidBackClose } from '@/lib/useAndroidBackClose';

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: any;
  attendances: any[];
  allUsers: any[];
  onCheckIn: (userId: string, additionalCount?: number, guestNames?: string) => Promise<void>;
}

export default function LiveScannerModal({
  isOpen,
  onClose,
  selectedEvent,
  attendances,
  allUsers,
  onCheckIn
}: LiveScannerModalProps) {
  useAndroidBackClose(isOpen, onClose);

  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<{
    type: 'success' | 'warning' | 'error' | 'idle';
    title: string;
    subtitle?: string;
    details?: any;
  }>({ type: 'idle', title: 'Scanner Ready' });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Quick unregistered member walk-in check-in state
  const [unregisteredMember, setUnregisteredMember] = useState<any | null>(null);
  const [walkinGuests, setWalkinGuests] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported on this browser/environment.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Could not start camera. You can still use the Quick Pass / Phone search below!');
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Main lookup and check-in processor
  const processCheckInCode = useCallback(async (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;

    // Throttle duplicate reads within 3 seconds
    const now = Date.now();
    if (lastScannedCodeRef.current === clean && (now - lastScannedTimeRef.current < 3000)) {
      return;
    }
    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;

    // Extract identifier: could be "ROS-PASS:USER_ID:NAME", full Mongo ID, 6-char pass suffix, phone number, or name
    let lookupId = clean;
    if (clean.startsWith('ROS-PASS:')) {
      const parts = clean.split(':');
      lookupId = parts[1] || clean;
    }

    // 1. Check if user is in attendances for this event
    let targetAtt = attendances.find((att: any) => {
      const u = att.userId;
      if (!u) return false;
      const uId = u._id || u;
      return (
        uId === lookupId ||
        (typeof uId === 'string' && uId.slice(-6).toUpperCase() === lookupId.toUpperCase()) ||
        (u.contactNumber && u.contactNumber.replace(/\D/g, '') === lookupId.replace(/\D/g, '')) ||
        (u.name && u.name.toLowerCase() === lookupId.toLowerCase())
      );
    });

    if (targetAtt) {
      const userObj = targetAtt.userId;
      const uId = userObj._id || userObj;
      const userName = userObj.name || 'Member';
      const guests = targetAtt.additionalCount || 0;

      try {
        await onCheckIn(uId);
        playAudioFeedback('success');

        const successItem = {
          id: `${uId}-${Date.now()}`,
          name: userName,
          guests,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          category: userObj.category || 'General'
        };

        setScanStatus({
          type: 'success',
          title: `✓ Checked In: ${userName}`,
          subtitle: guests > 0 ? `With ${guests} guest(s) — Welcome!` : 'Welcome to the Sanctuary!',
          details: successItem
        });

        setRecentScans(prev => [successItem, ...prev.slice(0, 7)]);
        setManualInput('');
        setUnregisteredMember(null);
      } catch (err: any) {
        playAudioFeedback('alert');
        setScanStatus({
          type: 'error',
          title: 'Check-in Failed',
          subtitle: err.message || 'Please retry.'
        });
      }
      return;
    }

    // 2. If not found in event attendances, check Church Directory
    const directoryUser = allUsers.find((u: any) => {
      const uId = u._id;
      return (
        uId === lookupId ||
        (typeof uId === 'string' && uId.slice(-6).toUpperCase() === lookupId.toUpperCase()) ||
        (u.contactNumber && u.contactNumber.replace(/\D/g, '') === lookupId.replace(/\D/g, '')) ||
        (u.name && u.name.toLowerCase().includes(lookupId.toLowerCase()))
      );
    });

    if (directoryUser) {
      playAudioFeedback('pop');
      setUnregisteredMember(directoryUser);
      setScanStatus({
        type: 'warning',
        title: `Member Found: ${directoryUser.name}`,
        subtitle: 'Not pre-registered for this gathering. Quick check-in below?'
      });
      return;
    }

    // 3. Not found
    playAudioFeedback('alert');
    setScanStatus({
      type: 'error',
      title: 'Pass Not Recognized',
      subtitle: `No member matched code "${clean}". Try searching by phone or name.`
    });
  }, [attendances, allUsers, onCheckIn]);

  // Video scanning loop
  useEffect(() => {
    if (!isOpen || !cameraActive) return;

    let isActive = true;

    const tick = () => {
      if (!isActive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            processCheckInCode(code.data);
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, cameraActive, processCheckInCode]);

  // Manage camera on modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScanStatus({ type: 'idle', title: 'Scanner Ready' });
      setUnregisteredMember(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleWalkinConfirm = async () => {
    if (!unregisteredMember) return;
    try {
      await onCheckIn(unregisteredMember._id, walkinGuests);
      playAudioFeedback('success');

      const successItem = {
        id: `${unregisteredMember._id}-${Date.now()}`,
        name: unregisteredMember.name,
        guests: walkinGuests,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: unregisteredMember.category || 'General'
      };

      setScanStatus({
        type: 'success',
        title: `✓ Quick Walk-In Checked In: ${unregisteredMember.name}`,
        subtitle: walkinGuests > 0 ? `Registered with ${walkinGuests} guest(s)!` : 'Registered & Checked In!',
        details: successItem
      });

      setRecentScans(prev => [successItem, ...prev.slice(0, 7)]);
      setUnregisteredMember(null);
      setWalkinGuests(0);
      setManualInput('');
    } catch (err: any) {
      playAudioFeedback('alert');
      alert('Failed to check in: ' + err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #161622 0%, #0d0d14 100%)',
        border: '1px solid rgba(220, 20, 60, 0.4)',
        borderRadius: '28px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 30px 60px rgba(0,0,0,0.85), 0 0 40px rgba(220, 20, 60, 0.25)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Rapid Check-In Scanner
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a1a1aa' }}>
              {selectedEvent?.eventName || 'Church Gathering'} • Instant Live Entry
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Camera Viewport / Scanner */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            backgroundColor: '#000',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '2px solid rgba(220, 20, 60, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {cameraActive && !cameraError ? (
              <>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Reticle Overlay */}
                <div style={{
                  position: 'absolute',
                  width: '160px',
                  height: '160px',
                  border: '2px dashed #dc143c',
                  borderRadius: '16px',
                  boxShadow: '0 0 20px rgba(220, 20, 60, 0.4), inset 0 0 20px rgba(220, 20, 60, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  {/* Laser line animation */}
                  <div style={{
                    width: '100%',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #ff4d6d, #ffffff, #ff4d6d, transparent)',
                    boxShadow: '0 0 8px #ff4d6d',
                    animation: 'laserScan 2s ease-in-out infinite'
                  }} />
                </div>

                {/* Camera Flip button */}
                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  🔄 Flip Camera
                </button>
              </>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#a1a1aa' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f87171' }}>
                  {cameraError || 'Camera inactive'}
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    marginTop: '12px',
                    background: 'rgba(220,20,60,0.25)',
                    border: '1px solid rgba(220,20,60,0.5)',
                    color: '#fff',
                    padding: '6px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Enable Camera
                </button>
              </div>
            )}
          </div>

          {/* Quick Manual Entry Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processCheckInCode(manualInput);
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="🔍 Type Pass Code (#B9E3A1), Phone Number, or Name..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '14px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              style={{
                background: 'linear-gradient(135deg, #dc143c, #900d28)',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: manualInput.trim() ? 'pointer' : 'not-allowed',
                opacity: manualInput.trim() ? 1 : 0.5,
                transition: 'all 0.15s ease'
              }}
            >
              Check In
            </button>
          </form>

          {/* Live Status Toast/Banner */}
          {scanStatus.type !== 'idle' && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: scanStatus.type === 'success' 
                ? 'rgba(34, 197, 94, 0.15)' 
                : scanStatus.type === 'warning'
                ? 'rgba(234, 179, 8, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${
                scanStatus.type === 'success' 
                  ? 'rgba(34, 197, 94, 0.5)' 
                  : scanStatus.type === 'warning'
                  ? 'rgba(234, 179, 8, 0.5)'
                  : 'rgba(239, 68, 68, 0.5)'
              }`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div>
                <div style={{ 
                  fontWeight: 800, 
                  fontSize: '14px',
                  color: scanStatus.type === 'success' ? '#4ade80' : scanStatus.type === 'warning' ? '#facc15' : '#f87171' 
                }}>
                  {scanStatus.title}
                </div>
                {scanStatus.subtitle && (
                  <div style={{ fontSize: '12px', color: '#d4d4d8', marginTop: '2px' }}>
                    {scanStatus.subtitle}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unregistered Member Walk-In Prompt */}
          {unregisteredMember && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24' }}>
                    {unregisteredMember.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#d4d4d8' }}>
                    📞 {unregisteredMember.contactNumber} • Category: {unregisteredMember.category || 'General'}
                  </div>
                </div>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  Walk-In
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#e4e4e7' }}>Bringing guests?</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setWalkinGuests(prev => Math.max(0, prev - 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, width: '24px', textAlign: 'center' }}>
                    {walkinGuests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWalkinGuests(prev => prev + 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleWalkinConfirm}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✓ Confirm & Check In
                </button>
                <button
                  type="button"
                  onClick={() => setUnregisteredMember(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recent Live Check-In Stream */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#a1a1aa'
            }}>
              <span>Live Check-in Stream ({recentScans.length})</span>
              {recentScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '11px', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>

            {recentScans.length === 0 ? (
              <div style={{ 
                padding: '16px', 
                borderRadius: '14px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px dashed rgba(255,255,255,0.1)', 
                textAlign: 'center', 
                fontSize: '12px', 
                color: '#71717a' 
              }}>
                Scan a QR pass or enter a code to start recording check-ins!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {recentScans.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#22c55e', fontWeight: 800 }}>✓</span>
                      <strong style={{ color: '#fff' }}>{item.name}</strong>
                      {item.guests > 0 && (
                        <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(220,20,60,0.2)', padding: '1px 6px', borderRadius: '6px' }}>
                          +{item.guests} guests
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#71717a', fontFamily: 'monospace' }}>
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Keyframe CSS Injection */}
        <style jsx global>{`
          @keyframes laserScan {
            0% { transform: translateY(-70px); opacity: 0.8; }
            50% { transform: translateY(70px); opacity: 1; }
            100% { transform: translateY(-70px); opacity: 0.8; }
          }
        `}</style>
      </div>
    </div>
  );
}
