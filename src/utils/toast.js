// Toast notification utility
const toastListeners = [];
let toastId = 0;

export const showToast = (message, type = 'info', duration = 3000) => {
  const id = toastId++;
  const toast = { id, message, type, duration };
  
  // Notify all listeners
  toastListeners.forEach(listener => listener(toast));
  
  return id;
};

export const subscribeToToasts = (callback) => {
  toastListeners.push(callback);
  // Return unsubscribe function
  return () => {
    const index = toastListeners.indexOf(callback);
    if (index > -1) {
      toastListeners.splice(index, 1);
    }
  };
};
