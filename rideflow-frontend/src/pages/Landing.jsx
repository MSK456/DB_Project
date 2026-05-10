// src/pages/Landing.jsx
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Star, CheckCircle2, ChevronRight, User } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import HeroCarScene from '../components/landing/HeroCarScene';
import useAuthStore from '../store/authStore';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleBook = () => {
    if (isAuthenticated) {
      const routes = { Rider: '/dashboard/rider', Driver: '/dashboard/driver', Admin: '/dashboard/admin' };
      navigate(routes[user?.role] || '/');
    } else {
      navigate('/register');
    }
  };

  const handleJoinFleet = () => {
    if (isAuthenticated && user?.role === 'Driver') {
      navigate('/dashboard/driver');
    } else if (isAuthenticated) {
      navigate('/'); // Or show a message
    } else {
      navigate('/register?role=Driver');
    }
  };

  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', paddingTop: '80px' }}>
        <HeroCarScene />
        <div className="container" style={{ position: 'relative', zIndex: 100, width: '100%' }}>
          <div style={{ maxWidth: '720px', textAlign: 'left' }}>
            <motion.div {...fadeUp(0.1)}>
              <p className="label-caps" style={{ color: 'var(--amber-core)', marginBottom: '24px', fontSize: '11px', letterSpacing: '0.6em', fontWeight: 700 }}>THE ZENITH OF URBAN MOBILITY</p>
              <h1 style={{ fontSize: 'clamp(4.5rem, 11vw, 7.5rem)', lineHeight: '0.8', marginBottom: '48px', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#F0EDE8' }}>
                ARRIVE IN<br />YOUR<br /><span style={{ color: 'var(--amber-core)' }}>ELEMENT</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '480px', lineHeight: '2.1', marginBottom: '64px' }}>Experience the zenith of luxury mobility. Precision engineering meets uncompromising comfort for those who demand more than just a journey.</p>
              <div style={{ display: 'flex', gap: '24px' }}>
                <button className="btn-primary" style={{ padding: '20px 56px', fontSize: '13px' }} onClick={handleBook}>Book Your Experience</button>
                <button className="btn-secondary" style={{ padding: '20px 56px', fontSize: '13px' }} onClick={handleJoinFleet}>Join Fleet</button>
              </div>
            </motion.div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '20px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', color: 'var(--text-muted)', zIndex: 100 }}>
          <div style={{ width: '1px', height: '120px', background: 'linear-gradient(to bottom, var(--amber-core), transparent)' }} />
          <span style={{ writingMode: 'vertical-rl', fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 700 }}>EXPLORE</span>
        </div>
      </section>

      {/* ── THE RIDEFLOW METHOD ─────────────────────────────────── */}
      <section style={{ padding: '200px 0', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '140px' }}>
            <h2 style={{ fontSize: '28px', letterSpacing: '0.4em', marginBottom: '24px' }}>THE RIDEFLOW METHOD</h2>
            <div style={{ width: '100px', height: '2px', background: 'var(--amber-core)', margin: '0 auto' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            {[
              { id: '01', title: 'DISCOVERY', desc: 'Select your preference from our curated fleet of ultra-premium electric and performance vehicles via our encrypted portal.' },
              { id: '02', title: 'PRECISION MATCH', desc: 'Our AI-driven logistics engine assigns a certified pilot and optimizes the route for zero-interruption transit.' },
              { id: '03', title: 'ARRIVAL', desc: 'Step into an environment tailored to your exact specifications—temperature, lighting, and acoustics preset.' }
            ].map((step, i) => (
              <motion.div key={i} {...fadeUp(0.2 + i * 0.1)} style={{ background: '#0A0A0F', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '80px 56px', position: 'relative', transition: 'border-color 0.3s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber-core)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}>
                <div className="font-mono" style={{ color: 'var(--amber-core)', fontSize: '32px', fontWeight: 600, marginBottom: '32px' }}>{step.id}</div>
                <h3 style={{ fontSize: '22px', marginBottom: '24px', color: 'var(--text-primary)' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '2.1' }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURATED FLEET ───────────────────────────────────────── */}
      <section id="fleet" style={{ paddingBottom: '200px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '120px' }}>
            <div>
              <p className="label-caps" style={{ color: 'var(--amber-core)', marginBottom: '20px', fontSize: '11px', letterSpacing: '0.3em' }}>OUR EXCLUSIVE RANGE</p>
              <h2 style={{ fontSize: '40px' }}>CURATED FLEET</h2>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--amber-core)', letterSpacing: '0.3em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>SELECT CATEGORY <ChevronRight size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { title: 'Exotic Bike', tag: 'FULL ELECTRIC', img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80' },
              { title: 'Grand Tourer', tag: 'ULTRA LUXURY', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80' },
              { title: 'Urban Stealth', tag: 'ARMOURED OPTION', img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&q=80' }
            ].map((car, i) => (
              <motion.div key={i} {...fadeUp(i * 0.1)} style={{ position: 'relative', height: '750px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={car.img} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050508 0%, rgba(5,5,8,0.2) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: '64px', left: '64px' }}>
                  <h4 style={{ fontSize: '28px', marginBottom: '16px' }}>{car.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--amber-core)', fontWeight: 800, letterSpacing: '0.2em' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber-core)' }} />{car.tag}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY & EXCLUSIVITY ────────────────────────────────── */}
      <section style={{ padding: '200px 0', background: 'rgba(255,255,255,0.005)', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '160px', alignItems: 'center', marginBottom: '240px' }}>
            <motion.div {...fadeUp(0.1)}>
              <div style={{ width: '50px', height: '2px', background: 'var(--amber-core)', marginBottom: '48px' }} />
              <h2 style={{ fontSize: '56px', marginBottom: '48px', lineHeight: '1' }}>FORTRESS ON<br />WHEELS</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '17px', lineHeight: '2.1', marginBottom: '56px' }}>Every vehicle undergoes rigorous 110-point safety inspections. Our pilots are trained in advanced defensive driving.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '16px', color: 'var(--text-secondary)' }}><Shield size={22} color="var(--amber-core)" /> Biometric monitoring</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '16px', color: 'var(--text-secondary)' }}><Zap size={22} color="var(--amber-core)" /> End-to-end encryption</div>
              </div>
            </motion.div>
            <motion.div {...fadeUp(0.3)} style={{ height: '600px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80" alt="Safety" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            </motion.div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '160px', alignItems: 'center' }}>
            <motion.div {...fadeUp(0.1)} style={{ height: '600px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80" alt="Exclusivity" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
            </motion.div>
            <motion.div {...fadeUp(0.3)}>
              <div style={{ width: '50px', height: '2px', background: 'var(--amber-core)', marginBottom: '48px' }} />
              <h2 style={{ fontSize: '56px', marginBottom: '48px', lineHeight: '1' }}>CABIN OF THE<br />FUTURE</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '17px', lineHeight: '2.1', marginBottom: '56px' }}>Personalized climate, curated sound profiles, and spatial audio system. Sanctuary in motion.</p>
              <div style={{ display: 'flex', gap: '32px' }}>
                <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.05)', padding: '40px 64px', flex: 1, textAlign: 'center' }}>
                  <Zap size={28} color="var(--amber-core)" style={{ marginBottom: '20px' }} />
                  <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.25em' }}>ULTRA-HD</div>
                </div>
                <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.05)', padding: '40px 64px', flex: 1, textAlign: 'center' }}>
                  <Star size={28} color="var(--amber-core)" style={{ marginBottom: '20px' }} />
                  <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.25em' }}>HI-RES</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ padding: '160px 0 80px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: '140px', marginBottom: '140px' }}>
            <div>
              <h2 style={{ fontSize: '40px', color: '#F0EDE8', fontWeight: 800, marginBottom: '40px', letterSpacing: '0.1em' }}>RIDEFLOW</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '2.1', maxWidth: '400px' }}>Setting the gold standard for premium executive transport. Precision. Privacy. Performance.</p>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '40px', letterSpacing: '0.2em' }}>EXPERIENCE</h4>
              {['Our Fleet', 'Destinations', 'Requests'].map(l => (<a key={l} href="#" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', textDecoration: 'none' }}>{l}</a>))}
            </div>
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '40px', letterSpacing: '0.2em' }}>MEMBERSHIP</h4>
              {['Benefits', 'Corporate', 'Pricing'].map(l => (<a key={l} href="#" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', textDecoration: 'none' }}>{l}</a>))}
            </div>
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '40px', letterSpacing: '0.2em' }}>SUPPORT</h4>
              {['Help Center', 'Privacy', 'Contact'].map(l => (<a key={l} href="#" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', textDecoration: 'none' }}>{l}</a>))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '60px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>© 2026 RIDEFLOW GLOBAL. ALL RIGHTS RESERVED.</p>
            <div style={{ display: 'flex', gap: '48px' }}>{['INSTAGRAM', 'TWITTER', 'LINKEDIN'].map(s => (<a key={s} href="#" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', letterSpacing: '0.25em', fontWeight: 800 }}>{s}</a>))}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
