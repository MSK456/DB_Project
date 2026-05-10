// src/components/layout/Navbar.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import * as authService from '../../services/authService';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const getDashboardPath = () => {
    if (user?.role === 'Admin') return '/dashboard/admin';
    if (user?.role === 'Driver') return '/dashboard/driver';
    return '/dashboard/rider';
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      background: scrolled ? 'rgba(5, 5, 8, 0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: 'none'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '1800px' }}>
        
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.15em' }}>RIDEFLOW</span>
        </Link>

        <div style={{ display: 'flex', gap: '56px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {['Experience', 'Fleet', 'Membership', 'Support'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '11px', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'var(--amber-core)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {!isAuthenticated ? (
            <>
              <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>SIGN IN</Link>
              <button className="btn-primary" style={{ padding: '12px 36px', fontSize: '11px' }} onClick={() => navigate('/register')}>GET STARTED</button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: '11px' }} onClick={() => navigate(getDashboardPath())}>DASHBOARD</button>
              <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={handleLogout}>LOGOUT</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
