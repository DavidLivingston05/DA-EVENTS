import Link from 'next/link';
import styles from '../page.module.css';

export default function AboutPage() {
  return (
    <main className={styles.main}>
      <nav className={`${styles.navbar} ${styles.scrolled}`}>
        <div className={styles.logo}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>DA-ROS</Link>
        </div>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/about" className={styles.navLink} style={{ color: '#fff' }}>About</Link>
          <Link href="/events" className={styles.navLink}>Events</Link>
        </div>
        <Link href="/login" className={styles.loginBtn}>
          Login
        </Link>
      </nav>

      <section className={styles.hero} style={{ minHeight: 'auto', paddingTop: '140px', paddingBottom: '60px' }}>
        <div className={styles.glowTopRight}></div>
        <div className={styles.heroContent} style={{ maxWidth: '800px' }}>
          <div className={styles.eyebrow}>About Us</div>
          <h1 className={styles.h1}>Connecting Our Church Community</h1>
          <p className={styles.subtitle} style={{ maxWidth: '640px', margin: '0 auto 32px' }}>
            DA-ROS is an event management platform built specifically for our church family. 
            Discover upcoming services, register for gatherings, and stay connected with ease.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/login" className={styles.btnPrimary}>Join Community</Link>
            <Link href="/events" className={styles.btnOutline}>Explore Events</Link>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection} style={{ paddingTop: '20px' }}>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>🎯</div>
            <h3 className={styles.cardTitle}>Our Mission</h3>
            <p className={styles.cardDesc}>To simplify event discovery and registration so every member can actively participate in church life.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>🤝</div>
            <h3 className={styles.cardTitle}>Community First</h3>
            <p className={styles.cardDesc}>Built with love for our church, keeping attendance tracking, service schedules, and announcements seamless.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>📱</div>
            <h3 className={styles.cardTitle}>Modern & Accessible</h3>
            <p className={styles.cardDesc}>Works on mobile and desktop as a full Progressive Web App for instant access anywhere.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>DA-ROS</div>
        <div className={styles.copyright}>© {new Date().getFullYear()} DA-ROS. All rights reserved.</div>
      </footer>
    </main>
  );
}
