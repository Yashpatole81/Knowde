import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.code}>404</h1>
      <p style={styles.text}>Page not found</p>
      <Link href="/" style={styles.link}>
        Go home
      </Link>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    color: '#e5e7eb',
    gap: '12px',
  },
  code: {
    fontSize: '4rem',
    fontWeight: 800,
    color: '#10b981',
  },
  text: {
    fontSize: '1.1rem',
    color: '#9ca3af',
  },
  link: {
    marginTop: '16px',
    color: '#10b981',
    fontSize: '0.95rem',
    textDecoration: 'underline',
  },
};
