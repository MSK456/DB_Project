// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Car, Shield, DollarSign, TrendingUp, AlertCircle, CheckCircle, 
  Settings, LogOut, Zap, Bell, Search, Filter, Activity, X, UserMinus, 
  UserCheck, MoreVertical, Edit3, Save, Info, Ban, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import * as authService from '../../services/authService';
import * as adminService from '../../services/adminService';
import * as vehicleService from '../../services/vehicleService';
import { GlassCard, Badge, Spinner, Input, Button, RatingStars } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({});
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [fareConfigs, setFareConfigs] = useState([]);
  const { user, clearAuth } = useAuthStore();
  const { loading, execute } = useApi();

  const fetchOverview = useCallback(async () => {
    const res = await adminService.getOverviewStats().catch(() => null);
    if (res) setStats(res.data);
  }, []);

  const fetchPendingVehicles = useCallback(async () => {
    const res = await vehicleService.getPendingVehicles().catch(() => null);
    if (res) setPendingVehicles(res.data);
  }, []);

  const fetchUsers = useCallback(async (filters = {}) => {
    const res = await adminService.getUsers(filters).catch(() => null);
    if (res) setUsersList(res.data);
  }, []);

  const fetchFares = useCallback(async () => {
    const res = await adminService.getFareConfigs().catch(() => null);
    if (res) setFareConfigs(res.data);
  }, []);

  useEffect(() => {
    fetchOverview();
    if (activeTab === 'verification') fetchPendingVehicles();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'fares') fetchFares();
    
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchOverview, fetchPendingVehicles, fetchUsers, fetchFares]);

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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>RF COMMAND</span>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'verification', label: 'Verifications', icon: Shield },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'fares', label: 'Fare Settings', icon: DollarSign },
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
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Live system oversight • {new Date().toLocaleTimeString()}</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {stats.pending_vehicles > 0 && <Badge status="Warning" pulse>{stats.pending_vehicles} Pending Verifications</Badge>}
            {stats.pending_payouts > 0 && <Badge status="Error">{stats.pending_payouts} Payout Requests</Badge>}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" stats={stats} />}
          {activeTab === 'verification' && <VerificationTab key="verification" queue={pendingVehicles} onAction={fetchPendingVehicles} />}
          {activeTab === 'users' && <UsersTab key="users" users={usersList} onAction={fetchUsers} />}
          {activeTab === 'fares' && <FareTab key="fares" configs={fareConfigs} onAction={fetchFares} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AnalyticsTab({ stats }) {
  const kpis = [
    { label: 'Revenue (Today)', value: `PKR ${parseFloat(stats.revenue_today || 0).toLocaleString()}`, icon: DollarSign, color: 'var(--amber-core)' },
    { label: 'Rides (Today)', value: stats.rides_today || 0, icon: Car, color: 'var(--text-primary)' },
    { label: 'Captains Online', value: stats.online_drivers || 0, icon: Zap, color: '#22C55E' },
    { label: 'Low Ratings', value: stats.low_rated_drivers || 0, icon: AlertCircle, color: '#EF4444' }
  ];

  const subKpis = [
    { label: 'Total Riders', value: stats.total_riders || 0, icon: Users },
    { label: 'Total Drivers', value: stats.total_drivers || 0, icon: Shield },
    { label: 'Restricted', value: stats.restricted_users || 0, icon: UserMinus },
    { label: 'Pending Payouts', value: stats.pending_payouts || 0, icon: DollarSign }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {kpis.map((kpi, i) => (
          <GlassCard key={i} level={1} style={{ padding: '24px', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p className="label-caps" style={{ fontSize: '10px' }}>{kpi.label}</p>
              <kpi.icon size={16} color={kpi.color} />
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700 }}>{kpi.value}</div>
          </GlassCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <GlassCard level={2} style={{ padding: '40px', minHeight: '400px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '32px' }}>Network Activity</h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>[Heatmap Visualization Pending Data stream...]</p>
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard level={2} style={{ padding: '32px' }}>
            <h4 className="label-caps" style={{ marginBottom: '24px' }}>System Health</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {subKpis.map((kpi, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <kpi.icon size={14} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{kpi.label}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{kpi.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

function UsersTab({ users, onAction }) {
  const [filters, setFilters] = useState({ role: 'All', status: 'All', search: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'status' | 'ban'
  const [reason, setReason] = useState('');
  const { loading, execute } = useApi();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    onAction({ ...filters, search: debouncedSearch });
  }, [debouncedSearch, filters.role, filters.status, onAction]);

  const handleUpdateStatus = async (newStatus) => {
    if (!reason && newStatus !== 'Active') {
      toast.error("Reason is required");
      return;
    }
    await execute(() => adminService.updateUserStatus(selectedUser.user_id, newStatus, reason), {
      successMessage: "User status updated",
      onSuccess: () => {
        setSelectedUser(null);
        setModalMode(null);
        setReason('');
        onAction(filters);
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" placeholder="Search by name or email..." 
            value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 14px 14px 48px', borderRadius: '14px', color: 'white', outline: 'none' }}
          />
        </div>
        <select 
          value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value }))}
          style={{ background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', padding: '0 20px', borderRadius: '14px', color: 'white', outline: 'none' }}
        >
          <option value="All">All Roles</option>
          <option value="Rider">Riders</option>
          <option value="Driver">Drivers</option>
          <option value="Admin">Admins</option>
        </select>
        <select 
          value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          style={{ background: 'var(--bg-glass)', border: '1px solid rgba(255,255,255,0.05)', padding: '0 20px', borderRadius: '14px', color: 'white', outline: 'none' }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Banned">Banned</option>
        </select>
      </div>

      <GlassCard level={2} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '20px 32px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>USER</th>
              <th style={{ padding: '20px 32px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ROLE</th>
              <th style={{ padding: '20px 32px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '20px 32px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>STATS</th>
              <th style={{ padding: '20px 32px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '20px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: u.role === 'Admin' ? '#EF4444' : u.role === 'Driver' ? 'var(--amber-core)' : '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#000' }}>
                      {u.full_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px 32px' }}>
                  <Badge status={u.role === 'Admin' ? 'Error' : u.role === 'Driver' ? 'Active' : 'Info'}>{u.role}</Badge>
                </td>
                <td style={{ padding: '20px 32px' }}>
                  <Badge status={u.account_status === 'Active' ? 'Active' : u.account_status === 'Suspended' ? 'Warning' : 'Error'}>{u.account_status}</Badge>
                </td>
                <td style={{ padding: '20px 32px' }}>
                  {u.role === 'Driver' ? (
                    <div>
                      <RatingStars value={u.driver_rating || 5} size="sm" />
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{u.total_trips || 0} trips</div>
                    </div>
                  ) : '—'}
                </td>
                <td style={{ padding: '20px 32px' }}>
                  {u.role !== 'Admin' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {u.account_status !== 'Active' && (
                        <button onClick={() => { setSelectedUser(u); handleUpdateStatus('Active'); }} style={{ background: 'none', border: 'none', color: '#22C55E', cursor: 'pointer' }} title="Activate"><UserCheck size={18} /></button>
                      )}
                      {u.account_status === 'Active' && (
                        <button onClick={() => { setSelectedUser(u); setModalMode('suspend'); }} style={{ background: 'none', border: 'none', color: 'var(--amber-core)', cursor: 'pointer' }} title="Suspend"><UserMinus size={18} /></button>
                      )}
                      <button onClick={() => { setSelectedUser(u); setModalMode('ban'); }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }} title="Ban Permanent"><Ban size={18} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      <AnimatePresence>
        {(modalMode === 'suspend' || modalMode === 'ban') && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '400px' }}>
              <GlassCard level={3} style={{ padding: '40px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: modalMode === 'ban' ? '#EF4444' : 'white' }}>
                  {modalMode === 'ban' ? 'Ban User Permanently' : 'Suspend Account'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                  Action target: {selectedUser?.full_name}
                </p>
                <textarea 
                  placeholder="State reason for this action..."
                  value={reason} onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '24px', resize: 'none' }}
                />
                <div style={{ display: 'flex', gap: '16px' }}>
                  <Button variant="ghost" block onClick={() => { setModalMode(null); setReason(''); }}>Cancel</Button>
                  <Button variant={modalMode === 'ban' ? 'error' : 'primary'} block onClick={() => handleUpdateStatus(modalMode === 'ban' ? 'Banned' : 'Suspended')}>
                    Confirm {modalMode === 'ban' ? 'Ban' : 'Suspend'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FareTab({ configs, onAction }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const { loading, execute } = useApi();

  const handleEdit = (conf) => {
    setEditing(conf.vehicle_type);
    setForm(conf);
  };

  const handleSave = async () => {
    await execute(() => adminService.updateFareConfig(editing, form), {
      successMessage: "Rates updated",
      onSuccess: () => {
        setEditing(null);
        onAction();
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
        {configs.map(conf => {
          const isEditing = editing === conf.vehicle_type;
          const current = isEditing ? form : conf;
          const sampleDist = 10;
          const sampleTime = 20;
          const samplePrice = parseFloat(current.base_rate) + (sampleDist * parseFloat(current.per_km_rate)) + (sampleTime * parseFloat(current.per_min_rate));

          return (
            <GlassCard key={conf.vehicle_type} level={2} style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{conf.vehicle_type}</h3>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--amber-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {conf.vehicle_type === 'Bike' ? <Zap size={20} color="var(--amber-core)" /> : <Car size={20} color="var(--amber-core)" />}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                <RateField label="Base Fare" value={current.base_rate} editing={isEditing} onChange={v => setForm(p => ({ ...p, base_rate: v }))} />
                <RateField label="Per KM" value={current.per_km_rate} editing={isEditing} onChange={v => setForm(p => ({ ...p, per_km_rate: v }))} />
                <RateField label="Per Min" value={current.per_min_rate} editing={isEditing} onChange={v => setForm(p => ({ ...p, per_min_rate: v }))} />
                <RateField label="Surge Multiplier" value={current.surge_multiplier} editing={isEditing} onChange={v => setForm(p => ({ ...p, surge_multiplier: v }))} />
                <RateField label="Commission (%)" value={current.commission_rate * 100} editing={isEditing} onChange={v => setForm(p => ({ ...p, commission_rate: v / 100 }))} suffix="%" />
              </div>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                <p className="label-caps" style={{ fontSize: '10px', marginBottom: '8px' }}>Price Estimator</p>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>10km / 20min ride:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber-core)', marginTop: '4px' }}>PKR {samplePrice.toFixed(2)}</div>
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button block variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button block onClick={handleSave} disabled={loading}>{loading ? <Spinner /> : 'Save'}</Button>
                </div>
              ) : (
                <Button block variant="secondary" onClick={() => handleEdit(conf)}><Edit3 size={16} /> Edit Rates</Button>
              )}
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}

function RateField({ label, value, editing, onChange, suffix = 'PKR' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
      {editing ? (
        <input 
          type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '14px', textAlign: 'right' }}
        />
      ) : (
        <span style={{ fontWeight: 600 }}>{value} {suffix}</span>
      )}
    </div>
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
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{v.make} {v.model} ({v.license_plate})</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Captain ID: #{v.driver_id} • Type: {v.vehicle_type}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn-secondary" onClick={() => handleVerify(v.vehicle_id, 'Rejected')} disabled={loading} style={{ color: '#EF4444' }}>Reject</button>
                <button className="btn-primary" onClick={() => handleVerify(v.vehicle_id, 'Verified')} disabled={loading}>Approve</button>
              </div>
            </div>
          ))}
          {queue.length === 0 && <p style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No pending verifications.</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
}
