import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, User, Phone, 
  CheckCircle, DollarSign, Timer, Search, X, AlertTriangle
} from 'lucide-react';
import * as rideService from '../../services/rideService';
import * as ratingService from '../../services/ratingService';
import useRideStore from '../../store/rideStore';
import toast from 'react-hot-toast';
import RideMap from '../maps/RideMap';
import { GlassCard, Badge, Button, Spinner, RatingStars } from '../ui';

export default function ActiveRidePanel({ activeRide }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rating, setRating] = useState({ score: 5, comment: '', submitted: false, loading: false });
  const { clearRide } = useRideStore();

  // Trip Timer Logic
  useEffect(() => {
    if (activeRide.status === 'In Progress' && activeRide.start_time) {
      const start = new Date(activeRide.start_time).getTime();
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - start;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimer(`${h}:${m}:${s}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeRide.status, activeRide.start_time]);

  const handleSubmitRating = async () => {
    setRating(p => ({ ...p, loading: true }));
    try {
      await ratingService.submitRating({
        ride_id: activeRide.ride_id,
        score: rating.score,
        comment: rating.comment
      });
      setRating(p => ({ ...p, submitted: true }));
      toast.success("Feedback saved!");
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already rated')) {
        setRating(p => ({ ...p, submitted: true }));
      } else {
        toast.error("Failed to submit rating");
      }
    } finally {
      setRating(p => ({ ...p, loading: false }));
    }
  };

  const handleAction = async (action) => {
    setLoading(true);
        try {
      if (action === 'arrive') {
        await rideService.confirmArrival(activeRide.ride_id);
        toast.success("Arrival confirmed! Waiting for rider.");
      } else if (action === 'start') {
        await rideService.startRide(activeRide.ride_id);
        toast.success("Trip started. Drive safe!");
      } else if (action === 'destination') {
        await rideService.confirmDestination(activeRide.ride_id);
        setShowConfirmModal(false);
        toast.success("Destination reached! Calculating final fare.");
      } else if (action === 'cancel') {
        await rideService.cancelRide(activeRide.ride_id);
        toast.success("Ride cancelled.");
        clearRide();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              zIndex: 999, 
              background: 'rgba(5, 5, 8, 0.85)', 
              backdropFilter: 'blur(12px)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '24px' 
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: '440px' }}
            >
              <GlassCard 
                level={3} 
                style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 20px rgba(245, 166, 35, 0.1)'
                }}
              >
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '20px', 
                  background: 'var(--amber-ghost)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 24px',
                  color: 'var(--amber-core)'
                }}>
                  <Navigation size={32} />
                </div>
                
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>REACHED DESTINATION?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
                  Please confirm you have arrived at <br/>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeRide.dropoff_location}</span>.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowConfirmModal(false)}
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleAction('destination')} 
                    disabled={loading}
                  >
                    {loading ? <Spinner size={18} /> : "Confirm"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard 
        level={2} 
        style={{ padding: '32px', border: activeRide.status === 'Arrived at Pickup' ? '2px solid var(--amber-core)' : 'none' }}
        className={activeRide.status === 'Arrived at Pickup' ? 'animate-pulse-subtle' : ''}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-core)' }}>
              <User size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{activeRide.rider?.name}</h3>
              <Badge status={activeRide.status === 'Completed' ? 'Warning' : 'Active'}>
                {activeRide.status === 'Completed' ? 'WAITING FOR PAYMENT' : activeRide.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <a href={`tel:${activeRide.rider?.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber-core)', fontWeight: 600 }}>
              <Phone size={18} /> {activeRide.rider?.phone}
            </a>
          </div>
        </div>

        {/* Status Specific Info */}
        <AnimatePresence mode="wait">
          {activeRide.status === 'Completed' ? (
            <motion.div key="completed-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ background: 'var(--amber-ghost)', padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '32px' }}>
                <Clock size={32} color="var(--amber-core)" className="animate-spin-slow" style={{ margin: '0 auto 16px' }} />
                <h4 style={{ marginBottom: '8px' }}>Waiting for Rider Payment</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Estimated Earnings: <strong>PKR {((activeRide.final_fare || 0) * 0.8).toFixed(2)}</strong></p>
                {activeRide.payment_status === 'Paid' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ marginTop: '24px', color: '#22C55E', fontWeight: 700 }}>
                    <CheckCircle size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    PAYMENT RECEIVED!
                  </motion.div>
                )}
              </div>

              {activeRide.payment_status === 'Paid' && !rating.submitted && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-1" style={{ padding: '24px', marginBottom: '32px', textAlign: 'center' }}>
                  <p style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>How was {activeRide.rider?.name} as a passenger?</p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <RatingStars mode="input" size="lg" value={rating.score} onChange={val => setRating(p => ({ ...p, score: val }))} />
                  </div>
                  <textarea 
                    placeholder="Optional: Note about this rider..."
                    value={rating.comment}
                    onChange={e => setRating(p => ({ ...p, comment: e.target.value }))}
                    maxLength={200}
                    style={{ 
                      width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px', padding: '12px', color: 'white', fontSize: '14px', resize: 'none', height: '60px', marginBottom: '16px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="secondary" onClick={() => setRating(p => ({ ...p, submitted: true }))} style={{ flex: 1 }}>Skip</Button>
                    <Button onClick={handleSubmitRating} disabled={rating.loading} style={{ flex: 1 }}>
                      {rating.loading ? <Spinner size={18} /> : 'Submit'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeRide.payment_status === 'Paid' && rating.submitted && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '20px', background: 'var(--amber-ghost)', borderRadius: '16px', marginBottom: '32px', color: 'var(--amber-core)', fontWeight: 600 }}>
                  Feedback shared! ⭐
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="active-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div className="glass-1" style={{ padding: '20px' }}>
                  <p className="label-caps" style={{ fontSize: '10px', marginBottom: '8px' }}>{activeRide.status === 'In Progress' ? 'Time Elapsed' : 'Pickup Address'}</p>
                  {activeRide.status === 'In Progress' ? (
                    <h2 className="font-mono" style={{ fontSize: '1.5rem', color: 'var(--amber-core)' }}>{timer}</h2>
                  ) : (
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{activeRide.pickup_location}</p>
                  )}
                </div>
                <div className="glass-1" style={{ padding: '20px' }}>
                  <p className="label-caps" style={{ fontSize: '10px', marginBottom: '8px' }}>Target Destination</p>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{activeRide.dropoff_location}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(activeRide.status === 'Accepted' || activeRide.status === 'Driver En Route') && (
            <Button block size="lg" onClick={() => handleAction('arrive')} disabled={loading}>
              {loading ? <Spinner size={20} /> : "I'VE ARRIVED AT PICKUP"}
            </Button>
          )}

          {activeRide.status === 'Arrived at Pickup' && (
            <Button block size="lg" onClick={() => handleAction('start')} disabled={loading}>
              {loading ? <Spinner size={20} /> : "PASSENGER IS IN — START RIDE"}
            </Button>
          )}

          {activeRide.status === 'In Progress' && (
            <Button block size="lg" onClick={() => setShowConfirmModal(true)}>
              I'VE REACHED DESTINATION
            </Button>
          )}

          {activeRide.payment_status === 'Paid' && (
            <Button block variant="primary" onClick={() => { clearRide(); window.location.reload(); }}>
              BACK TO DASHBOARD
            </Button>
          )}

          {(!['In Progress', 'Completed'].includes(activeRide.status)) && (
            <Button variant="ghost" size="sm" onClick={() => handleAction('cancel')} disabled={loading} style={{ color: '#EF4444', marginTop: '8px' }}>
              Cancel Ride
            </Button>
          )}
        </div>
      </GlassCard>

      <div style={{ height: '350px', marginTop: '32px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <RideMap 
          pickup={{ lat: Number(activeRide.pickup_lat), lng: Number(activeRide.pickup_lng) }}
          dropoff={{ lat: Number(activeRide.dropoff_lat), lng: Number(activeRide.dropoff_lng) }}
        />
      </div>
    </div>
  );
}
