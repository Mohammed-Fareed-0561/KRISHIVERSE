export const vibrate = (ms = 50) => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};
