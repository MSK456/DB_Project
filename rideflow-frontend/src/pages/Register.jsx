// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, ArrowRight, User, Car, ShieldCheck, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import * as authService from '../services/authService';
import { Input, Spinner, GlassCard } from '../components/ui';
import { useApi } from '../hooks/useApi';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(searchParams.get('role')?.charAt(0).toUpperCase() + searchParams.get('role')?.slice(1) || 'Rider');
  const [form, setForm] = useState({ 
    full_name: '', email: '', phone: '', password: '', confirm_password: '', license_number: '', cnic: '' 
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { loading, execute } = useApi();

  const update = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(p => ({ ...p, [k]: null }));
  };

  const getPasswordStrength = (pw) => {
    if (!pw) return 0;
    if (pw.length < 8) return 1;
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    if (pw.length >= 8 && (hasNumber || hasUpper) && hasSpecial) return 4;
    if (pw.length >= 8 && hasNumber) return 3;
    if (pw.length >= 8) return 2;
    return 1;
  };

  const strength = getPasswordStrength(form.password);
  const strengthText = ['Too Weak', 'Too Weak', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#EF4444', '#F97316', '#F5A623', '#22C55E'];

  const validate = () => {
    const errors = {};
    if (form.full_name.length < 2) errors.full_name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
    if (!/^\d{10,15}$/.test(form.phone)) errors.phone = 'Phone must be 10-15 digits';
    if (strength < 4) errors.password = 'Password must be strong (8+ chars, uppercase, number, special char)';
    if (form.password !== form.confirm_password) errors.confirm_password = 'Passwords do not match';
    
    if (role === 'Driver') {
      if (!form.license_number) errors.license_number = 'License number required';
      if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnic)) errors.cnic = 'Format: XXXXX-XXXXXXX-X';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = { ...form, role };
    if (role === 'Rider') { delete payload.license_number; delete payload.cnic; }
    delete payload.confirm_password;

    const result = await execute(() => authService.register(payload), {
      showSuccessToast: false,
      onError: (err) => {
        if (err.response?.status === 409) {
          const msg = err.response.data.message;
          if (msg.toLowerCase().includes('email')) setFieldErrors({ email: 'Email already registered' });
          else if (msg.toLowerCase().includes('phone')) setFieldErrors({ phone: 'Phone already in use' });
        } else if (err.response?.status === 400 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        }
      }
    });

    if (result) {
      setAuth(result.data.user);
      setStep(3);
      setTimeout(() => {
        const routes = { Rider: '/dashboard/rider', Driver: '/dashboard/driver', Admin: '/dashboard/admin' };
        navigate(routes[role] || '/');
      }, 2000);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Left Panel */}
      <div style={{ flex: '1', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px', background: '#050508' }}>
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,8,0.9) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <Zap size={40} color="var(--amber-core)" fill="var(--amber-core)" style={{ marginBottom: '32px' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '0.05em' }}>
            PRECISION <span style={{ color: 'var(--amber-core)' }}>MOBILITY</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>Join the elite network of premium urban transport.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '64px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: s === step ? '32px' : '10px', height: '10px', borderRadius: '5px', background: s <= step ? 'var(--amber-core)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: '100%', maxWidth: '640px', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Choose Your Path</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '48px', fontSize: '14px' }}>Select how you'd like to experience RideFlow.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
                {[{ id: 'Rider', title: "I'm a Rider", icon: User }, { id: 'Driver', title: "I want to Drive", icon: Car }].map(item => (
                  <GlassCard key={item.id} level={role === item.id ? 'amber' : 1} onClick={() => setRole(item.id)} style={{ padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '24px', border: role === item.id ? '1px solid var(--amber-core)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--amber-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-core)' }}><item.icon size={24} /></div>
                    <h4 style={{ fontSize: '1.1rem', color: role === item.id ? 'var(--amber-core)' : 'var(--text-primary)' }}>{item.title}</h4>
                  </GlassCard>
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '18px' }} onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></button>
              <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px' }}>Already a member? <Link to="/login" style={{ color: 'var(--amber-core)', textDecoration: 'none' }}>Sign In</Link></p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '24px' }}>← Back</button>
              <h2 style={{ fontSize: '2rem', marginBottom: '32px' }}>Personal Profile</h2>
              <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}><Input label="Full Name" value={form.full_name} onChange={e => update('full_name', e.target.value)} error={fieldErrors.full_name} required /></div>
                <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} error={fieldErrors.email} required />
                <Input label="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} error={fieldErrors.phone} required />
                {role === 'Driver' && (
                  <><Input label="License" value={form.license_number} onChange={e => update('license_number', e.target.value)} error={fieldErrors.license_number} required /><Input label="CNIC" placeholder="XXXXX-XXXXXXX-X" value={form.cnic} onChange={e => update('cnic', e.target.value)} error={fieldErrors.cnic} required /></>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label-caps">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="rf-input" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${strength * 25}%`, background: strengthColor[strength], transition: 'all 0.3s' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: strengthColor[strength], marginTop: '4px' }}>{strengthText[strength]}</p>
                    </div>
                  )}
                  {fieldErrors.password && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.password}</p>}
                </div>
                <div style={{ gridColumn: 'span 2' }}><Input label="Confirm Password" type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)} error={fieldErrors.confirm_password} required /></div>
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                  <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '18px' }}>
                    {loading ? <Spinner size={18} /> : <>Create Account <ShieldCheck size={18} /></>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--amber-ghost)', color: 'var(--amber-core)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}><CheckCircle2 size={40} /></div>
              <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Welcome, {form.full_name.split(' ')[0]}</h2>
              <p style={{ color: 'var(--text-muted)' }}>Account created successfully. Redirecting to your dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
