import React from 'react';
import Card from './Card';

export default function ChartContainer({ title, subtitle, badgeText, badgeColor, badgeBg, children }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{title}</h3>
          {subtitle && (
            <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {subtitle}
            </span>
          )}
        </div>
        {badgeText && (
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: badgeBg || 'var(--md-sys-color-primary-container)',
            color: badgeColor || 'var(--md-sys-color-primary)',
            fontFamily: 'monospace'
          }}>
            {badgeText}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: '200px', position: 'relative' }}>
        {children}
      </div>
    </Card>
  );
}
