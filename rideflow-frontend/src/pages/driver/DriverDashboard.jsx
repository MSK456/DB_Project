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
import ActiveRidePanel from '../../components/rides/ActiveRidePanel';

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
  if (!activeRide) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>No active tasks.</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <ActiveRidePanel activeRide={activeRide} />
    </motion.div>
  );
}

function EarningsTab() {
  const [history, setHistory] = useState([]);
  const { loading, execute } = useApi();

  const fetchHistory = useCallback(async () => {
    const res = await execute(() => driverService.getEarningsHistory(), { showSuccessToast: false });
    if (res) setHistory(res.data);
  }, [execute]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalEarnings = history.reduce((acc, curr) => acc + parseFloat(curr.driver_amount || 0), 0);
  const totalCommission = history.reduce((acc, curr) => acc + parseFloat(curr.commission || 0), 0);

  if (loading && history.length === 0) return <div style={{ padding: '60px', textAlign: 'center' }}><Spinner /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', marginBottom: '40px' }}>
        <GlassCard level={2} style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <History size={20} color="var(--amber-core)" /> Ride Analysis
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map(ride => (
              <div key={ride.ride_id} className="glass-1" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Badge status={ride.payment_status === 'Paid' ? 'Active' : 'Warning'}>{ride.payment_status}</Badge>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{ride.ride_id} • {new Date(ride.end_time).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber-core)' }} />
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{ride.pickup_location}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{ride.dropoff_location}</p>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber-core)' }}>+PKR {parseFloat(ride.driver_amount).toFixed(2)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fare: PKR {parseFloat(ride.total_fare).toFixed(2)}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ marginBottom: '16px', opacity: 0.2 }}><DollarSign size={48} /></div>
                <p>No earnings history found yet.</p>
              </div>
            )}
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard level={3} style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(255,191,0,0.1) 0%, rgba(0,0,0,0) 100%)' }}>
            <TrendingUp size={24} color="var(--amber-core)" style={{ marginBottom: '20px' }} />
            <p className="label-caps" style={{ marginBottom: '8px' }}>Lifetime Earnings</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>PKR {totalEarnings.toFixed(2)}</h2>
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Commission Paid</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>PKR {totalCommission.toFixed(2)}</span>
            </div>
          </GlassCard>

          <GlassCard level={2} style={{ padding: '32px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Net to You</span>
                <span style={{ fontWeight: 600 }}>80%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Service Fee</span>
                <span style={{ fontWeight: 600 }}>20%</span>
              </div>
              <div style={{ marginTop: '10px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '80%', height: '100%', background: 'var(--amber-core)' }} />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

  const VehicleTab = ({ vehicles, onAdd }) => {
    const [form, setForm] = useState({ 
      make: '', 
      model: '', 
      year: new Date().getFullYear(), 
      color: '', 
      license_plate: '', 
      vehicle_type: 'Economy' 
    });
    const { loading, execute } = useApi();

    const handleAdd = async (e) => {
      e.preventDefault();
      await execute(() => vehicleService.addVehicle(form), {
        successMessage: 'Vehicle added for verification',
        onSuccess: () => {
          setForm({ make: '', model: '', year: new Date().getFullYear(), color: '', license_plate: '', vehicle_type: 'Economy' });
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
                <div key={v.vehicle_id} className="glass-1" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {v.make} {v.model} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({v.year})</span>
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14} /> {v.license_plate}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                      <span style={{ color: v.color?.toLowerCase() }}>{v.color}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                      <span style={{ color: 'var(--amber-core)' }}>{v.vehicle_type}</span>
                    </div>
                  </div>
                  <Badge status={v.verification_status === 'Verified' ? 'Active' : 'Warning'}>
                    {v.verification_status}
                  </Badge>
                </div>
              ))}
              {vehicles.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No vehicles registered.</p>}
            </div>
          </GlassCard>
          <GlassCard level={2} style={{ padding: '40px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Add New Vehicle</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input label="Make (e.g. Toyota)" value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} required />
                <Input label="Model (e.g. Corolla)" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input label="Year" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} required />
                <Input label="Color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} required />
              </div>
              <Input label="License Plate" value={form.license_plate} onChange={e => setForm(p => ({ ...p, license_plate: e.target.value }))} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Type</label>
                <select 
                  value={form.vehicle_type} 
                  onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))}
                  style={{ background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '12px', borderRadius: '10px', outline: 'none' }}
                >
                  <option value="Economy">Economy</option>
                  <option value="Premium">Premium</option>
                  <option value="Bike">Bike</option>
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '10px' }}>
                {loading ? <Spinner /> : 'Register Vehicle'}
              </button>
            </form>
          </GlassCard>
        </div>
      </motion.div>
    );
  };
