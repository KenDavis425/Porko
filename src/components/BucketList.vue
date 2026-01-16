<template>
  <div class="bucket-list-page">
    <div class="page-header">
      <div class="view-toggle">
        <button @click="showCompleted = false" :class="{ active: !showCompleted }">To Try</button>
        <button @click="showCompleted = true" :class="{ active: showCompleted }">Completed</button>
      </div>
    </div>
    <div v-if="!currentUser" class="no-items-message">
      <p>Please log in to view your bucket list.</p>
    </div>
    <div v-else-if="loading" class="loading-indicator">Loading your bucket list...</div>
    <div v-else-if="filteredItems.length === 0" class="no-items-message">
      <p v-if="!showCompleted">Your bucket list is empty. Add some restaurants to try!</p>
      <p v-else>You haven't completed any bucket list items yet.</p>
    </div>
    <div v-else class="restaurant-list">
      <div v-for="item in filteredItems" :key="item.id" class="restaurant-item">
        <!-- Restaurant details, similar to Restaurants.vue -->
        <div class="restaurant-details">
            <span class="restaurant-name">{{ item.restaurant.name }}</span>
            <div class="restaurant-meta">
              <div v-if="item.restaurant.averageRating > 0" class="rating" :title="`${item.restaurant.averageRating.toFixed(2)} average rating`">
                <StarRating :rating="item.restaurant.averageRating" />
                <span class="rating-text">{{ item.restaurant.averageRating.toFixed(1) }}</span>
                <span class="rating-count">({{ item.restaurant.ratingCount }})</span>
              </div>
              <span v-if="item.restaurant.distance !== null" class="distance">{{ item.restaurant.distance.toFixed(1) }} miles away </span>
            </div>
            <span class="restaurant-address">
              {{ item.restaurant.address }}<template v-if="item.restaurant.city">, {{ item.restaurant.city }}</template><template v-if="item.restaurant.state">, {{ item.restaurant.state }}</template><template v-if="item.restaurant.zip"> {{ item.restaurant.zip }}</template>
            </span>
        </div>
        <div class="restaurant-actions">
            <!-- Actions -->
            <button @click="removeFromBucketList(item.id)" class="action-btn delete-btn">Remove</button>
            <button class="check-in-btn" @click="$emit('review-at', item.restaurantId)">Review</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, documentId } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import { getDistance } from '../utils/geolocation.js';

