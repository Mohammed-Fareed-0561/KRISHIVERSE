import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PullToRefresh({ onRefresh, children }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef(null);
  const { t } = useTranslation();

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling) return;
    const y = e.touches[0].clientY;
    if (y > startY) {
      const diff = Math.min((y - startY) * 0.4, 80);
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (currentY > 60) {
      setIsRefreshing(true);
      try {
        if (onRefresh) await onRefresh();
      } finally {
        setIsRefreshing(false);
        setCurrentY(0);
      }
    } else {
      setCurrentY(0);
    }
  };

  return (
    <div 
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute top-0 left-0 w-full flex items-center justify-center overflow-hidden transition-all duration-300 z-50"
        style={{ 
          height: isRefreshing ? '60px' : `${currentY}px`, 
          opacity: currentY > 10 || isRefreshing ? 1 : 0 
        }}
      >
        <div className="flex items-center gap-2 text-primary font-medium bg-base-100 shadow-md px-4 py-2 rounded-full mt-4">
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${currentY * 3}deg)` }} />
          <span className="text-sm">{isRefreshing ? t('common.refreshing', 'Refreshing...') : t('common.pullToRefresh', 'Pull to refresh')}</span>
        </div>
      </div>
      <div 
        ref={contentRef}
        className="transition-transform duration-300 w-full"
        style={{ transform: `translateY(${isRefreshing ? 60 : currentY}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
