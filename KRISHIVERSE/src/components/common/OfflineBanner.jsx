import React, { useState, useEffect } from 'react';
import { WifiSlash, X } from '@phosphor-icons/react';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setTimeout(() => setVisible(false), 2000); // Hide after a bit when online
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
        setIsOffline(true);
        setVisible(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed top-14 left-0 right-0 z-30 transition-all duration-300 md:ml-[240px] ${isOffline ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className="bg-[var(--kv-brown)] text-white px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <WifiSlash size={18} weight="bold" />
          <span className="text-[13px] font-medium">
            You are offline. Showing saved data.
          </span>
        </div>
        <button 
          onClick={() => setVisible(false)}
          type="button"
          className="p-1 rounded-full hover:bg-[var(--kv-brown-light)] hover:bg-opacity-20 active:scale-95 transition-transform"
          aria-label="Dismiss offline message"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;
