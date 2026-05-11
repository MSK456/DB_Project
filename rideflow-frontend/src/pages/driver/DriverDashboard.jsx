// src/pages/driver/DriverDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, CreditCard, History, Settings, LogOut, 
  Search, Shield, Star, Wallet, ArrowRight, Zap, Bell, CheckCircle,
  Power, TrendingUp, User, DollarSign, Calendar, X, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '60px', paddingLeft: '20px', textDecoration: 'none', color: 'inherit' }}>
          <Zap size={22} color="var(--amber-core)" fill="var(--amber-core)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>RIDEFLOW</span>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'rides', label: 'Current Task', icon: Navigation },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
            { id: 'profile', label: 'Profile', icon: User },
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
          {activeTab === 'profile' && <ProfileTab key="profile" user={user} vehicles={vehicles} onAddVehicle={fetchVehicles} />}
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

import * as ratingService from '../../services/ratingService';
import { RatingStars } from '../../components/ui';

function EarningsTab() {
  const [history, setHistory] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
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
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{ride.pickup_location.split(',')[0]} → {ride.dropoff_location.split(',')[0]}</p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                      <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Rider Rated You</span>
                        <RatingStars value={ride.rider_rating_score || 0} size="sm" />
                      </div>
                      <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>You Rated Rider</span>
                        {ride.driver_has_rated ? (
                          <RatingStars value={ride.driver_rating_score || 0} size="sm" />
                        ) : (
                          <button onClick={() => setSelectedRide(ride)} style={{ background: 'none', border: 'none', color: 'var(--amber-core)', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Rate Rider</button>
                        )}
                      </div>
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

      <AnimatePresence>
        {selectedRide && (
          <RatingModal 
            ride={selectedRide} 
            onClose={() => setSelectedRide(null)} 
            onSuccess={() => {
              setSelectedRide(null);
              fetchHistory();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import * as uploadService from '../../services/uploadService';

function ProfileTab({ user, vehicles, onAddVehicle }) {
  const [subTab, setSubTab] = useState('reputation'); // 'reputation' | 'vehicles' | 'settings'
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [driverForm, setDriverForm] = useState({ current_city: user?.current_city || '' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const { loading, execute } = useApi();
  const { clearAuth } = useAuthStore();

  const [ratingsData, setRatingsData] = useState({ ratings: [], summary: null });

  useEffect(() => {
    if (subTab === 'reputation') {
      ratingService.getMyRatings().then(res => setRatingsData(res.data)).catch(console.error);
    }
  }, [subTab]);

  const handleUpdateProfile = async () => {
    await execute(() => authService.updateProfile(profileForm), {
      successMessage: "Personal info updated",
      onSuccess: (data) => useAuthStore.getState().setUser({ ...user, ...data.data.user })
    });
  };

  const handleUpdateDriver = async () => {
    await execute(() => driverService.updateDriverProfile(driverForm), {
      successMessage: "Operational settings updated",
      onSuccess: (data) => useAuthStore.getState().setUser({ ...user, ...data.data.driver })
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm_password) return toast.error("Passwords do not match");
    await execute(() => authService.changePassword(passForm), {
      successMessage: "Security updated. Re-login required.",
      onSuccess: () => setTimeout(() => { clearAuth(); window.location.href = '/login'; }, 2000)
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return toast.error("Invalid file or size > 5MB");
    setUploading(true);
    try {
      const res = await uploadService.uploadProfilePhoto(file);
      useAuthStore.getState().setUser({ ...user, profile_photo: res.data.profile_photo });
      toast.success("Profile photo updated");
    } finally {
      setUploading(false);
    }
  };

  const summary = ratingsData.summary || { avg_rating: 0, total_ratings: 0 };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        {[
          { id: 'reputation', label: 'Reputation', icon: Star },
          { id: 'vehicles', label: 'My Vehicles', icon: Car },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: subTab === t.id ? 'var(--amber-ghost)' : 'transparent', color: subTab === t.id ? 'var(--amber-core)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'reputation' && (
          <motion.div key="rep" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <GlassCard level={2} style={{ padding: '40px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Star size={20} color="var(--amber-core)" /> Reputational Analytics
                </h3>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--amber-core)', marginBottom: '8px' }}>{parseFloat(summary.avg_rating || 0).toFixed(1)}</h2>
                  <RatingStars value={summary.avg_rating || 0} size="md" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>{summary.total_ratings} verified reviews</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['five_star', 'four_star', 'three_star', 'two_star', 'one_star'].map((key, i) => {
                    const percent = summary.total_ratings > 0 ? ((summary[key] || 0) / summary.total_ratings) * 100 : 0;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '40px' }}>{5 - i} star</span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} style={{ height: '100%', background: 'var(--amber-core)' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '30px', textAlign: 'right' }}>{Math.round(percent)}%</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
              <GlassCard level={2} style={{ padding: '40px' }}>
                <h4 className="label-caps" style={{ marginBottom: '24px' }}>Latest Feedback</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {ratingsData.ratings.slice(0, 4).map(r => (
                    <div key={r.rating_id} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <RatingStars value={r.score} size="sm" />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{r.comment || 'No comment provided'}"</p>
                    </div>
                  ))}
                  {ratingsData.ratings.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No reviews yet.</p>}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {subTab === 'vehicles' && (
          <motion.div key="veh" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <VehicleTab vehicles={vehicles} onAdd={onAddVehicle} />
          </motion.div>
        )}

        {subTab === 'settings' && (
          <motion.div key="set" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
              <GlassCard level={2} style={{ padding: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '48px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '24px', overflow: 'hidden', background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user?.profile_photo ? <img src={user.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="var(--amber-core)" />}
                    </div>
                    <label style={{ position: 'absolute', inset: 0, borderRadius: '24px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Clock size={20} color="white" />
                      <input type="file" hidden onChange={handlePhotoChange} accept="image/*" />
                    </label>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem' }}>Personal Profile</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Update your visible identity and contact details.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                  <Input label="Full Name" value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} />
                  <Input label="Phone Number" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                  <div style={{ gridColumn: 'span 2' }}>
                    <Input label="Email (Login ID)" value={user?.email} disabled />
                  </div>
                </div>
                <Button block onClick={handleUpdateProfile} disabled={loading}>Save Profile Changes</Button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '40px 0' }} />

                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Operational Settings</h3>
                <div style={{ marginBottom: '32px' }}>
                  <Input label="Current Operating City" value={driverForm.current_city} onChange={e => setDriverForm(p => ({ ...p, current_city: e.target.value }))} />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>* This helps the system match you with riders in your immediate vicinity.</p>
                </div>
                <Button variant="secondary" block onClick={handleUpdateDriver} disabled={loading}>Update City</Button>
              </GlassCard>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <GlassCard level={3} style={{ padding: '32px' }}>
                  <h4 className="label-caps" style={{ marginBottom: '24px' }}>Security Credentials</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>License Number</span>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 600 }}>••••••{user?.license_number?.slice(-4)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>CNIC (Masked)</span>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 600 }}>•••••-•••••••-•</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verification</span>
                      <Badge status={user?.verification_status === 'Verified' ? 'Active' : 'Warning'}>{user?.verification_status}</Badge>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard level={2} style={{ padding: '32px' }}>
                  <h4 className="label-caps" style={{ marginBottom: '24px' }}>Change Password</h4>
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input type="password" placeholder="Current Password" value={passForm.current_password} onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))} required />
                    <Input type="password" placeholder="New Password" value={passForm.new_password} onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))} required />
                    <Input type="password" placeholder="Confirm New" value={passForm.confirm_password} onChange={e => setPassForm(p => ({ ...p, confirm_password: e.target.value }))} required />
                    <Button block variant="ghost" disabled={loading} type="submit">Update Password</Button>
                  </form>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function RatingModal({ ride, onClose, onSuccess }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await ratingService.submitRating({
        ride_id: ride.ride_id,
        score,
        comment
      });
      toast.success("Feedback submitted!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ width: '100%', maxWidth: '440px' }}>
        <GlassCard level={3} style={{ padding: '40px', textAlign: 'center' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--amber-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-core)', margin: '0 auto 24px' }}>
            <User size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Rate Passenger</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>How was your experience with the rider?</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <RatingStars mode="input" size="lg" value={score} onChange={setScore} />
          </div>
          <textarea 
            placeholder="Optional: Note about this rider..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: 'white', height: '100px', resize: 'none', marginBottom: '32px' }}
          />
          <Button block size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner size={20} /> : 'Submit Review'}
          </Button>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function VehicleTab({ vehicles, onAdd }) {
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
