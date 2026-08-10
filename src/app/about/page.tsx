import Link from 'next/link';

export default function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛪</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>
          Rose of Sharon IPC Church
        </h1>
        <p style={{ fontSize: '16px', color: '#a1a1aa', lineHeight: 1.6, marginBottom: '32px' }}>
          Welcome to Rose of Sharon IPC Church. This application allows church members and guests to view upcoming prayer meetings, Sunday worship services, youth fellowships, and special gatherings, and register with a single click.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#dc143c' }}>
            What We Do:
          </h3>
          <ul style={{ paddingLeft: '20px', color: '#d4d4d8', lineHeight: 1.8, fontSize: '15px' }}>
            <li><strong>Sunday Worship Services:</strong> Weekly praise, worship, and sermon gatherings.</li>
            <li><strong>Prayer Meetings:</strong> Mid-week prayer gatherings and fasting prayers.</li>
            <li><strong>Youth & Family Fellowships:</strong> Community gatherings for all age groups.</li>
            <li><strong>Easy Event Registration:</strong> Register yourself and family members in 5 seconds.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href="/home"
            style={{
              background: '#dc143c',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '980px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '15px'
            }}
          >
            View Upcoming Events →
          </Link>
          <Link
            href="/login"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '980px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '15px'
            }}
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    </main>
  );
}
