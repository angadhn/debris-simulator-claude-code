export function FallbackViewer({ className = '' }: { className?: string }) {
  return (
    <div className={`fallback-viewer ${className}`} style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: '#0a0a1a',
      color: '#fff',
      backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a3a 0%, transparent 50%), radial-gradient(circle at 75% 75%, #3a1a1a 0%, transparent 50%)'
    }}>
      <div style={{ 
        width: '200px', 
        height: '200px', 
        borderRadius: '50%', 
        background: 'linear-gradient(45deg, #4a90e2, #2c5aa0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        boxShadow: '0 0 50px rgba(74, 144, 226, 0.3)'
      }}>
        <div style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #87ceeb, #4682b4, #2e5984)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '30%',
            width: '40%',
            height: '60%',
            background: '#228b22',
            borderRadius: '0 50% 50% 0',
            opacity: 0.8
          }} />
          <div style={{
            position: 'absolute',
            top: '40%',
            right: '20%',
            width: '30%',
            height: '40%',
            background: '#8b4513',
            borderRadius: '50%',
            opacity: 0.9
          }} />
        </div>
      </div>
      <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>
        Earth Orbital View
      </h2>
      <p style={{ margin: '0', opacity: 0.8, textAlign: 'center', maxWidth: '400px' }}>
        Loading 3D Earth visualization with CesiumJS... <br/>
        <small>This fallback shows while Cesium initializes. Check browser console if issues persist.</small>
      </p>
      <div style={{ 
        marginTop: '2rem', 
        display: 'flex', 
        gap: '1rem',
        fontSize: '0.9rem',
        opacity: 0.7 
      }}>
        <span>🌍 Earth</span>
        <span>🛰️ Satellites</span>
        <span>🌌 Space</span>
      </div>
    </div>
  );
}