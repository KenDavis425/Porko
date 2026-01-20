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
  padding: 1em 0.5em;
  max-width: 100%;
  margin: 0 auto;
}

.profile-container {
  background: var(--card-background);
  border-radius: 8px;
  padding: 1.5em;
  box-shadow: 0 2px 8px var(--shadow-color);
  margin: 0 0.5em;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1em;
  margin-bottom: 1.5em;
  padding-bottom: 1.5em;
  border-bottom: 2px solid #e0e0e0;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--primary-color);
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  width: 100%;
}

.profile-info h1 {
  margin: 0 0 0.5em 0;
  color: var(--text-color);
  font-size: 1.5em;
  word-break: break-word;
}

.profile-email {
  color: #7f8c8d;
  margin: 0;
  font-size: 0.9em;
  word-break: break-all;
}

.empty-state {
  text-align: center;
  padding: 3em 1em;
  color: #7f8c8d;
}

@media (min-width: 769px) {
  .profile-page {
    padding: 2em;
  }

  .profile-container {
    padding: 2em;
    margin: 0 auto;
  }

  .profile-header {
    flex-direction: row;
    text-align: left;
    gap: 2em;
    margin-bottom: 2em;
    padding-bottom: 2em;
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
  }

  .profile-info h1 {
    font-size: 2em;
  }

  .profile-email {
    font-size: 1em;
  }
}
</style>
