// src/components/ui/index.jsx

export function Button({ children, variant = 'primary', loading, icon: Icon, className = '', ...props }) {
  const cls = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
  }[variant] || 'btn-primary';
  
  return (
    <button className={`${cls} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner size={16} /> : (
        <>
          {Icon && <Icon size={16} />}
          {children}
        </>
      )}
    </button>
  );
}

export function GlassCard({ level = 2, children, className = '', ...props }) {
  const cls = level === 'amber' ? 'glass-amber' : `glass-${level}`;
  return <div className={`${cls} ${className}`} {...props}>{children}</div>;
}

const BADGE_MAP = {
  Active:     'badge-success', Completed: 'badge-success', Paid: 'badge-success',
  Online:     'badge-success', Verified:  'badge-success', SUCCESS: 'badge-success',
  Pending:    'badge-warning', 'In Progress': 'badge-warning', 'On Trip': 'badge-warning', SEARCHING: 'badge-warning', ACCEPTED: 'badge-warning',
  Cancelled:  'badge-error',  Rejected:  'badge-error',  Failed: 'badge-error', ERROR: 'badge-error',
  Banned:     'badge-error',  Suspended: 'badge-error',
  Offline:    'badge-muted',  Rider: 'badge-info', Driver: 'badge-info', Admin: 'badge-muted',
  Cash: 'badge-muted', Wallet: 'badge-info', Card: 'badge-info',
};

export function Badge({ children, status }) {
  const cls = status ? (BADGE_MAP[status] || BADGE_MAP[status.toUpperCase()] || 'badge-muted') : 'badge-muted';
  return <span className={`badge ${cls}`}>{children || status}</span>;
}

export function Input({ label, error, icon: Icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label className="label-caps">{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />}
        <input 
          className="rf-input" 
          style={{ paddingLeft: Icon ? '48px' : '20px' }}
          {...props} 
        />
      </div>
      {error && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '2px' }}>{error}</span>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = '20px', className = '' }) {
  return <div className={`skeleton ${className}`} style={{ width, height }} />;
}

export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: '2px solid rgba(255,255,255,0.1)',
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      borderColor: 'transparent',
      borderLeftColor: color,
      borderRightColor: color,
      borderBottomColor: 'transparent',
      opacity: 0.8
    }} />
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
      {Icon && <Icon size={48} color="var(--amber-core)" style={{ marginBottom: '16px' }} />}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto 20px' }}>{subtitle}</p>}
      {action}
    </div>
  );
}

export { default as RatingStars } from './RatingStars';
