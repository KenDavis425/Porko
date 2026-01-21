<template>
  <div class="user-stats-panel">
    <h2>Your Stats</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-label">Total Reviews</div>
          <div class="stat-value">{{ stats.reviewCount }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📸</div>
        <div class="stat-content">
          <div class="stat-label">Photo Reviews</div>
          <div class="stat-value">{{ stats.photoReviewCount }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🗺️</div>
        <div class="stat-content">
          <div class="stat-label">States Visited</div>
          <div class="stat-value">{{ stats.statesVisited?.size || 0 }}/50</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-label">Followers</div>
          <div class="stat-value">{{ stats.followerCount || 0 }}</div>
        </div>
      </div>
    </div>

    <div v-if="earnedBadges.length > 0" class="badges-section">
      <BadgeDisplay :badges="earnedBadges" title="Your Achievements" />
    </div>

    <div class="achievement-progress">
      <h3>Next Achievement</h3>
      <div v-for="badge in nextBadges" :key="badge.id" class="progress-item">
        <div class="progress-header">
          <span class="badge-preview">{{ badge.emoji }}</span>
          <span class="badge-name">{{ badge.name }}</span>
          <span class="progress-count">{{ getProgress(badge.id) }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: getProgress(badge.id) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { calculateEarnedBadges, BADGES } from '../utils/badges';
import { showToast } from '../utils/toast.js';
import BadgeDisplay from './BadgeDisplay.vue';

export default {
  name: 'UserStatsPanel',
  components: { BadgeDisplay },
  props: {
    user: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const stats = ref({
      reviewCount: 0,
      photoReviewCount: 0,
      statesVisited: new Set(),
      followerCount: 0
    });
    const earnedBadges = ref([]);
    const loading = ref(true);

    const loadUserStats = async () => {
      loading.value = true;
      try {
        // Get user's reviews
        const reviewsSnap = await getDocs(
          query(collection(db, 'reviews'), where('userId', '==', props.user.uid))
        );

        const reviews = reviewsSnap.docs.map(doc => doc.data());
        
        // Count photo reviews and collect states from restaurants
        let photoReviewCount = 0;
        const statesVisited = new Set();
        const reviewsByState = {};
        
        for (const review of reviews) {
          if (review.photoURL) {
            photoReviewCount++;
          }
          
          // Fetch the restaurant document to get the state
          if (review.restaurantId) {
            try {
              const restaurantRef = doc(db, 'restaurants', review.restaurantId);
              const restaurantSnap = await getDoc(restaurantRef);
              if (restaurantSnap.exists()) {
                const restaurantData = restaurantSnap.data();
                if (restaurantData.state) {
                  const state = restaurantData.state.toUpperCase();
                  statesVisited.add(state);
                  reviewsByState[state] = (reviewsByState[state] || 0) + 1;
                }
              }
            } catch (error) {
              console.error('Error fetching restaurant:', error);
            }
          }
        }

        // Get follower count
        const followersSnap = await getDocs(
          query(collection(db, 'follows'), where('followingId', '==', props.user.uid))
        );

        // Get all reviews to check for first-to-review badges
        const allReviewsSnap = await getDocs(collection(db, 'reviews'));
        const allReviews = allReviewsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Count first-to-review achievements
        let firstReviewCount = 0;
        const restaurantReviewMap = {};
        allReviews.forEach(review => {
          if (!restaurantReviewMap[review.restaurantId]) {
            restaurantReviewMap[review.restaurantId] = [];
          }
          restaurantReviewMap[review.restaurantId].push(review);
        });

        reviews.forEach(userReview => {
          const restaurantReviews = restaurantReviewMap[userReview.restaurantId] || [];
          if (restaurantReviews.length > 0) {
            // Sort by timestamp to find the first review
            const sorted = restaurantReviews.sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return timeA - timeB;
            });
            if (sorted[0].userId === props.user.uid) {
              firstReviewCount++;
            }
          }
        });

        const newStats = {
          reviewCount: reviews.length,
          photoReviewCount,
          statesVisited,
          reviewsByState,
          firstReviews: firstReviewCount,
          followerCount: followersSnap.docs.length,
          uid: props.user.uid
        };

        // Calculate newly earned badges and show notifications
        const previousBadges = new Set(earnedBadges.value);
        const newBadges = calculateEarnedBadges(newStats);
        
        // Show toast notifications for newly earned badges
        newBadges.forEach(badgeId => {
          if (!previousBadges.has(badgeId)) {
            const badge = BADGES[Object.keys(BADGES).find(key => BADGES[key].id === badgeId)];
            if (badge) {
              showToast(`🎉 Congratulations! You earned the ${badge.name} badge! ${badge.emoji}`, 'success', 3000);
            }
          }
        });

        stats.value = newStats;
        earnedBadges.value = newBadges;

      } catch (error) {
        console.error('Error loading user stats:', error);
      } finally {
        loading.value = false;
      }
    };

    const nextBadges = computed(() => {
      return Object.values(BADGES)
        .filter(badge => !earnedBadges.value.includes(badge.id))
        .slice(0, 3);
    });

    const getProgress = (badgeId) => {
      const badge = Object.values(BADGES).find(b => b.id === badgeId);
      if (!badge) return 0;

      let progress = 0;

      if (badgeId.includes('reviewer-')) {
        const requiredCount = parseInt(badgeId.match(/\d+/)[0]);
        progress = Math.min(100, (stats.value.reviewCount / requiredCount) * 100);
      } else if (badgeId === 'photo-master') {
        progress = Math.min(100, (stats.value.photoReviewCount / 10) * 100);
      } else if (badgeId === 'all-50-states') {
        progress = Math.min(100, ((stats.value.statesVisited?.size || 0) / 50) * 100);
      }

      return Math.round(progress);
    };

    onMounted(() => {
      loadUserStats();
    });

    return {
      stats,
      earnedBadges,
      nextBadges,
      getProgress,
      loading
    };
  }
};
</script>

<style scoped>
.user-stats-panel {
  background: var(--card-background);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.user-stats-panel h2 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-content {
  flex: 1;
  width: 100%;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-color);
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-top: 0.1rem;
}

.badges-section {
  margin-bottom: 1.5rem;
}

.achievement-progress {
  padding-top: 1.5rem;
  border-top: 2px solid var(--background-color);
}

.achievement-progress h3 {
  color: var(--secondary-color);
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
}

.progress-item {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.badge-preview {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.badge-name {
  flex: 1;
  color: var(--secondary-color);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-count {
  background: var(--primary-color);
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.progress-bar {
  background: var(--background-color);
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, var(--primary-color) 0%, #2980b9 100%);
  height: 100%;
  transition: width 0.3s ease;
}

@media (min-width: 769px) {
  .user-stats-panel {
    padding: 2rem;
  }

  .user-stats-panel h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    flex-direction: row;
    text-align: left;
    padding: 1rem;
    gap: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-label {
    font-size: 0.8rem;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 1.75rem;
    margin-top: 0.25rem;
  }

  .badges-section {
    margin-bottom: 2rem;
  }

  .achievement-progress {
    padding-top: 2rem;
  }

  .achievement-progress h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .progress-item {
    margin-bottom: 1.5rem;
  }

  .progress-header {
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }

  .badge-preview {
    font-size: 1.5rem;
  }

  .badge-name {
    white-space: normal;
  }

  .progress-count {
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
  }
}
</style>
