<template>
  <div class="activity-feed">
    <h2>Activity Feed</h2>
    <p class="feed-description">See what your followers are up to</p>

    <div v-if="loading" class="loading-indicator">Loading activity...</div>
    <div v-else-if="activities.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 0 24 24" width="48px" fill="var(--primary-color)" opacity="0.3">
        <path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
      </svg>
      <h3>No Activity Yet</h3>
      <p>Follow some users to see their recent reviews here!</p>
    </div>

    <div v-else class="activities-list">
      <div v-for="activity in activities" :key="activity.id" class="activity-item">
        <div class="activity-header">
          <img :src="activity.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="activity-avatar" referrerpolicy="no-referrer" />
          <div class="activity-info">
            <div class="activity-action">
              <span class="user-name">{{ activity.userName }}</span>
              <span v-if="activity.badgesEarned && activity.badgesEarned.length > 0" class="badge-indicator">
                🎉 earned badges!
              </span>
              <span v-else>reviewed</span>
            </div>
            <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
          </div>
        </div>

        <div v-if="activity.badgesEarned && activity.badgesEarned.length > 0" class="badges-earned">
          <div class="earned-title">New Achievements!</div>
          <div class="earned-badges">
            <span v-for="badgeId in activity.badgesEarned" :key="badgeId" class="earned-badge" :title="getBadgeName(badgeId)">
              {{ getBadgeEmoji(badgeId) }}
            </span>
          </div>
        </div>

        <div v-if="activity.reviewRestaurant" class="activity-content">
          <div class="restaurant-info">
            <h4 class="restaurant-name">{{ activity.reviewRestaurant }}</h4>
            <div class="review-details">
              <div class="rating">
                <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= activity.rating }">★</span>
                <span class="rating-value">{{ activity.rating }}/5</span>
              </div>
              <div v-if="activity.reviewTitle" class="review-title">"{{ activity.reviewTitle }}"</div>
            </div>
          </div>
          <button @click="viewRestaurant(activity.restaurantId)" class="btn-view" title="View restaurant">
            View Restaurant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getBadgeById } from '../utils/badges';

export default {
  name: 'ActivityFeed',
  props: {
    user: {
      type: Object,
      required: true
    },
    following: {
      type: Array,
      default: () => []
    }
  },
  emits: ['restaurant-selected'],
  setup(props, { emit }) {
    const activities = ref([]);
    const loading = ref(true);

    const loadActivityFeed = async () => {
      loading.value = true;
      try {
        if (!props.user || !props.following || props.following.length === 0) {
          activities.value = [];
          loading.value = false;
          return;
        }

        // Get recent reviews from people you follow
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', 'in', props.following),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsMap = new Map();

        // Get user info and badges for all reviewers
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('uid', 'in', props.following))
        );
        const usersMap = new Map();
        usersSnap.docs.forEach(doc => {
          usersMap.set(doc.id, doc.data());
        });

        // Get restaurant info for all reviewed restaurants
        const restaurantIds = new Set();
        reviewsSnap.docs.forEach(doc => {
          const review = doc.data();
          if (review.restaurantId) {
            restaurantIds.add(review.restaurantId);
          }
        });

        const restaurantsMap = new Map();
        if (restaurantIds.size > 0) {
          const restaurantsSnap = await getDocs(
            query(collection(db, 'restaurants'), where('__name__', 'in', Array.from(restaurantIds)))
          );
          restaurantsSnap.docs.forEach(doc => {
            restaurantsMap.set(doc.id, doc.data());
          });
        }

        // Build activity items
        const activityList = [];
        reviewsSnap.docs.forEach(doc => {
          const review = doc.data();
          const user = usersMap.get(review.userId);
          const restaurant = restaurantsMap.get(review.restaurantId);

          if (user && restaurant) {
            activityList.push({
              id: doc.id,
              userId: review.userId,
              userName: user.displayName || 'Unknown User',
              userPhoto: user.photoURL,
              timestamp: review.createdAt,
              reviewRestaurant: restaurant.name,
              restaurantId: review.restaurantId,
              rating: review.rating,
              reviewTitle: review.title,
              badgesEarned: [] // Could be populated from user data
            });
          }
        });

        activities.value = activityList.slice(0, 15); // Limit to 15 most recent
      } catch (error) {
        console.error('Error loading activity feed:', error);
        activities.value = [];
      } finally {
        loading.value = false;
      }
    };

    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    const getBadgeName = (badgeId) => {
      const badge = getBadgeById(badgeId);
      return badge ? badge.name : 'Achievement';
    };

    const getBadgeEmoji = (badgeId) => {
      const badge = getBadgeById(badgeId);
      return badge ? badge.emoji : '🏆';
    };

    const viewRestaurant = (restaurantId) => {
      emit('restaurant-selected', restaurantId);
    };

    onMounted(() => {
      loadActivityFeed();
    });

    return {
      activities,
      loading,
      formatTime,
      getBadgeName,
      getBadgeEmoji,
      viewRestaurant
    };
  }
};
</script>

<style scoped>
.activity-feed {
  width: 100%;
}

.activity-feed h2 {
  color: var(--primary-color);
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.feed-description {
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  opacity: 0.8;
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

.empty-state svg {
  display: block;
  margin: 0 auto 1rem;
}

.empty-state h3 {
  margin: 0.5rem 0;
  color: var(--secondary-color);
}

.empty-state p {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  background: var(--card-background);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px var(--shadow-color);
  transition: box-shadow 0.2s;
}

.activity-item:hover {
  box-shadow: 0 2px 8px var(--shadow-color);
}

.activity-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.activity-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.activity-info {
  flex: 1;
}

.activity-action {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.user-name {
  font-weight: 600;
  color: var(--secondary-color);
}

.badge-indicator {
  color: var(--primary-color);
  font-weight: 500;
}

.activity-time {
  display: block;
  font-size: 0.85rem;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 0.25rem;
}

.badges-earned {
  background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
  border-left: 4px solid #ffc107;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.earned-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f57f17;
  margin-bottom: 0.5rem;
}

.earned-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.earned-badge {
  font-size: 1.5rem;
  cursor: help;
}

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.restaurant-info {
  flex: 1;
}

.restaurant-name {
  margin: 0 0 0.5rem 0;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.review-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.star {
  color: #ddd;
  font-size: 1rem;
}

.star.filled {
  color: #ffc107;
}

.rating-value {
  color: var(--text-color);
  font-weight: 600;
}

.review-title {
  color: var(--text-color);
  font-style: italic;
  font-size: 0.95rem;
}

.btn-view {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-view:hover {
  background: #2980b9;
}

@media (max-width: 768px) {
  .activity-content {
    flex-direction: column;
  }

  .btn-view {
    width: 100%;
  }

  .activity-action {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
