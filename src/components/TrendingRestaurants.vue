<template>
  <div class="trending-section">
    <h2>Trending This Week</h2>
    
    <div class="trend-tabs">
      <button 
        @click="trendType = 'most-reviewed'" 
        :class="{ active: trendType === 'most-reviewed' }"
        class="trend-tab"
      >
        🔥 Most Reviewed
      </button>
      <button 
        @click="trendType = 'highest-rated'" 
        :class="{ active: trendType === 'highest-rated' }"
        class="trend-tab"
      >
        ⭐ Highest Rated
      </button>
    </div>

    <div v-if="loading" class="loading-indicator">Loading trending...</div>
    <div v-else-if="trendingList.length === 0" class="empty-state">
      <p>No data available yet</p>
    </div>

    <div v-else class="trending-list">
      <div v-for="(item, index) in trendingList" :key="item.id" class="trending-item">
        <div class="ranking">
          <span class="rank-number">#{{ index + 1 }}</span>
          <span v-if="index === 0" class="rank-badge">🥇</span>
          <span v-else-if="index === 1" class="rank-badge">🥈</span>
          <span v-else-if="index === 2" class="rank-badge">🥉</span>
        </div>

        <div class="restaurant-info">
          <h4 class="restaurant-name">{{ item.name }}</h4>
          <div class="restaurant-meta">
            <span class="location">{{ item.city }}<template v-if="item.city && item.state">, </template>{{ item.state }}</span>
            <span class="stat-badge">
              <span v-if="trendType === 'most-reviewed'" class="stat-value">{{ item.weekReviews }} reviews</span>
              <span v-else class="stat-value">{{ item.averageRating.toFixed(1) }} ⭐</span>
            </span>
          </div>
          <div class="trend-indicator">
            <span v-if="trendType === 'most-reviewed'" class="indicator-text">
              📈 {{ item.weekReviews }} new reviews this week
            </span>
            <span v-else class="indicator-text">
              Based on {{ item.ratingCount }} reviews
            </span>
          </div>
        </div>

        <button @click="viewRestaurant(item.id)" class="btn-view" title="View restaurant">
          View
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export default {
  name: 'TrendingRestaurants',
  emits: ['restaurant-selected'],
  setup(props, { emit }) {
    const trendType = ref('most-reviewed');
    const restaurants = ref([]);
    const loading = ref(true);

    const loadTrendingRestaurants = async () => {
      loading.value = true;
      try {
        // Get all restaurants
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        const restaurantsList = [];

        // Calculate one week ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Get all reviews to calculate trending stats
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const statsMap = new Map();

        reviewsSnap.docs.forEach(doc => {
          const review = doc.data();
          const restaurantId = review.restaurantId;
          const createdAt = review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt);

          if (!statsMap.has(restaurantId)) {
            statsMap.set(restaurantId, {
              totalReviews: 0,
              weekReviews: 0,
              ratings: [],
              ratingCount: 0
            });
          }

          const stats = statsMap.get(restaurantId);
          stats.totalReviews++;
          stats.ratings.push(review.rating);
          stats.ratingCount++;

          if (createdAt > oneWeekAgo) {
            stats.weekReviews++;
          }
        });

        // Build restaurant list with stats
        restaurantsSnap.docs.forEach(doc => {
          const restaurant = doc.data();
          const stats = statsMap.get(doc.id) || {
            totalReviews: 0,
            weekReviews: 0,
            ratings: [],
            ratingCount: 0
          };

          const avgRating = stats.ratings.length > 0
            ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
            : 0;

          restaurantsList.push({
            id: doc.id,
            name: restaurant.name,
            city: restaurant.city,
            state: restaurant.state,
            weekReviews: stats.weekReviews,
            totalReviews: stats.totalReviews,
            averageRating: avgRating,
            ratingCount: stats.ratingCount
          });
        });

        restaurants.value = restaurantsList;
      } catch (error) {
        console.error('Error loading trending restaurants:', error);
        restaurants.value = [];
      } finally {
        loading.value = false;
      }
    };

    const trendingList = computed(() => {
      if (trendType.value === 'most-reviewed') {
        return restaurants.value
          .filter(r => r.weekReviews > 0)
          .sort((a, b) => b.weekReviews - a.weekReviews)
          .slice(0, 10);
      } else {
        return restaurants.value
          .filter(r => r.ratingCount >= 3) // Need at least 3 reviews
          .sort((a, b) => b.averageRating - a.averageRating)
          .slice(0, 10);
      }
    });

    const viewRestaurant = (restaurantId) => {
      emit('restaurant-selected', restaurantId);
    };

    onMounted(() => {
      loadTrendingRestaurants();
    });

    return {
      trendType,
      trendingList,
      loading,
      viewRestaurant
    };
  }
};
</script>

<style scoped>
.trending-section {
  width: 100%;
  margin-bottom: 2rem;
}

.trending-section h2 {
  color: var(--primary-color);
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
}

.trend-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--background-color);
}

.trend-tab {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: var(--text-color);
  font-weight: 600;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.trend-tab:hover {
  color: var(--primary-color);
}

.trend-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: var(--text-color);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  background: var(--background-color);
  border-radius: 8px;
  color: var(--text-color);
}

.trending-list {
  display: grid;
  gap: 1rem;
}

.trending-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--card-background);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px var(--shadow-color);
  transition: all 0.2s;
}

.trending-item:hover {
  box-shadow: 0 2px 8px var(--shadow-color);
  border-color: var(--primary-color);
}

.ranking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 50px;
}

.rank-number {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--primary-color);
}

.rank-badge {
  font-size: 1.5rem;
}

.restaurant-info {
  flex: 1;
}

.restaurant-name {
  margin: 0 0 0.5rem 0;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.restaurant-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.location {
  font-size: 0.9rem;
  color: var(--text-color);
  opacity: 0.7;
}

.stat-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.stat-value {
  white-space: nowrap;
}

.trend-indicator {
  font-size: 0.9rem;
  color: var(--primary-color);
  font-weight: 500;
}

.indicator-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-view {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-view:hover {
  background: #2980b9;
}

@media (max-width: 768px) {
  .trending-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .restaurant-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-view {
    width: 100%;
    text-align: center;
  }

  .ranking {
    flex-direction: row;
    gap: 0.5rem;
  }
}
</style>
