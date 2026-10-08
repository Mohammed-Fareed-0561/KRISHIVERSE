import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Leaf, Bell, Gear, UserCircle } from '@phosphor-icons/react';
import { SIDEBAR_NAV } from '../../config/navigation';
import { useAuthStore } from '../../store/authStore';

const AppHeader = ({ notificationCount = 0 }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  // Signed out farmers still get the whole app — the entry just leads to /welcome.
  const accountPath = isAuthenticated ? '/profile' : '/welcome';
  const accountLabel = isAuthenticated
    ? user?.name || 'Profile'
    : 'Sign in';

  return (
    <>
      {/* Mobile header */}
      <header
        className="fixed top-0 left-0 right-0 h-14 bg-[var(--kv-white)] border-b border-[var(--kv-divider)] flex items-center justify-between px-4 z-40 md:hidden"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--kv-green-light)] flex items-center justify-center text-[var(--kv-green)]">
            <Leaf size={20} weight="fill" />
          </div>
          <span className="font-[var(--font-heading)] font-bold text-[18px] text-[var(--kv-green)]">
            KrishiVerse
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(accountPath)}
            className="h-9 max-w-[132px] px-2.5 rounded-full bg-[var(--kv-off-white)] flex items-center gap-1.5 border border-[var(--kv-divider)] active:bg-[var(--kv-divider)]"
            aria-label={accountLabel}
          >
            <UserCircle size={18} weight="fill" className="text-[var(--kv-green)] shrink-0" />
            <span className="text-[12px] font-bold text-[var(--kv-grey-dark)] truncate">
              {accountLabel}
            </span>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-[var(--kv-grey-dark)] active:bg-[var(--kv-off-white)] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={24} weight="regular" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[var(--kv-red)] rounded-full border border-[var(--kv-white)]" />
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center border border-[var(--kv-divider)] active:bg-[var(--kv-divider)]"
            aria-label="Settings"
          >
            <Gear size={18} weight="bold" className="text-[var(--kv-brown)]" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[240px] bg-[var(--kv-white)] border-r border-[var(--kv-divider)] z-50 flex-col">
        <div className="flex items-center gap-2 p-5 border-b border-[var(--kv-divider)]">
          <div className="w-10 h-10 rounded-full bg-[var(--kv-green-light)] flex items-center justify-center text-[var(--kv-green)]">
            <Leaf size={24} weight="fill" />
          </div>
          <span className="font-[var(--font-heading)] font-bold text-[20px] text-[var(--kv-green)]">
            KrishiVerse
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-hide" aria-label="Desktop navigation">
          {SIDEBAR_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors active:scale-[0.98] ${
                  isActive
                    ? 'bg-[var(--kv-green-light)] text-[var(--kv-green)]'
                    : 'text-[var(--kv-grey-dark)] hover:bg-[var(--kv-off-white)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} weight={isActive ? 'fill' : 'regular'} />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--kv-divider)] space-y-1">
          <NavLink
            to={accountPath}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--kv-green-light)] text-[var(--kv-green)]'
                  : 'text-[var(--kv-grey-dark)] hover:bg-[var(--kv-off-white)]'
              }`
            }
          >
            <UserCircle size={22} weight={isAuthenticated ? 'fill' : 'regular'} />
            <span className="truncate">{accountLabel}</span>
          </NavLink>
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--kv-green-light)] text-[var(--kv-green)]'
                  : 'text-[var(--kv-grey-dark)] hover:bg-[var(--kv-off-white)]'
              }`
            }
          >
            <Bell size={22} weight="regular" />
            Notifications
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--kv-green-light)] text-[var(--kv-green)]'
                  : 'text-[var(--kv-grey-dark)] hover:bg-[var(--kv-off-white)]'
              }`
            }
          >
            <Gear size={22} weight="regular" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default AppHeader;
