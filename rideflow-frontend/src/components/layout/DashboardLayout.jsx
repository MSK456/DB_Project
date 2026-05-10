// src/components/layout/DashboardLayout.jsx
import AmbientOrbs from './AmbientOrbs';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)', position: 'relative' }}>
      <AmbientOrbs />
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
