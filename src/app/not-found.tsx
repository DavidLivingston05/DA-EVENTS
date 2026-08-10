import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      color: '#f4f8fb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(220, 20, 60, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(18, 18, 22, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '48px 36px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #dc143c 0%, #ff4d6d 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '16px',
          letterSpacing: '-2px'
        }}>
          404
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0', color: '#fff' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#86868b', fontSize: '15px', margin: '0 0 32px 0', lineHeight: 1.6 }}>
          The page you are looking for doesn't exist, was moved, or is temporarily unavailable.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              background: 'linear-gradient(135deg, #dc143c 0%, #b01030 100%)',
              color: '#fff',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(220, 20, 60, 0.4)',
              transition: 'transform 0.2s ease'
            }}
          >
            Go to Home
          </Link>
          <Link
            href="/login"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#f4f8fb',
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '12px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background 0.2s ease'
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
