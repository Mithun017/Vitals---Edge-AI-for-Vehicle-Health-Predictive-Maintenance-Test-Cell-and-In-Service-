import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Button from './common/Button';

export default function ThemeToggle({ isSidebarCollapsed }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="text"
      onClick={toggleTheme}
      className={`sidebar-nav-item ${isSidebarCollapsed ? 'collapsed' : ''}`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{ padding: isSidebarCollapsed ? 0 : '12px 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
    >
      {theme === 'light' ? <Moon size={20} color="currentColor" /> : <Sun size={20} color="currentColor" />}
      {!isSidebarCollapsed && <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>}
    </Button>
  );
}
