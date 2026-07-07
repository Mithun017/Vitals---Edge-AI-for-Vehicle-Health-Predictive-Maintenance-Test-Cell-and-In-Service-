import React from 'react';

export default function Card({ children, className = '', style = {}, onClick, variant = 'outlined' }) {
  const baseClass = 'md-card';
  const variantClass = `md-card-${variant}`;
  
  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={onClick}
      style={{
        ...style
      }}
    >
      {children}
    </div>
  );
}
