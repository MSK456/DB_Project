// src/pages/rider/RiderDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, CreditCard, History, Settings, LogOut, 
  Search, Shield, Star, Wallet, ArrowRight, Zap, Bell, CheckCircle, X
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useRideStore from '../../store/rideStore';
import * as authService from '../../services/authService';
import * as rideService from '../../services/rideService';
import * as walletService from '../../services/walletService';
import { GlassCard, Badge, Spinner, Button, Input } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function RiderDashboard() {
  const [activeTab, setActiveTab] = useState('book');
  const [balance, setBalance] = useState(0);
  const [rideHistory, setRideHistory] = useState([]);
  const { user, clearAuth } = useAuthStore();
  const { activeRide, setActiveRide, clearRide } = useRideStore();
  const { loading: statsLoading, execute: execStats } = useApi();
  const { loading: rideLoading, execute: execRide } = useApi();

  const fetchStats = useCallback(async () => {
    const res = await execStats(() => walletService.getBalance(), { showSuccessToast: false, showErrorToast: false });
    if (res) setBalance(res.data.balance);
  }, [execStats]);

  const fetchHistory = useCallback(async () => {
    const res = await execRide(() => rideService.getRideHistory(), { showSuccessToast: false });
    if (res) setRideHistory(res.data.rides || []);
  }, [execRide]);

  const checkActiveRide = useCallback(async () => {
    const res = await rideService.getActiveRide().catch(() => null);
    if (res?.data) setActiveRide(res.data);
    else if (activeRide) clearRide();
  }, [setActiveRide, clearRide, activeRide]);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchStats, fetchHistory]);

  // Polling for active ride status
  useEffect(() => {
    const poll = async () => {
      const res = await rideService.getActiveRide().catch(() => null);
      if (res?.data) setActiveRide(res.data);
      else setActiveRide(null); // Clear if no active ride
    };
    
    poll(); // Initial check
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [setActiveRide]);

  const handleLogout = async () => {
    await authService.logout().catch(() => {});
    clearAuth();
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)' }}>
      <aside style={{ width: '280px', background: 'var(--bg-deep)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '40px 20px', position: 'fixed', height: '100vh', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '60px', paddingLeft: '20px' }}>
          <Zap size={22} color="var(--amber-core)" fill="var(--amber-core)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>RIDEFLOW</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'book', label: 'Book Ride', icon: Navigation },
            { id: 'history', label: 'Ride History', icon: History },
            { id: 'wallet', label: 'My Wallet', icon: Wallet },
            { id: 'settings', label: 'Account', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', background: activeTab === item.id ? 'var(--amber-ghost)' : 'transparent', color: activeTab === item.id ? 'var(--amber-core)' : 'var(--text-muted)', transition: 'all 0.2s', fontWeight: activeTab === item.id ? 600 : 500 }}>
              <item.icon size={20} />
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}><LogOut size={18} /> Sign Out</button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '280px', padding: '40px 60px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Hello, {user?.full_name?.split(' ')[0]}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{activeRide ? 'Your journey is in progress' : 'Ready for your next premium journey?'}</p>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div className="glass-1" style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wallet size={16} color="var(--amber-core)" />
              <span className="font-mono" style={{ fontWeight: 600 }}>${Number(balance || 0).toFixed(2)}</span>
            </div>
            <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={20} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'book' && <BookRideTab key="book" activeRide={activeRide} onBookingSuccess={fetchStats} />}
          {activeTab === 'history' && <RideHistoryTab key="history" history={rideHistory} loading={rideLoading} />}
          {activeTab === 'wallet' && <WalletTab key="wallet" balance={balance} onRefresh={fetchStats} />}
          {activeTab === 'settings' && <AccountTab key="settings" user={user} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BookRideTab({ activeRide, onBookingSuccess }) {
  const [form, setForm] = useState({ pickup: '', destination: '', vehicle_type: 'Standard' });
  const [estimation, setEstimation] = useState(null);
  const { loading, execute } = useApi();
  const { setActiveRide, clearRide } = useRideStore();

  const handleEstimate = async () => {
    if (!form.pickup || !form.destination) return toast.error('Enter pickup and destination');
    
    const typeMapping = {
      'Standard': 'Economy',
      'Premium': 'Premium',
      'Executive': 'Premium'
    };

    const payload = {
      pickup_location: form.pickup,
      pickup_city: 'Islamabad',
      dropoff_location: form.destination,
      dropoff_city: 'Islamabad',
      vehicle_type: typeMapping[form.vehicle_type] || 'Economy'
    };

    const res = await execute(() => rideService.estimateFare(payload), { showSuccessToast: false });
    if (res) setEstimation(res.data);
  };

  const handleBook = async () => {
    // Map UI types to DB enum values
    const typeMapping = {
      'Standard': 'Economy',
      'Premium': 'Premium',
      'Executive': 'Premium' // Or whatever matches your DB enum
    };

    const payload = {
      pickup_location: form.pickup,
      pickup_city: 'Islamabad',
      dropoff_location: form.destination,
      dropoff_city: 'Islamabad',
      vehicle_type: typeMapping[form.vehicle_type] || 'Economy'
    };

    const res = await execute(() => rideService.requestRide(payload), { 
      successMessage: 'Searching for nearby drivers...',
      onSuccess: (data) => {
        setActiveRide(data.data);
        onBookingSuccess();
      }
    });
  };

  const handleCancel = async () => {
    if (!activeRide) return;
    const res = await execute(() => rideService.cancelRide(activeRide.ride_id), {
      successMessage: 'Ride cancelled',
      onSuccess: () => clearRide()
    });
  };

  if (activeRide) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard level={2} style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--amber-ghost)', color: 'var(--amber-core)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Car size={32} className="animate-pulse" />
          </div>
          <Badge status={activeRide.status === 'searching' ? 'Warning' : 'Active'}>
            {activeRide.status.toUpperCase()}
          </Badge>
          <h3 style={{ fontSize: '1.5rem', margin: '16px 0 8px' }}>
            {activeRide.status === 'searching' ? 'Finding Your Driver' : `Driver ${activeRide.driver_name || 'En Route'}`}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            {activeRide.pickup_location} → {activeRide.destination_location}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '32px', background: 'var(--bg-glass)', padding: '20px', borderRadius: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>FARE</p>
              <p className="font-mono" style={{ fontWeight: 700, color: 'var(--amber-core)' }}>${activeRide.fare ? parseFloat(activeRide.fare).toFixed(2) : '25.00'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>DISTANCE</p>
              <p style={{ fontWeight: 600 }}>{activeRide.distance_km || '8.5'} km</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TIME</p>
              <p style={{ fontWeight: 600 }}>{activeRide.duration_minutes || '15'} min</p>
            </div>
          </div>
          
          {activeRide.status === 'searching' && (
            <button className="btn-secondary" onClick={handleCancel} disabled={loading} style={{ border: '1px solid #EF4444', color: '#EF4444' }}>
              Cancel Request
            </button>
          )}
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        <GlassCard level={2} style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--amber-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-core)' }}><Navigation size={20} /></div>
            <h3 style={{ fontSize: '1.25rem' }}>Secure Your Ride</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Input label="Pickup Location" icon={MapPin} placeholder="Enter pickup address" value={form.pickup} onChange={e => setForm(p => ({ ...p, pickup: e.target.value }))} />
            <Input label="Destination" icon={Search} placeholder="Where are you going?" value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} />
            
            <div style={{ marginTop: '8px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '16px' }}>Select Experience</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {['Standard', 'Premium', 'Executive'].map(type => (
                  <div key={type} className="glass-1" onClick={() => setForm(p => ({ ...p, vehicle_type: type }))} style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', border: form.vehicle_type === type ? '1px solid var(--amber-core)' : '1px solid rgba(255,255,255,0.05)', background: form.vehicle_type === type ? 'var(--amber-ghost)' : 'transparent' }}>
                    <Car size={24} color={form.vehicle_type === type ? 'var(--amber-core)' : 'var(--text-muted)'} style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.vehicle_type === type ? 'var(--amber-core)' : 'var(--text-primary)' }}>{type}</div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={handleBook} disabled={loading} style={{ width: '100%', marginTop: '16px', padding: '18px' }}>
              {loading ? <Spinner size={18} /> : <>Find Driver <ArrowRight size={18} /></>}
            </button>
          </div>
        </GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <GlassCard level={1} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '300px' }}>
            <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, var(--bg-void) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '24px', textAlign: 'center' }}><Badge status="Active">System Online</Badge></div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

