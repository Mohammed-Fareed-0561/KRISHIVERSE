import React from 'react';
import { DownloadSimple, X } from '@phosphor-icons/react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm kv-animate-slide-up">
      <div className="bg-[var(--kv-green)] text-white shadow-xl rounded-[16px] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
            <DownloadSimple size={22} weight="bold" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[14px]">Install KrishiVerse</h3>
            <p className="text-[12px] opacity-90 truncate">Works offline from your home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            type="button"
            className="px-4 py-2 bg-white text-[var(--kv-green)] rounded-xl text-[13px] font-bold active:scale-95"
          >
            Install
          </button>
          <button
            onClick={() => setIsVisible(false)}
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 active:scale-95"
            aria-label="Dismiss install prompt"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
