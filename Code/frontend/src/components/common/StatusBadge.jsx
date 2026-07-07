import React from 'react';

export default function StatusBadge({ state }) {
  const getStatusConfig = (state) => {
    switch (state) {
      case 'HEALTHY':
        return { label: 'HEALTHY', bg: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' };
      case 'WATCH':
      case 'WARNING':
        return { label: 'WARNING', bg: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' };
      case 'CRITICAL':
        return { label: 'CRITICAL', bg: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)' };
      default:
        return { label: 'HEALTHY', bg: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' };
    }
  };

  const badge = getStatusConfig(state);

  return (
    <span 
      className="md-typescale-label-medium"
      style={{
      padding: '4px 8px',
      borderRadius: '8px',
      backgroundColor: badge.bg,
      color: badge.color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${badge.color}`
    }}>
      {badge.label}
    </span>
  );
}