function RideHistoryTab({ history, loading }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Recent Journeys</h3>
        {loading ? <Spinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map(ride => (
              <div key={ride.ride_id} className="glass-1" style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={20} color="var(--text-muted)" /></div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{ride.pickup_location.split(',')[0]} → {ride.destination_location.split(',')[0]}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(ride.request_time).toLocaleDateString()} • {ride.vehicle_type}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontWeight: 600, marginBottom: '4px' }}>${parseFloat(ride.fare).toFixed(2)}</div>
                  <Badge status={ride.status === 'completed' ? 'Active' : 'Error'}>{ride.status}</Badge>
                </div>
              </div>
            ))}
            {history.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No rides yet.</p>}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function WalletTab({ balance, onRefresh }) {
  const [amount, setAmount] = useState('');
  const { loading, execute } = useApi();

  const handleTopUp = async () => {
    if (!amount || isNaN(amount)) return toast.error('Enter valid amount');
    await execute(() => walletService.topUp({ amount: parseFloat(amount) }), {
      successMessage: 'Wallet recharged successfully',
      onSuccess: () => {
        setAmount('');
        onRefresh();
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <GlassCard level={2} style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Balance Details</h3>
          <div style={{ background: 'var(--amber-ghost)', padding: '32px', borderRadius: '20px', textAlign: 'center', marginBottom: '32px' }}>
            <p className="label-caps" style={{ color: 'var(--amber-core)', marginBottom: '8px' }}>Available Credit</p>
            <h2 style={{ fontSize: '3rem', color: 'var(--amber-core)' }}>${Number(balance || 0).toFixed(2)}</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1 }} />
            <button className="btn-primary" onClick={handleTopUp} disabled={loading} style={{ padding: '0 32px' }}>{loading ? <Spinner /> : 'Top Up'}</button>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function AccountTab({ user }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Profile Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Input label="Full Name" value={user?.full_name} disabled />
          <Input label="Email" value={user?.email} disabled />
          <Input label="Phone" value={user?.phone || 'Not set'} disabled />
          <Input label="Member Since" value={new Date(user?.created_at).toLocaleDateString()} disabled />
        </div>
      </GlassCard>
    </motion.div>
  );
}
