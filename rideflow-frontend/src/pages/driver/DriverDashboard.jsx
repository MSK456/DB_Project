// src/pages/driver/DriverDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, CreditCard, History, Settings, LogOut, 
  Search, Shield, Star, Wallet, ArrowRight, Zap, Bell, CheckCircle,
  Power, TrendingUp, User, DollarSign, Calendar, X, ExternalLink
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useRideStore from '../../store/rideStore';
import * as authService from '../../services/authService';
import * as driverService from '../../services/driverService';
import * as rideService from '../../services/rideService';
import * as vehicleService from '../../services/vehicleService';
import { GlassCard, Badge, Spinner, Button, Input } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import RideMap from '../../components/maps/RideMap';

export default function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({ today_earnings: 0, total_rides: 0, rating: 0 });
  const [vehicles, setVehicles] = useState([]);
  const { user, clearAuth } = useAuthStore();
  const { activeRide, setActiveRide, clearRide } = useRideStore();
  const { loading: statsLoading, execute: execStats } = useApi();
  const { loading: toggleLoading, execute: execToggle } = useApi();

  const fetchStats = useCallback(async () => {
    const res = await execStats(() => driverService.getStats(), { showSuccessToast: false });
    if (res) setStats(res.data);
  }, [execStats]);

  const fetchVehicles = useCallback(async () => {
    const res = await vehicleService.getMyVehicles().catch(() => null);
    if (res) setVehicles(res.data);
  }, []);

  const checkActiveRide = useCallback(async () => {
    const res = await rideService.getActiveRide().catch(() => null);
    if (res?.data) setActiveRide(res.data);
    else if (activeRide) clearRide();
  }, [setActiveRide, clearRide, activeRide]);

  useEffect(() => {
    fetchStats();
    fetchVehicles();
    setIsActive(user?.account_status === 'Active'); // Simplified for now
  }, [fetchStats, fetchVehicles, user]);

  // Driver Location Tracking
  useEffect(() => {
    if (!isActive) return;

    const updateDriverPos = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          driverService.updateLocation(coords).catch(console.error);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    };

    updateDriverPos(); // Initial
    const interval = setInterval(updateDriverPos, 15000); // Every 15s
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const poll = async () => {
      const res = await rideService.getActiveRide().catch(() => null);
      if (res?.data) setActiveRide(res.data);
      else setActiveRide(null); 
    };
    
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [setActiveRide]);

  const handleToggleActive = async () => {
    const newStatus = !isActive;
    const payload = {
      status: newStatus ? 'Online' : 'Offline',
      city: 'Islamabad' // Default for now, ideally fetched from geolocation or profile
    };
    
    const res = await execToggle(() => driverService.toggleAvailability(payload), {
      successMessage: `You are now ${newStatus ? 'Online' : 'Offline'}`,
      onSuccess: () => setIsActive(newStatus)
    });
  };

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
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'rides', label: 'Current Task', icon: Navigation },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
            { id: 'profile', label: 'Vehicle', icon: Car },
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
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Driver Hub</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome back, Capt. {user?.full_name?.split(' ')[1] || user?.full_name?.split(' ')[0]}</p>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button onClick={handleToggleActive} disabled={toggleLoading} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 700, background: isActive ? '#22C55E' : 'rgba(255, 255, 255, 0.05)', color: isActive ? '#050508' : 'var(--text-muted)', transition: 'all 0.4s', boxShadow: isActive ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none' }}>
              <Power size={18} /> {isActive ? 'GO OFFLINE' : 'GO ONLINE'}
            </button>
            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.05)' }} />
            <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={20} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewTab key="overview" stats={stats} isActive={isActive} activeRide={activeRide} />}
          {activeTab === 'rides' && <ActiveRideTab key="rides" activeRide={activeRide} />}
          {activeTab === 'earnings' && <EarningsTab key="earnings" />}
          {activeTab === 'profile' && <VehicleTab key="profile" vehicles={vehicles} onAdd={fetchVehicles} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function OverviewTab({ stats, isActive, activeRide }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '48px' }}>
        <GlassCard level={1} style={{ padding: '32px' }}>
          <p className="label-caps" style={{ marginBottom: '16px' }}>Today's Earnings</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700 }}>${parseFloat(stats.today_earnings || 0).toFixed(2)}</span>
          </div>
        </GlassCard>
        <GlassCard level={1} style={{ padding: '32px' }}>
          <p className="label-caps" style={{ marginBottom: '16px' }}>Total Rides</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.total_rides || 0}</span>
          </div>
        </GlassCard>
        <GlassCard level={1} style={{ padding: '32px' }}>
          <p className="label-caps" style={{ marginBottom: '16px' }}>Rating</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700 }}>{parseFloat(stats.rating || 5.0).toFixed(1)}</span>
            <Star size={20} fill="var(--amber-core)" color="var(--amber-core)" />
          </div>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <GlassCard level={2} style={{ padding: '40px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          {!isActive ? (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}><Power size={32} /></div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Go Online to Earn</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>Switch to online mode to start receiving trip requests.</p>
            </>
          ) : activeRide ? (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--amber-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-core)', marginBottom: '32px' }}><Navigation size={32} /></div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Active Trip In Progress</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Rider: {activeRide.rider_name}</p>
              <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => setActiveTab('rides')}>View Task Details</button>
            </>
          ) : (
            <>
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)' }} />
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E', marginBottom: '32px', border: '1px solid rgba(34, 197, 94, 0.2)' }}><Search size={32} className="animate-pulse" /></div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Searching for Requests</h3>
              <p style={{ color: 'var(--text-secondary)' }}>System is looking for matches nearby...</p>
            </>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}

