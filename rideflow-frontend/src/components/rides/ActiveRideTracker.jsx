import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, MapPin, Navigation, Clock, CreditCard, Star, Phone, 
  CheckCircle, ChevronRight, Wallet, Zap, Timer, Receipt, Search
} from 'lucide-react';
import { GlassCard, Badge, Button, Input, Spinner } from '../ui';
import * as rideService from '../../services/rideService';
import useRideStore from '../../store/rideStore';
import toast from 'react-hot-toast';
import RideMap from '../maps/RideMap';

const STEPS = [
  { status: 'Requested', label: 'Finding your driver...', icon: Search },
  { status: 'Accepted', label: 'Driver is on the way', icon: Car },
  { status: 'Arrived at Pickup', label: 'Driver has arrived!', icon: MapPin },
  { status: 'In Progress', label: "You're on your way!", icon: Navigation },
  { status: 'Completed', label: "You've arrived!", icon: CheckCircle }
];

export default function ActiveRideTracker({ activeRide, onPaymentSuccess }) {
  const [promoCode, setPromoCode] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [timer, setTimer] = useState('00:00:00');
  const { clearRide } = useRideStore();

  const currentStepIndex = STEPS.findIndex(s => s.status === activeRide.status || (activeRide.status === 'Driver En Route' && s.status === 'Accepted'));

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

  const handleProcessPayment = async () => {
    setIsPaying(true);
    try {
      const res = await rideService.processRidePayment(activeRide.ride_id, { promo_code: promoCode });
      setReceipt(res.data.data);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (receipt) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <GlassCard level={3} style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', damping: 12 }}
            style={{ width: '80px', height: '80px', background: '#22C55E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}
          >
            <CheckCircle size={40} />
          </motion.div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Payment Successful</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Thank you for riding with RideFlow!</p>
          
          <div className="glass-1" style={{ padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
              <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--amber-core)' }}>PKR {parseFloat(receipt.final_amount_paid).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Transaction ID</span>
              <span style={{ color: 'var(--text-secondary)' }}>#TXN-{receipt.payment_id}</span>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <p style={{ marginBottom: '16px', fontSize: '14px' }}>Rate your experience</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={28} className="cursor-pointer hover:scale-110 transition-transform" color="var(--amber-core)" />)}
            </div>
          </div>

          <Button block onClick={() => { clearRide(); window.location.reload(); }}>Back to Home</Button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px', position: 'relative', padding: '0 20px' }}>
        <div style={{ position: 'absolute', top: '15px', left: '40px', right: '40px', height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
        
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div key={step.status} style={{ zIndex: 1, textAlign: 'center', width: '80px' }}>
              <motion.div 
                animate={isCurrent ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px var(--amber-ghost)', '0 0 20px var(--amber-ghost)', '0 0 0px var(--amber-ghost)'] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto 12px',
                  background: isCompleted || isCurrent ? 'var(--amber-core)' : 'var(--bg-deep)',
                  border: isCompleted || isCurrent ? 'none' : '2px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCompleted || isCurrent ? '#050508' : 'var(--text-muted)'
                }}
              >
                {isCompleted ? <CheckCircle size={16} /> : <step.icon size={16} />}
              </motion.div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: isCurrent ? 'var(--amber-core)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.status}</p>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step-Specific Content */}
        {(activeRide.status === 'Accepted' || activeRide.status === 'Driver En Route') && (
          <motion.div key="driver-en-route" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard level={2} className="border-amber-ghost" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '4px' }}>{activeRide.driver?.name || 'Driver Found'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', color: 'var(--amber-core)' }}>
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < Math.floor(activeRide.driver?.rating || 5) ? "currentColor" : "none"} />)}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activeRide.driver?.total_trips || '0'} trips completed</span>
                  </div>
                </div>
                <a href={`tel:${activeRide.driver?.phone}`} style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--amber-ghost)', color: 'var(--amber-core)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={20} />
                </a>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 0 24px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeRide.vehicle?.color || 'white', border: '1px solid rgba(255,255,255,0.2)' }} />
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Badge status="Warning" style={{ fontSize: '10px' }}>{activeRide.vehicle?.type}</Badge>
                      <span style={{ fontWeight: 600 }}>{activeRide.vehicle?.make} {activeRide.vehicle?.model}</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-void)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--amber-ghost)', fontFamily: 'JetBrains Mono', color: 'var(--amber-core)', fontWeight: 700 }}>
                  {activeRide.vehicle?.plate}
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--amber-ghost)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--amber-core)', fontSize: '14px', fontWeight: 600 }}>
                  Estimated Fare: <span className="font-mono">PKR {parseFloat(activeRide.fare_estimated).toFixed(2)}</span>
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeRide.status === 'Arrived at Pickup' && (
          <motion.div key="arrived" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard level={2} style={{ padding: '32px', textAlign: 'center', border: '2px solid var(--amber-core)' }} className="animate-pulse-subtle">
              <div style={{ width: '64px', height: '64px', background: 'var(--amber-core)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050508', margin: '0 auto 20px' }}>
                <Car size={32} />
              </div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Your driver has arrived!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please proceed to the pickup point at:</p>
              <p style={{ color: 'var(--amber-core)', fontWeight: 600, fontSize: '1.1rem' }}>{activeRide.pickup_location}</p>
            </GlassCard>
          </motion.div>
        )}

        {activeRide.status === 'In Progress' && (
          <motion.div key="in-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard level={2} style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p className="label-caps" style={{ marginBottom: '8px' }}>Trip Time</p>
                  <h2 className="font-mono" style={{ fontSize: '2.5rem', color: 'var(--amber-core)' }}>{timer}</h2>
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Navigation size={18} color="var(--amber-core)" />
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DESTINATION</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{activeRide.dropoff_location}</p>
                  </div>
                </div>
              </div>
              <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>Enjoy your ride 🎵</p>
            </GlassCard>
          </motion.div>
        )}

        {activeRide.status === 'Completed' && (
          <motion.div key="completed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard level={2} style={{ padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <CheckCircle size={48} color="var(--amber-core)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.5rem' }}>You've Arrived!</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div className="glass-1" style={{ padding: '16px' }}>
                  <p className="label-caps" style={{ fontSize: '10px' }}>Distance</p>
                  <p style={{ fontWeight: 600 }}>{activeRide.actual_distance_km} km</p>
                </div>
                <div className="glass-1" style={{ padding: '16px' }}>
                  <p className="label-caps" style={{ fontSize: '10px' }}>Duration</p>
                  <p style={{ fontWeight: 600 }}>{activeRide.actual_duration_minutes} min</p>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Fare</span>
                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>PKR {parseFloat(activeRide.fare_estimated).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Final Fare</span>
                  <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--amber-core)', fontWeight: 700 }}>PKR {parseFloat(activeRide.final_fare).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <Input 
                    placeholder="Promo Code" 
                    value={promoCode} 
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    style={{ flex: 1 }}
                  />
                </div>
                <Button block size="lg" onClick={handleProcessPayment} disabled={isPaying}>
                  {isPaying ? <Spinner size={20} /> : 'PAY NOW WITH WALLET'}
                </Button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <Wallet size={14} />
                <span>Payment Method: <strong>Wallet</strong></span>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Map for all steps */}
      <div style={{ height: '350px', marginTop: '32px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <RideMap 
          pickup={{ lat: Number(activeRide.pickup_lat), lng: Number(activeRide.pickup_lng) }}
          dropoff={{ lat: Number(activeRide.dropoff_lat), lng: Number(activeRide.dropoff_lng) }}
        />
      </div>
    </div>
  );
}
