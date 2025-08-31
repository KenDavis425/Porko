<template>
  <div class="stats-page">
    <h2>Database Stats</h2>
    <div class="stats-container">
      <div v-if="statsLoading">Loading stats...</div>
      <ul v-else-if="stats" class="stats-grid">
        <li class="stat-card">
          <strong>Restaurants</strong>
          <span>{{ stats.restaurants }}</span>
        </li>
        <li class="stat-card">
          <strong>Users</strong>
          <span>{{ stats.users }}</span>
        </li>
        <li class="stat-card">
          <strong>Reviews</strong>
          <span>{{ stats.reviews }}</span>
        </li>
        <li class="stat-card">
          <strong>Follows</strong>
          <span>{{ stats.follows }}</span>
        </li>
      </ul>
      <div v-else>Could not load stats.</div>
      <div v-if="log.length > 0" class="log-container">
        <h3>Log:</h3>
        <pre>{{ log.join('\n') }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

export default {
  name: 'DatabaseStats',
  setup() {
    const stats = ref(null);
    const statsLoading = ref(true);
    const log = ref([]);

    const fetchCollectionStats = async () => {
      statsLoading.value = true;
      try {
        const collectionsToCount = ['restaurants', 'users', 'reviews', 'follows'];
        const counts = {};
        const promises = collectionsToCount.map(async (colName) => {
          const coll = collection(db, colName);
          const snapshot = await getCountFromServer(coll);
          counts[colName] = snapshot.data().count;
        });
        await Promise.all(promises);
        stats.value = counts;
      } catch (error) {
        log.value.push('Error fetching collection stats: ' + error.message);
        console.error("Error fetching stats:", error);
      } finally {
        statsLoading.value = false;
      }
    };

    onMounted(fetchCollectionStats);

    return { stats, statsLoading, log };
  }
};
</script>

<style scoped>
.stats-page {
  max-width: 900px;
  margin: 0 auto;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5em;
  list-style: none;
  padding: 0;
}
.stat-card {
  background: var(--card-background);
  padding: 1.5em;
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}
.stat-card strong {
  font-size: 1.1em;
  color: var(--text-color);
}
.stat-card span {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--primary-color);
}
.log-container {
  margin-top: 24px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
}
pre {
    white-space: pre-wrap;
    word-wrap: break-word;
}
</style>