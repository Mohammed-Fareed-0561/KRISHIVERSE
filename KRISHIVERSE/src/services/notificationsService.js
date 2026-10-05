// Mock push notification service primarily utilizing the browser Notification API
// In a production environment, this would integrate with a backend via a Push API subscription

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

export const scheduleMockPushNotification = (title, options = {}, delayMs = 5000) => {
  setTimeout(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      const swRegistration = await navigator.serviceWorker.ready;
      if (swRegistration) {
        swRegistration.showNotification(title, {
          icon: "/icons/icon-192.svg",
          badge: "/icons/icon-192.svg",
          vibrate: [200, 100, 200],
          ...options
        });
      } else {
        new Notification(title, {
          icon: "/icons/icon-192.svg",
          ...options
        });
      }
    }
  }, delayMs);
};

// Start occasional random push alerts for demo purposes (Mandi Prices & Weather Alerts)
let mockPushInterval = null;

export const enableMockPushAlerts = () => {
  if (mockPushInterval) return;
  
  // Every 3 minutes, schedule a mock notification
  mockPushInterval = setInterval(() => {
    const randomType = Math.random() > 0.4 ? "mandi" : "weather";
    
    if (randomType === "weather") {
      scheduleMockPushNotification("Weather Alert 🌧️", {
         body: "Heavy rainfall expected in your district tomorrow. Avoid applying fertilizers today."
      }, 0);
    } else {
      // Intelligently pick from watchlist if available
      const saved = localStorage.getItem("crop_watchlist");
      const watchlist = saved ? JSON.parse(saved) : [];
      const crop = watchlist.length > 0 
        ? watchlist[Math.floor(Math.random() * watchlist.length)]
        : "Paddy (Common)";

      scheduleMockPushNotification(`${crop} Price Jump! 📈`, {
         body: `Market prices for ${crop} increased by ₹85/qtl at your local APMC Mandi. Sell now for better profit!`
      }, 0);
    }
  }, 180000); 
};


export const disableMockPushAlerts = () => {
  if (mockPushInterval) {
    clearInterval(mockPushInterval);
    mockPushInterval = null;
  }
};
