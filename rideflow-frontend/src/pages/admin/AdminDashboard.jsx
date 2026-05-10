// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Car, Shield, DollarSign, TrendingUp, AlertCircle, CheckCircle, 
  Settings, LogOut, Zap, Bell, Search, Filter, Download, PieChart, Activity, X, UserMinus, UserCheck
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import * as authService from '../../services/authService';
import * as adminService from '../../services/adminService';
import * as vehicleService from '../../services/vehicleService';
import { GlassCard, Badge, Spinner, Input, Button } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({ revenue: 0, active_rides: 0, drivers_online: 0, pending_verifications: 0 });
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const { user, clearAuth } = useAuthStore();
  const { loading, execute } = useApi();

  const fetchOverview = useCallback(async () => {
    const res = await execute(() => adminService.getOverviewStats(), { showSuccessToast: false });
    if (res) setStats(res.data);
  }, [execute]);

  const fetchPendingVehicles = useCallback(async () => {
    const res = await execute(() => vehicleService.getPendingVehicles(), { showSuccessToast: false });
    if (res) setPendingVehicles(res.data);
  }, [execute]);

  const fetchUsers = useCallback(async () => {
    const res = await execute(() => adminService.getUsers(), { showSuccessToast: false });
    if (res) setUsersList(res.data);
  }, [execute]);

  useEffect(() => {
    fetchOverview();
    if (activeTab === 'verification') fetchPendingVehicles();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchOverview, fetchPendingVehicles, fetchUsers]);

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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>RF COMMAND</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'verification', label: 'Verifications', icon: Shield },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'financials', label: 'Financials', icon: DollarSign },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', background: activeTab === item.id ? 'var(--amber-ghost)' : 'transparent', color: activeTab === item.id ? 'var(--amber-core)' : 'var(--text-muted)', transition: 'all 0.2s', fontWeight: activeTab === item.id ? 600 : 500 }}>
              <item.icon size={20} />
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}><LogOut size={18} /> Exit Console</button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '280px', padding: '40px 60px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>System Admin</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Global oversight active. Total registered users: {usersList.length || 'Loading...'}</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" stats={stats} />}
          {activeTab === 'verification' && <VerificationTab key="verification" queue={pendingVehicles} onAction={fetchPendingVehicles} />}
          {activeTab === 'users' && <UsersTab key="users" users={usersList} onAction={fetchUsers} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AnalyticsTab({ stats }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Total Revenue', value: `$${parseFloat(stats.revenue || 0).toLocaleString()}`, icon: DollarSign },
          { label: 'Active Rides', value: stats.active_rides || 0, icon: Car },
          { label: 'Drivers Online', value: stats.drivers_online || 0, icon: Zap },
          { label: 'Pending Auth', value: stats.pending_verifications || 0, icon: Shield }
        ].map((kpi, i) => (
          <GlassCard key={i} level={1} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p className="label-caps">{kpi.label}</p>
              <kpi.icon size={16} color="var(--amber-core)" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700 }}>{kpi.value}</div>
          </GlassCard>
        ))}
      </div>
      <GlassCard level={2} style={{ padding: '40px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Real-time Traffic Monitor [Visualizing...]</p>
      </GlassCard>
    </motion.div>
  );
}

function VerificationTab({ queue, onAction }) {
  const { loading, execute } = useApi();

  const handleVerify = async (id, status) => {
    await execute(() => vehicleService.adminVerifyVehicle(id, { status }), {
      successMessage: `Vehicle ${status}`,
      onSuccess: onAction
    });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Vehicle Verification Queue</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {queue.map(v => (
            <div key={v.vehicle_id} className="glass-1" style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Car size={24} color="var(--amber-core)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{v.make} {v.model} ({v.plate_number})</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Owner ID: {v.driver_id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn-secondary" onClick={() => handleVerify(v.vehicle_id, 'Rejected')} disabled={loading} style={{ color: '#EF4444' }}>Reject</button>
                <button className="btn-primary" onClick={() => handleVerify(v.vehicle_id, 'Verified')} disabled={loading}>Approve</button>
              </div>
            </div>
          ))}
          {queue.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Queue is empty.</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function UsersTab({ users, onAction }) {
  const { loading, execute } = useApi();

  const handleStatus = async (id, status) => {
    await execute(() => adminService.updateUserStatus(id, status), {
      successMessage: `User status updated to ${status}`,
      onSuccess: onAction
    });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <GlassCard level={2} style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>User Management</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {users.map(u => (
            <div key={u.user_id} className="glass-1" style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Users size={20} color="var(--text-muted)" />
                <div>
                  <div style={{ fontWeight: 600 }}>{u.full_name} <Badge status={u.account_status === 'Active' ? 'Active' : 'Error'}>{u.account_status}</Badge></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email} • {u.role}</div>
                </div>
              </div>
              {u.role !== 'Admin' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  {u.account_status === 'Active' ? (
                    <button className="btn-ghost" onClick={() => handleStatus(u.user_id, 'Suspended')} disabled={loading} style={{ color: '#EF4444' }}><UserMinus size={16} /> Suspend</button>
                  ) : (
                    <button className="btn-ghost" onClick={() => handleStatus(u.user_id, 'Active')} disabled={loading} style={{ color: '#22C55E' }}><UserCheck size={16} /> Activate</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}
