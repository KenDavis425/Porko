<template>
  <div class="profile-page">
    <div v-if="user" class="profile-container">
      <div class="profile-header">
        <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="profile-avatar" referrerpolicy="no-referrer" />
        <div class="profile-info">
          <h1>{{ user.displayName }}</h1>
          <p class="profile-email">{{ user.email }}</p>
        </div>
      </div>

      <!-- User Stats Panel -->
      <UserStatsPanel :user="user" />
    </div>
    <div v-else class="empty-state">
      <p>Please log in to view your profile.</p>
    </div>
  </div>
</template>

<script>
import UserStatsPanel from './UserStatsPanel.vue';

export default {
  name: 'Profile',
  components: {
    UserStatsPanel
  },
  props: {
    user: {
      type: Object,
      default: null
    }
  }
};
</script>

<style scoped>
.profile-page {
  padding: 2em;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-container {
  background: var(--card-background);
  border-radius: 8px;
  padding: 2em;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2em;
  margin-bottom: 2em;
  padding-bottom: 2em;
  border-bottom: 2px solid #e0e0e0;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--primary-color);
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  margin: 0 0 0.5em 0;
  color: var(--text-color);
  font-size: 2em;
}

.profile-email {
  color: #7f8c8d;
  margin: 0;
  font-size: 1em;
}

.empty-state {
  text-align: center;
  padding: 3em;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 1em;
  }

  .profile-container {
    padding: 1em;
  }

  .profile-header {
    flex-direction: column;
    text-align: center;
    gap: 1em;
  }

  .profile-avatar {
    width: 100px;
    height: 100px;
  }

  .profile-info h1 {
    font-size: 1.5em;
  }
}
</style>
