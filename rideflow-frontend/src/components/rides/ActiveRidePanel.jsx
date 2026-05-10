import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, User, Phone, 
  CheckCircle, DollarSign, Timer, Search, X, AlertTriangle
} from 'lucide-react';
import { GlassCard, Badge, Button, Spinner } from '../ui';
import * as rideService from '../../services/rideService';
import useRideStore from '../../store/rideStore';
import toast from 'react-hot-toast';
import RideMap from '../maps/RideMap';

export default function ActiveRidePanel({ activeRide }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <GlassCard level={3} style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
              <AlertTriangle size={48} color="var(--amber-core)" style={{ margin: '0 auto 24px' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Reached Destination?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Confirm you have reached <strong>{activeRide.dropoff_location}</strong>. 
                Final fare will be calculated based on actual distance.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" block onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                <Button block onClick={() => handleAction('destination')} disabled={loading}>
                  {loading ? <Spinner size={18} /> : "Confirm"}
                </Button>
              </div>
            </GlassCard>
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
            <Button variant="ghost" size="sm" style={{ color: '#EF4444', marginTop: '8px' }}>
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
