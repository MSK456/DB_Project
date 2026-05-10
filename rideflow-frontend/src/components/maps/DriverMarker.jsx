/**
 * @file src/components/maps/DriverMarker.jsx
 */

export default function DriverMarker() {
  return (
    <div style={{ position: 'relative', width: 24, height: 24 }}>
      {/* Pulse ring */}
      <div style={{
        position: 'absolute', 
        inset: -8,
        borderRadius: '50%',
        background: 'rgba(245,166,35,0.4)',
        animation: 'pulse 2s infinite ease-out',
      }} />
      {/* Core dot */}
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#F5A623',
        border: '3px solid #0A0A0F',
        boxShadow: '0 0 15px rgba(245,166,35,0.9)',
      }} />
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
