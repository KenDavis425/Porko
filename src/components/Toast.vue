<template>
  <TransitionGroup name="toast" tag="div" class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.type}`]"
      @click="removeToast(toast.id)"
    >
      <span class="toast-message">{{ toast.message }}</span>
      <button class="toast-close" @click.stop="removeToast(toast.id)">&times;</button>
    </div>
  </TransitionGroup>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { subscribeToToasts } from '../utils/toast.js';

export default {
  name: 'Toast',
  setup() {
    const toasts = ref([]);
    let unsubscribe = null;
    
    const removeToast = (id) => {
      const index = toasts.value.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.value.splice(index, 1);
      }
    };
    
    onMounted(() => {
      unsubscribe = subscribeToToasts((toast) => {
        toasts.value.push(toast);
        
        if (toast.duration > 0) {
          setTimeout(() => {
            removeToast(toast.id);
          }, toast.duration);
        }
      });
    });
    
    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
    
    return {
      toasts,
      removeToast
    };
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  background: var(--card-background);
  color: var(--text-color);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 250px;
  max-width: 400px;
  pointer-events: auto;
  cursor: pointer;
  border-left: 4px solid var(--primary-color);
}

.toast-success {
  border-left-color: #27ae60;
}

.toast-error {
  border-left-color: #e74c3c;
}

.toast-warning {
  border-left-color: #f39c12;
}

.toast-info {
  border-left-color: var(--primary-color);
}

.toast-message {
  flex: 1;
  font-size: 0.95em;
}

.toast-close {
  background: none;
  border: none;
  color: #777;
  font-size: 1.5em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  color: #333;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .toast {
    min-width: auto;
    max-width: 100%;
  }
}
</style>
