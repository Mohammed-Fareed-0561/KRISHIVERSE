import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, List } from '@phosphor-icons/react';
import { MAIN_NAV, MORE_NAV } from '../../config/navigation';

const BottomNav = () => {
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  const handleMoreClick = (path) => {
    setIsMoreOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--kv-white)] border-t border-[var(--kv-divider)] flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.03)] md:hidden"
        aria-label="Primary navigation"
      >
        {MAIN_NAV.slice(0, 4).map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-[20%] h-full gap-1 active:scale-95 transition-transform ${
                isActive ? 'text-[var(--kv-green)]' : 'text-[var(--kv-grey-mid)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon size={26} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[10px] font-semibold">{tab.name}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setIsMoreOpen(true)}
          type="button"
          className={`flex flex-col items-center justify-center w-[20%] h-full gap-1 active:scale-95 transition-transform ${
            isMoreOpen ? 'text-[var(--kv-green)]' : 'text-[var(--kv-grey-mid)]'
          }`}
          aria-label="Open more services menu"
          aria-expanded={isMoreOpen}
          aria-haspopup="dialog"
          aria-controls="more-services-dialog"
        >
          <List size={26} weight={isMoreOpen ? 'fill' : 'regular'} />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>

      {isMoreOpen && (
        <>
          <button
            type="button"
            className="kv-sheet-overlay block md:hidden"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close more services menu"
          />
          <div
            id="more-services-dialog"
            className="kv-sheet block md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-services-title"
          >
            <div className="kv-sheet-handle" />

            <div className="flex items-center justify-between p-4 pb-2 border-b border-[var(--kv-divider)]">
              <h3
                id="more-services-title"
                className="font-[var(--font-heading)] font-bold text-[18px] text-[var(--kv-near-black)]"
              >
                More Services
              </h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--kv-off-white)] text-[var(--kv-grey-dark)] active:bg-[var(--kv-divider)]"
                aria-label="Close more services menu"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-3 gap-y-6 gap-x-2 pb-8">
              {MORE_NAV.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleMoreClick(item.path)}
                  type="button"
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                  aria-label={`Open ${item.name}`}
                >
                  <div
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    <item.icon size={28} weight="duotone" />
                  </div>
                  <span className="text-[13px] font-medium text-[var(--kv-grey-dark)]">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomNav;