export default {
  name: 'BucketList',
  components: { StarRating },
  emits: ['review-at'],
  setup() {
    const bucketListItems = ref([]);
    const loading = ref(true);
    const showCompleted = ref(false);
    const userLocation = ref(null);
    const currentUser = ref(auth.currentUser);
    let unsubscribe = () => {};

    // Watch for auth state changes
    auth.onAuthStateChanged((user) => {
      currentUser.value = user;
      if (!user) {
        loading.value = false;
        bucketListItems.value = [];
        if (unsubscribe) unsubscribe();
      } else {
        fetchBucketList();
      }
    });

    const fetchBucketList = () => {
      const user = auth.currentUser;
      if (!user) {
        loading.value = false;
        bucketListItems.value = [];
        return;
      }

      const q = query(collection(db, 'bucketListItems'), where('userId', '==', user.uid));
      
      unsubscribe = onSnapshot(q, async (snapshot) => {
        loading.value = true;
        
        try {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (items.length === 0) {
            bucketListItems.value = [];
            loading.value = false;
            return;
          }

          const restaurantIds = [...new Set(items.map(item => item.restaurantId).filter(Boolean))];
          const restaurantsMap = new Map();
          
          if (restaurantIds.length > 0) {
              // Batch fetch restaurants
              for (let i = 0; i < restaurantIds.length; i += 30) {
                const batchIds = restaurantIds.slice(i, i + 30);
                const restaurantsQuery = query(collection(db, 'restaurants'), where(documentId(), 'in', batchIds));
                const restaurantsSnapshot = await getDocs(restaurantsQuery);
                restaurantsSnapshot.forEach(doc => restaurantsMap.set(doc.id, { id: doc.id, ...doc.data() }));
              }

              // Batch fetch review counts and ratings
              const reviewsQuery = query(collection(db, 'reviews'), where('restaurantId', 'in', restaurantIds));
              const reviewsSnapshot = await getDocs(reviewsQuery);
              const ratings = {};
              reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                if (review.restaurantId && typeof review.rating === 'number') {
                  if (!ratings[review.restaurantId]) {
                    ratings[review.restaurantId] = { total: 0, count: 0 };
                  }
                  ratings[review.restaurantId].total += review.rating;
                  ratings[review.restaurantId].count++;
                }
              });

              bucketListItems.value = items.map(item => {
                const restaurant = restaurantsMap.get(item.restaurantId);
                if (!restaurant) return null;

                const ratingInfo = ratings[restaurant.id];
                restaurant.averageRating = ratingInfo ? ratingInfo.total / ratingInfo.count : 0;
                restaurant.ratingCount = ratingInfo ? ratingInfo.count : 0;
                restaurant.distance = userLocation.value && restaurant.location ? getDistance(userLocation.value.lat, userLocation.value.lng, restaurant.location.lat, restaurant.location.lng) : null;

                return { ...item, restaurant };
              }).filter(Boolean);
          } else {
              // No valid restaurant IDs found in items
              bucketListItems.value = [];
          }
        } catch (error) {
          console.error('Error loading bucket list:', error);
          bucketListItems.value = [];
        } finally {
          loading.value = false;
        }
      }, (error) => {
        console.error('Error in bucket list snapshot:', error);
        bucketListItems.value = [];
        loading.value = false;
      });
    };

    onMounted(() => {
      // Get user location if available, but don't block on it
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          userLocation.value = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          // Location updated - refresh distances if bucket list is already loaded
          if (bucketListItems.value.length > 0 && currentUser.value) {
            fetchBucketList();
          }
        }, (error) => {
          console.error("Error getting location for bucket list", error);
        });
      }
      
      // Fetch bucket list if user is already logged in (onAuthStateChanged handles new logins)
      if (currentUser.value) {
        fetchBucketList();
      } else {
        loading.value = false;
      }
    });

    onUnmounted(() => {
      unsubscribe();
    });

    const filteredItems = computed(() => {
      const filtered = bucketListItems.value.filter(item => {
        return showCompleted.value ? !!item.completedAt : !item.completedAt;
      });
      return filtered.sort((a, b) => {
        if (a.restaurant.distance === null) return 1;
        if (b.restaurant.distance === null) return -1;
        return a.restaurant.distance - b.restaurant.distance;
      });
    });

    const removeFromBucketList = async (itemId) => {
      if (confirm('Are you sure you want to remove this from your bucket list?')) {
        await deleteDoc(doc(db, 'bucketListItems', itemId));
      }
    };

    const getDirectionsUrl = (restaurant) => {
      const destination = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    };

    const getDetailsUrl = (restaurant) => {
      const query = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/search?q=${query}`;
    };

    return {
      loading,
      showCompleted,
      filteredItems,
      removeFromBucketList,
      getDirectionsUrl,
      getDetailsUrl,
      currentUser
    };
  }
};
</script>

<style scoped>
/* styles for BucketList.vue */
.bucket-list-page {
  max-width: 800px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2em;
}
.view-toggle button {
  background: none;
  border: 1px solid #ccc;
  padding: 8px 16px;
  cursor: pointer;
}
.view-toggle button.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.view-toggle button:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}
.view-toggle button:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  border-left: none;
}
.loading-indicator, .no-items-message {
  text-align: center;
  color: #777;
  padding: 3em;
}
.restaurant-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.restaurant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5em;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  margin-bottom: 1.5em;
}
.restaurant-details {
  display: flex;
  flex-direction: column;
}
.restaurant-name {
  font-weight: 600;
  font-size: 1.2em;
  margin-bottom: 0.25em;
}
.restaurant-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1em;
  margin-bottom: 0.5em;
  color: #555;
  font-size: 0.9em;
}
.rating {
  display: flex;
  align-items: center;
  gap: 0.25em;
}
.rating-text {
  font-weight: bold;
  margin-left: 0.25em;
}
.rating-count {
  color: #777;
}
.distance {
  font-style: italic;
}
.restaurant-address {
  color: #777;
  font-size: 0.9em;
}
.restaurant-actions {
  display: flex;
  gap: 0.75em;
}
.action-btn, .check-in-btn {
  background: none;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #555;
}
.action-btn:hover {
  background-color: #f0f0f0;
  border-color: #bbb;
}
.delete-btn {
  color: #e74c3c;
  border-color: #e74c3c;
}
.delete-btn:hover {
  background-color: #e74c3c;
  color: white;
}
.check-in-btn {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  padding: 8px 16px;
  font-weight: 600;
}
.check-in-btn:hover {
  background-color: var(--primary-dark-color);
}

@media (max-width: 768px) {
  .restaurant-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1em;
  }
  .restaurant-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.5em;
  }
  .restaurant-actions .action-btn,
  .restaurant-actions .check-in-btn {
    flex-grow: 1;
    text-align: center;
  }
}
</style>