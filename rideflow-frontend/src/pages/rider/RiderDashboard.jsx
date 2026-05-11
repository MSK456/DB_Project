// src/pages/rider/RiderDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, CreditCard, History, Settings, LogOut, 
  Search, Shield, Star, Wallet, ArrowRight, Zap, Bell, CheckCircle, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useRideStore from '../../store/rideStore';
import * as authService from '../../services/authService';
import * as rideService from '../../services/rideService';
import * as walletService from '../../services/walletService';
import { GlassCard, Badge, Spinner, Button, Input } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import AddressAutocomplete from '../../components/maps/AddressAutocomplete';
import RideMap from '../../components/maps/RideMap';
import ActiveRideTracker from '../../components/rides/ActiveRideTracker';

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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '60px', paddingLeft: '20px', textDecoration: 'none', color: 'inherit' }}>
          <Zap size={22} color="var(--amber-core)" fill="var(--amber-core)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>RIDEFLOW</span>
        </Link>
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
          {activeTab === 'history' && <RideHistoryTab key="history" history={rideHistory} loading={rideLoading} onRefresh={fetchHistory} />}
          {activeTab === 'wallet' && <WalletTab key="wallet" balance={balance} onRefresh={fetchStats} />}
          {activeTab === 'settings' && <AccountTab key="settings" user={user} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BookRideTab({ activeRide, onBookingSuccess }) {
  const [form, setForm] = useState({ 
    pickup: '', 
    pickupCoords: null,
    destination: '', 
    destinationCoords: null,
    vehicle_type: 'Standard' 
  });
  const [estimation, setEstimation] = useState(null);
  const { loading, execute } = useApi();
  const { setActiveRide, clearRide } = useRideStore();
  const [selectingMapField, setSelectingMapField] = useState(null); // 'pickup' or 'dropoff'

  const handleEstimate = async () => {
    if (!form.pickupCoords || !form.destinationCoords) return;
    
    const typeMapping = { 'Standard': 'Economy', 'Premium': 'Premium', 'Executive': 'Premium' };
    const payload = {
      pickup_location: form.pickup,
      dropoff_location: form.destination,
      vehicle_type: typeMapping[form.vehicle_type] || 'Economy'
    };

    const res = await execute(() => rideService.estimateFare(payload), { showSuccessToast: false });
    if (res) setEstimation(res.data);
  };

  useEffect(() => {
    if (form.pickupCoords && form.destinationCoords) {
      handleEstimate();
    }
  }, [form.pickupCoords, form.destinationCoords, form.vehicle_type]);

  const handleBook = async () => {
    if (!form.pickup || !form.destination) return toast.error('Enter pickup and destination');

    const typeMapping = { 'Standard': 'Economy', 'Premium': 'Premium', 'Executive': 'Premium' };
    const payload = {
      pickup_location: form.pickup,
      dropoff_location: form.destination,
      vehicle_type: typeMapping[form.vehicle_type] || 'Economy'
    };

    const res = await execute(() => rideService.requestRide(payload), { 
      successMessage: 'Searching for nearby drivers...',
      onSuccess: (data) => {
        setActiveRide(data.data);
        setForm({ 
          pickup: '', 
          pickupCoords: null,
          destination: '', 
          destinationCoords: null,
          vehicle_type: 'Standard' 
        });
        setEstimation(null);
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
        <ActiveRideTracker activeRide={activeRide} onPaymentSuccess={onBookingSuccess} />
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="label-caps">Pickup Location</label>
                <button 
                  onClick={() => setSelectingMapField(selectingMapField === 'pickup' ? null : 'pickup')}
                  style={{ fontSize: '11px', color: selectingMapField === 'pickup' ? 'var(--amber-core)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {selectingMapField === 'pickup' ? 'SELECTING ON MAP...' : 'SELECT ON MAP'}
                </button>
              </div>
              <AddressAutocomplete 
                placeholder="Where should we pick you up?"
                value={form.pickup}
                onSelect={(place) => setForm(p => ({ 
                  ...p, 
                  pickup: place.formattedAddress, 
                  pickupCoords: { lat: place.lat, lng: place.lng } 
                }))}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="label-caps">Destination</label>
                <button 
                  onClick={() => setSelectingMapField(selectingMapField === 'dropoff' ? null : 'dropoff')}
                  style={{ fontSize: '11px', color: selectingMapField === 'dropoff' ? 'var(--amber-core)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {selectingMapField === 'dropoff' ? 'SELECTING ON MAP...' : 'SELECT ON MAP'}
                </button>
              </div>
              <AddressAutocomplete 
                placeholder="Where are you headed?"
                value={form.destination}
                onSelect={(place) => setForm(p => ({ 
                  ...p, 
                  destination: place.formattedAddress, 
                  destinationCoords: { lat: place.lat, lng: place.lng } 
                }))}
              />
            </div>
            
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

            {estimation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-1" style={{ padding: '20px', border: '1px solid var(--amber-ghost)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Fare</span>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--amber-core)' }}>
                    ${Number(estimation.estimated_fare).toFixed(2)}
                    {estimation.is_surge && <Zap size={14} style={{ display: 'inline', marginLeft: '4px' }} />}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Distance / Time</span>
                  <span>{estimation.distance_km} km / {estimation.duration_text}</span>
                </div>
              </motion.div>
            )}

            <button className="btn-primary" onClick={handleBook} disabled={loading || !form.pickupCoords} style={{ width: '100%', marginTop: '16px', padding: '18px' }}>
              {loading ? <Spinner size={18} /> : <>Book Now <ArrowRight size={18} /></>}
            </button>
          </div>
        </GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ flex: 1, borderRadius: '24px', overflow: 'hidden', border: selectingMapField ? '2px solid var(--amber-core)' : '1px solid rgba(255,255,255,0.05)', minHeight: '400px' }}>
            <RideMap 
              pickup={form.pickupCoords}
              dropoff={form.destinationCoords}
              onMapClick={(latLng) => {
                if (selectingMapField === 'pickup') {
                  setForm(p => ({ ...p, pickup: `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`, pickupCoords: latLng }));
                  setSelectingMapField(null);
                } else if (selectingMapField === 'dropoff') {
                  setForm(p => ({ ...p, destination: `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`, destinationCoords: latLng }));
                  setSelectingMapField(null);
                }
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import * as ratingService from '../../services/ratingService';
import { RatingStars } from '../../components/ui';

function RideHistoryTab({ history, loading, onRefresh }) {
  const [selectedRide, setSelectedRide] = useState(null);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Recent Journeys</h3>
        {loading ? <Spinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map(ride => (
              <RideHistoryItem key={ride.ride_id} ride={ride} onRate={() => setSelectedRide(ride)} />
            ))}
            {history.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No rides yet.</p>}
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {selectedRide && (
          <RatingModal 
            ride={selectedRide} 
            onClose={() => setSelectedRide(null)} 
            onSuccess={() => {
              setSelectedRide(null);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RideHistoryItem({ ride, onRate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-1" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={20} color={ride.status === 'Completed' ? 'var(--amber-core)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{ride.pickup_location.split(',')[0]} → {ride.dropoff_location?.split(',')[0] || 'Unknown'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(ride.request_time).toLocaleDateString()} • {ride.vehicle_type}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontWeight: 600, marginBottom: '4px' }}>PKR {parseFloat(ride.fare || 0).toFixed(2)}</div>
            <Badge status={ride.status === 'Completed' ? 'Active' : 'Error'}>{ride.status}</Badge>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ArrowRight size={18} style={{ transform: 'rotate(90deg)', opacity: 0.3 }} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}
          >
            <div style={{ padding: '24px 32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div>
                  <p className="label-caps" style={{ fontSize: '10px', marginBottom: '12px' }}>Trip Details</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}><Clock size={14} color="var(--text-muted)" /> <span>Requested: {new Date(ride.request_time).toLocaleTimeString()}</span></div>
                    {ride.start_time && <div style={{ display: 'flex', gap: '8px' }}><Navigation size={14} color="var(--text-muted)" /> <span>Started: {new Date(ride.start_time).toLocaleTimeString()}</span></div>}
                    {ride.end_time && <div style={{ display: 'flex', gap: '8px' }}><CheckCircle size={14} color="var(--text-muted)" /> <span>Ended: {new Date(ride.end_time).toLocaleTimeString()}</span></div>}
                  </div>
                </div>
                <div>
                  <p className="label-caps" style={{ fontSize: '10px', marginBottom: '12px' }}>Rating & Feedback</p>
                  {ride.rider_has_rated ? (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Your Rating</p>
                      <RatingStars value={ride.rider_rating_score || 5} size="sm" />
                      {ride.rider_rating_comment && <p style={{ fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>"{ride.rider_rating_comment}"</p>}
                    </div>
                  ) : (
                    ride.status === 'Completed' && ride.payment_status === 'Paid' ? (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRate(); }} style={{ color: 'var(--amber-core)', background: 'var(--amber-ghost)', width: '100%' }}>
                        Rate Your Experience
                      </Button>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rating unavailable</p>
                    )
                  )}
                  
                  {ride.driver_has_rated && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,191,0,0.05)', borderRadius: '10px', border: '1px solid rgba(255,191,0,0.1)' }}>
                      <p style={{ fontSize: '11px', color: 'var(--amber-core)', marginBottom: '4px' }}>Rating Received</p>
                      <RatingStars value={ride.driver_rating_score || 5} size="sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      toast.success("Rating submitted!");
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
            <Star size={32} />
          </div>
          
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Rate Your Trip</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>How was your ride to {ride.dropoff_location?.split(',')[0]}?</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <RatingStars mode="input" size="lg" value={score} onChange={setScore} />
          </div>
          
          <textarea 
            placeholder="Share your experience..."
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

import * as uploadService from '../../services/uploadService';

function AccountTab({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('personal'); // 'personal' | 'security'
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const { loading, execute } = useApi();
  const { clearAuth } = useAuthStore();

  const isFormChanged = profileForm.full_name !== user?.full_name || profileForm.phone !== user?.phone;

  // Monitor upload progress globally
  useEffect(() => {
    window.onUploadProgress = (p) => setProgress(p);
    return () => { window.onUploadProgress = null; };
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");

    setUploading(true);
    try {
      const res = await uploadService.uploadProfilePhoto(file);
      useAuthStore.getState().setUser({ ...user, profile_photo: res.data.profile_photo });
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleUpdateProfile = async () => {
    await execute(() => authService.updateProfile(profileForm), {
      successMessage: "Profile updated!",
      onSuccess: (data) => {
        useAuthStore.getState().setUser({ ...user, ...data.data.user });
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm_password) return toast.error("Passwords do not match");

    await execute(() => authService.changePassword(passForm), {
      successMessage: "Password updated. Please log in again.",
      onSuccess: () => {
        setTimeout(() => {
          clearAuth();
          window.location.href = '/login';
        }, 2000);
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '40px' }}>
        {/* Sidebar Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveSubTab('personal')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px', border: 'none', background: activeSubTab === 'personal' ? 'var(--amber-ghost)' : 'transparent', color: activeSubTab === 'personal' ? 'var(--amber-core)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <User size={18} /> Personal Info
          </button>
          <button onClick={() => setActiveSubTab('security')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px', border: 'none', background: activeSubTab === 'security' ? 'var(--amber-ghost)' : 'transparent', color: activeSubTab === 'security' ? 'var(--amber-core)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <Shield size={18} /> Security & Passwords
          </button>
        </div>

        {/* Content Area */}
        <GlassCard level={2} style={{ padding: '48px' }}>
          {activeSubTab === 'personal' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '48px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '30px', overflow: 'hidden', background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.profile_photo ? (
                      <img src={user.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--amber-core)' }}>{user?.full_name?.charAt(0)}</div>
                    )}
                  </div>
                  <label style={{ position: 'absolute', inset: 0, borderRadius: '30px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: uploading ? 1 : 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => !uploading && (e.currentTarget.style.opacity = 0)}>
                    <Car size={24} color="white" />
                    <input type="file" hidden onChange={handlePhotoChange} accept="image/*" disabled={uploading} />
                  </label>
                  {uploading && (
                    <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'var(--amber-core)' }} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{user?.full_name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Rider ID: #{user?.userId?.toString().slice(-6)} • Member since {new Date(user?.registration_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                <Input label="Full Name" value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} />
                <Input label="Email Address" value={user?.email} disabled style={{ opacity: 0.6 }} />
                <Input label="Phone Number" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="+92 XXX XXXXXXX" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="label-caps" style={{ fontSize: '10px' }}>Account Status</label>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Badge status={user?.account_status === 'Active' ? 'Active' : 'Error'}>{user?.account_status}</Badge>
                  </div>
                </div>
              </div>

              <Button onClick={handleUpdateProfile} disabled={loading || !isFormChanged} block>
                {loading ? <Spinner /> : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '32px' }}>Update Security Credentials</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                <div style={{ position: 'relative' }}>
                  <Input 
                    type={showPass ? 'text' : 'password'} 
                    label="Current Password" 
                    value={passForm.current_password} 
                    onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))}
                    required 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '16px', top: '40px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPass ? <X size={16} /> : <Zap size={16} />}
                  </button>
                </div>

                <Input 
                  type="password" 
                  label="New Password" 
                  value={passForm.new_password} 
                  onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))}
                  required 
                />
                
                {passForm.new_password && (
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '-12px' }}>
                    <motion.div 
                      animate={{ width: passForm.new_password.length > 8 ? '100%' : '50%', background: passForm.new_password.length > 8 ? '#22C55E' : 'var(--amber-core)' }} 
                      style={{ height: '100%', borderRadius: '2px' }} 
                    />
                  </div>
                )}

                <Input 
                  type="password" 
                  label="Confirm New Password" 
                  value={passForm.confirm_password} 
                  onChange={e => setPassForm(p => ({ ...p, confirm_password: e.target.value }))}
                  required 
                />
              </div>

              <Button type="submit" disabled={loading} block variant="secondary">
                {loading ? <Spinner /> : 'Update Password & Re-login'}
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}

