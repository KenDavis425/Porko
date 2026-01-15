<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <h2>Leaderboard</h2>
      <p>Top 10 reviewers</p>
    </div>
    <div v-if="loading" class="loading-indicator">Loading leaderboard...</div>
    <div v-else-if="users.length === 0" class="no-users-message">
      <p>No users to display on the leaderboard yet.</p>
    </div>
    <ol v-else class="leaderboard-list">
      <li v-for="(user, index) in users" :key="user.uid" class="leaderboard-item" :class="getRankClass(index)">
        <div class="rank-container">
          <span class="rank">{{ index + 1 }}</span>
          <span v-if="getMedal(index)" class="medal">{{ getMedal(index) }}</span>
        </div>
        <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
        <div class="user-info">
          <span class="user-name">{{ user.displayName }}</span>
          <span class="review-count">{{ user.reviewCount || 0 }} reviews</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default {
  name: 'Leaderboard',
  setup() {
    const loading = ref(true);
    const users = ref([]);
    let unsubscribe = () => {};

    onMounted(() => {
      try {
        // Fetch more users initially (e.g., 30) to account for filtering out users with 0 reviews
        // After filtering and sorting, we'll display the top 10 reviewers
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('reviewCount', 'desc'),
          limit(30)
        );
        
        unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
          // Map documents to user data
          const fetchedUsers = querySnapshot.docs.map(doc => doc.data());
          
          // Filter out users with 0 or undefined reviewCount
          // Only show users who have actually made reviews (leaders should have reviews)
          const usersWithReviews = fetchedUsers.filter(user => {
            const count = Number(user.reviewCount) || 0;
            return count > 0;
          });
          
          // Sort by reviewCount numerically in descending order (highest first)
          // This ensures proper sorting even if Firestore ordering has issues
          // Convert reviewCount to number for reliable numerical comparison
          const sortedUsers = usersWithReviews.sort((a, b) => {
            const countA = Number(a.reviewCount) || 0;
            const countB = Number(b.reviewCount) || 0;
            return countB - countA; // Descending order (highest first)
          });
          
          // Take only the top 10 users after filtering and sorting
          users.value = sortedUsers.slice(0, 10);
          
          loading.value = false;
        }, (error) => {
          console.error("Error fetching leaderboard:", error);
          loading.value = false;
        });

      } catch (error) {
        console.error("Error setting up leaderboard listener:", error);
        loading.value = false;
      }
    });

    onUnmounted(() => {
      unsubscribe();
    });

    const getMedal = (index) => {
      // Medals are assigned based on position (0-indexed)
      // Position 1 (index 0): Gold medal 🥇
      // Position 2 (index 1): Silver medal 🥈
      // Position 3 (index 2): Bronze medal 🥉
      // Positions 4-10 (index 3-9): Participation medal 🏅
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index >= 3 && index < 10) return '🏅';
      return null;
    };

    const getRankClass = (index) => {
      if (index === 0) return 'rank-gold';
      if (index === 1) return 'rank-silver';
      if (index === 2) return 'rank-bronze';
      if (index >= 3 && index < 10) return 'rank-regular';
      return '';
    };

    return {
      loading,
      users,
      getMedal,
      getRankClass
    };
  }
};
</script>

<style scoped>
.leaderboard-page { max-width: 800px; margin: 0 auto; }
.page-header { text-align: center; margin-bottom: 2em; }
.page-header h2 { margin-bottom: 0.2em; }
.page-header p { color: #777; margin-top: 0; }
.loading-indicator, .no-users-message { text-align: center; color: #777; padding: 3em; }
.leaderboard-list { list-style: none; padding: 0; }
.leaderboard-item {
  display: flex;
  align-items: center;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  margin-bottom: 1em;
  padding: 1em 1.5em;
  transition: transform 0.2s, box-shadow 0.2s;
}
.leaderboard-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}
.rank-container {
  display: flex;
  align-items: center;
  font-size: 1.5em;
  font-weight: 700;
  color: var(--secondary-color);
  margin-right: 1.5em;
  width: 60px;
  justify-content: center;
}
.medal { font-size: 1.2em; margin-left: 0.3em; }
.rank-gold { border-left: 5px solid #ffd700; }
.rank-silver { border-left: 5px solid #c0c0c0; }
.rank-bronze { border-left: 5px solid #cd7f32; }
.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 1em;
  object-fit: cover;
}
.user-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.user-name {
  font-weight: 600;
  font-size: 1.1em;
}
.review-count {
  color: #777;
  font-size: 0.9em;
}
</style>