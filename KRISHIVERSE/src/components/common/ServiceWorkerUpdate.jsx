import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconRefresh, IconX } from '@tabler/icons-react';

export default function ServiceWorkerUpdate() {
  const registerSW = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const offlineReady = registerSW?.offlineReady?.[0];
  const setOfflineReady = registerSW?.offlineReady?.[1];
  const needUpdate = registerSW?.needUpdate?.[0];
  const setNeedUpdate = registerSW?.needUpdate?.[1];
  const updateServiceWorker = registerSW?.updateServiceWorker;

  const close = () => {
    setOfflineReady(false);
    setNeedUpdate(false);
  };

  if (!offlineReady && !needUpdate) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-[100]" role="status" aria-live="polite">
      <div className="bg-white/90 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <IconRefresh size={24} className={needUpdate ? 'animate-spin' : ''} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-800">
              {needUpdate ? 'App Update Available!' : 'Ready for Offline!'}
            </h3>
            <p className="text-xs text-gray-600">
              {needUpdate 
                ? 'A new version of KrishiVerse is ready. Update now?' 
                : 'KrishiVerse is now ready to work offline.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {needUpdate && (
            <button 
              onClick={() => updateServiceWorker(true)}
              type="button"
              className="btn btn-sm btn-primary rounded-xl"
              aria-label="Update the application"
            >
              Update
            </button>
          )}
          <button 
            onClick={close}
            type="button"
            className="btn btn-sm btn-circle btn-ghost text-gray-400"
            aria-label="Dismiss service worker message"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