function ActiveRideTab({ activeRide }) {
  const { loading, execute } = useApi();
  const { clearRide } = useRideStore();

  const handleAction = async (action) => {
    if (action === 'start') {
      await execute(() => rideService.startTrip(activeRide.ride_id), { successMessage: 'Trip started' });
    } else if (action === 'complete') {
      await execute(() => rideService.completeTrip(activeRide.ride_id, { rating: 5 }), { 
        successMessage: 'Trip completed!',
        onSuccess: () => clearRide()
      });
    }
  };

  if (!activeRide) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>No active tasks.</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <Badge status="Active">{activeRide.status.toUpperCase()}</Badge>
            <h3 style={{ fontSize: '1.5rem', marginTop: '16px' }}>Journey to {activeRide.destination_location}</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="label-caps" style={{ color: 'var(--amber-core)' }}>Est. Fare</p>
            <h3 className="font-mono">${activeRide.fare ? parseFloat(activeRide.fare).toFixed(2) : '25.00'}</h3>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ color: 'var(--amber-core)' }}><Navigation size={20} /></div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DISTANCE</p>
              <p style={{ fontWeight: 600 }}>{activeRide.distance_km || '8.5'} km</p>
            </div>
          </div>
          <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ color: 'var(--amber-core)' }}><Clock size={20} /></div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DURATION</p>
              <p style={{ fontWeight: 600 }}>{activeRide.duration_minutes || '15'} min</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '16px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            <div style={{ color: 'var(--amber-core)' }}><MapPin size={20} /></div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>PICKUP</p>
              <p>{activeRide.pickup_location}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ color: '#22C55E' }}><Navigation size={20} /></div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>DESTINATION</p>
              <p>{activeRide.dropoff_location}</p>
            </div>
          </div>
        </div>

        <div style={{ height: '350px', marginBottom: '40px', borderRadius: '20px', overflow: 'hidden' }}>
          <RideMap 
            pickup={{ lat: Number(activeRide.pickup_lat), lng: Number(activeRide.pickup_lng) }}
            dropoff={{ lat: Number(activeRide.dropoff_lat), lng: Number(activeRide.dropoff_lng) }}
          />
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {activeRide.status === 'accepted' && <button className="btn-primary" onClick={() => handleAction('start')} disabled={loading} style={{ flex: 1 }}>START TRIP</button>}
          {activeRide.status === 'in_progress' && <button className="btn-primary" onClick={() => handleAction('complete')} disabled={loading} style={{ flex: 1 }}>COMPLETE TRIP</button>}
          <button className="btn-secondary" style={{ flex: 1 }}>CONTACT RIDER</button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function EarningsTab() {
  return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Earnings history module loading...</div>;
}

function VehicleTab({ vehicles, onAdd }) {
  const [form, setForm] = useState({ brand: '', model: '', plate: '', type: 'Standard' });
  const { loading, execute } = useApi();

  const handleAdd = async (e) => {
    e.preventDefault();
    await execute(() => vehicleService.addVehicle(form), {
      successMessage: 'Vehicle added for verification',
      onSuccess: () => {
        setForm({ brand: '', model: '', plate: '', type: 'Standard' });
        onAdd();
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <GlassCard level={2} style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>My Vehicles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {vehicles.map(v => (
              <div key={v.vehicle_id} className="glass-1" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '14px' }}>{v.make} {v.model}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.plate_number} • {v.type}</p>
                </div>
                <Badge status={v.verification_status === 'Verified' ? 'Active' : 'Warning'}>{v.verification_status}</Badge>
              </div>
            ))}
            {vehicles.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No vehicles registered.</p>}
          </div>
        </GlassCard>
        <GlassCard level={2} style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Add New Vehicle</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input label="Brand" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} required />
            <Input label="Model" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} required />
            <Input label="Plate Number" value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value }))} required />
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? <Spinner /> : 'Register Vehicle'}</button>
          </form>
        </GlassCard>
      </div>
    </motion.div>
  );
}
