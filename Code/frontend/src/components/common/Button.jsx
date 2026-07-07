import React from 'react';

export default function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  style = {},
  type = 'button',
  children,
  title
}) {
  const baseClass = 'md3-btn-base';
  const variantClass = `md3-btn-${variant}`;
  const sizeClass = `md3-btn-${size}`;
  const iconClass = iconOnly ? 'md3-btn-icon-only' : '';
  
  const combinedClasses = [
    baseClass,
    variantClass,
    sizeClass,
    iconClass,
    className
  ].filter(Boolean).join(' ');

  const combinedStyles = {
    ...style,
    ...(fullWidth ? { width: '100%' } : {})
  };

  return (
    <button
      type={type}
      className={combinedClasses}
      style={combinedStyles}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
