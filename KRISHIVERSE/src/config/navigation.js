import {
  House,
  Leaf,
  Stethoscope,
  CloudSun,
  CurrencyInr,
  Scroll,
  NewspaperClipping,
  VideoCamera,
  Storefront,
  Bank,
  Headset,
  MapTrifold,
  Calendar,
  Gear,
  Bell,
  Drone,
} from '@phosphor-icons/react';

export const MAIN_NAV = [
  { name: 'Home', path: '/', icon: House },
  { name: 'Ask AI', path: '/ask', icon: Leaf },
  { name: 'Diagnose', path: '/diagnose', icon: Stethoscope },
  { name: 'Weather', path: '/weather', icon: CloudSun },
  { name: 'Prices', path: '/prices', icon: CurrencyInr },
];

export const MORE_NAV = [
  { name: 'Schemes', path: '/schemes', icon: Scroll, color: 'var(--kv-blue)' },
  { name: 'Calendar', path: '/calendar', icon: Calendar, color: 'var(--kv-green)' },
  { name: 'Maps', path: '/maps', icon: MapTrifold, color: 'var(--kv-brown)' },
  { name: 'News', path: '/news', icon: NewspaperClipping, color: 'var(--kv-brown)' },
  { name: 'Videos', path: '/videos', icon: VideoCamera, color: 'var(--kv-red)' },
  { name: 'Market', path: '/marketplace', icon: Storefront, color: 'var(--kv-amber)' },
  { name: 'Finance', path: '/finance', icon: Bank, color: 'var(--kv-green)' },
  { name: 'Helpline', path: '/helpline', icon: Headset, color: 'var(--kv-brown)' },
  { name: 'Drone', path: '/drone', icon: Drone, color: 'var(--kv-blue)' },
  { name: 'Notifications', path: '/notifications', icon: Bell, color: 'var(--kv-amber)' },
  { name: 'Settings', path: '/settings', icon: Gear, color: 'var(--kv-grey-dark)' },
];

export const SIDEBAR_NAV = [...MAIN_NAV, ...MORE_NAV];

// Routes rendered without the app header/bottom nav (full-screen auth flow).
export const AUTH_ROUTES = ['/welcome', '/login', '/register', '/onboarding', '/verify', '/forgot', '/reset'];
