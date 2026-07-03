import React from 'react'

export default function DigitalTwinView() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      overflow: 'hidden', 
      background: '#01030a' 
    }}>
      <iframe 
        src="/leaksense_fixed_v5.html" 
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none', 
          background: '#01030a' 
        }}
        title="LeakSense Twin 3D Digital Twin"
      />
    </div>
  );
}
