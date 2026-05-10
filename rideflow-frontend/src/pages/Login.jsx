// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import * as authService from '../services/authService';
import { Input, Spinner } from '../components/ui';
import { useApi } from '../hooks/useApi';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { loading, error: apiError, execute } = useApi();

  const handleLogin = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const result = await execute(() => authService.login(form), {
      showSuccessToast: false,
      showErrorToast: false, // Handle errors manually for field-level feedback
      onError: (err) => {
        if (err.response?.status === 401) setFieldErrors({ password: 'Incorrect password' });
        else if (err.response?.status === 404) setFieldErrors({ email: 'No account found with this email' });
      }
    });

    if (result) {
      setAuth(result.data.user);
      const routes = { Rider: '/dashboard/rider', Driver: '/dashboard/driver', Admin: '/dashboard/admin' };
      navigate(routes[result.data.user.role] || '/');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Left Panel */}
      <div style={{ flex: '1.2', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '80px', background: '#050508' }}>
        <img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,8,1) 0%, rgba(5,5,8,0.4) 40%, transparent 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}><Zap size={28} color="var(--amber-core)" fill="var(--amber-core)" /><span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.1em' }}>RIDEFLOW</span></div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '24px' }}>THE KEYS TO THE <span style={{ color: 'var(--amber-core)' }}>CITY</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1.7 }}>Sign in to access your premium mobility dashboard.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '48px', fontSize: '14px' }}>Don't have an account? <Link to="/register" style={{ color: 'var(--amber-core)', fontWeight: 600, textDecoration: 'none' }}>Create one →</Link></p>

          {apiError && !fieldErrors.email && !fieldErrors.password && (
            <div className="glass-amber" style={{ padding: '16px 20px', marginBottom: '32px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ color: '#EF4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {apiError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Input label="Email Address" type="email" placeholder="name@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} error={fieldErrors.email} required />
            <div>
              <label className="label-caps">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="rf-input" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required style={{ paddingRight: '50px' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {fieldErrors.password && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.password}</p>}
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '16px', padding: '18px' }}>
              {loading ? <Spinner size={18} /> : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
