<template>
  <div class="recommendations-page">
    <div class="page-header">
      <h2>Top 10 Recommendations</h2>
      <p>Based on reviews in the last 6 months within 100 miles of your location.</p>
    </div>
    <div v-if="loading" class="loading-indicator">Loading recommendations...</div>
    <div v-else>
      <p v-if="restaurants.length === 0" class="no-restaurants-message">
        No recommendations found.
      </p>
      <ul v-else class="restaurant-list">
        <li v-for="restaurant in restaurants" :key="restaurant.id" class="restaurant-item">
          <div class="restaurant-details">
            <span class="restaurant-name">{{ restaurant.name }}</span>
            <div class="restaurant-meta">
              <div v-if="restaurant.averageRating > 0" class="rating" :title="`${restaurant.averageRating.toFixed(2)} average rating`">
                <StarRating :rating="restaurant.averageRating" />
                <span class="rating-text">{{ restaurant.averageRating.toFixed(1) }}</span>
                <span class="rating-count">({{ restaurant.reviewCount }} recent reviews)</span>
              </div>
              <span v-if="restaurant.distance !== null" class="distance">{{ restaurant.distance.toFixed(1) }} miles away</span>
            </div>
            <span class="restaurant-address">{{ restaurant.address }}, {{ restaurant.city }}, {{ restaurant.state }} {{ restaurant.zip }}</span>
          </div>
          <div class="restaurant-actions">
            <button @click="toggleBucketList(restaurant)" class="action-btn" :class="{ 'in-bucket-list': isInBucketList(restaurant.id) }" :title="isInBucketList(restaurant.id) ? 'Remove from Bucket List' : 'Add to Bucket List'">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 7h-2.06c-.33-3.2-2.46-5.8-5.94-5.8S4.39 3.8 4.06 7H2v12h16V7zM6.14 7c.2-1.92 1.6-3.48 3.86-3.8A4.002 4.002 0 0 1 14 7h-2.14c-.2-1.92-1.6-3.48-3.86-3.8zM16 17H4v-8h12v8z"/></svg>
            </button>
            <a :href="getDirectionsUrl(restaurant)" target="_blank" rel="noopener noreferrer" class="action-btn" title="Get Directions">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M22.43 10.59l-9.01-9.01c-.75-.75-2.07-.76-2.83 0l-9.01 9.01c-.76.75-.76 2.07 0 2.83l9.01 9.01c.75.75 2.07.75 2.83 0l9.01-9.01c.75-.76.75-2.08 0-2.83zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
            </a>
            <a :href="getDetailsUrl(restaurant)" target="_blank" rel="noopener noreferrer" class="action-btn" title="View Details on Google">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.41-1.41L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </a>
            <button class="check-in-btn" @click="$emit('review-at', restaurant.id)">Review</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, Timestamp, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import { getDistance } from '../utils/geolocation.js';

export default {
  name: 'Recommendations',
  components: { StarRating },
  emits: ['review-at'],
  setup() {
    const restaurants = ref([]);
    const loading = ref(true);
    const userLocation = ref(null);
    const bucketList = ref(new Set());
    let bucketListUnsubscribe = () => {};

    const fetchRecommendations = async () => {
      if (!userLocation.value) {
        console.error("User location not available.");
        loading.value = false;
        restaurants.value = [];
        return;
      }

      try {
        const allRestaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
        const allRestaurants = allRestaurantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const nearbyRestaurants = allRestaurants.filter(r => {
          if (!r.location || typeof r.location.lat !== 'number' || typeof r.location.lng !== 'number') {
            return false;
          }
          const distance = getDistance(userLocation.value.lat, userLocation.value.lng, r.location.lat, r.location.lng);
          r.distance = distance;
          return distance !== null && distance <= 100;
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);

        const reviewsQuery = query(collection(db, 'reviews'), where('createdAt', '>=', sixMonthsAgoTimestamp));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const recentReviews = reviewsSnapshot.docs.map(doc => doc.data());

        const recommendations = nearbyRestaurants.map(restaurant => {
          const relevantReviews = recentReviews.filter(review => review.restaurantId === restaurant.id && typeof review.rating === 'number');
          let averageRating = 0;
          let reviewCount = 0;

          if (relevantReviews.length > 0) {
            const totalRating = relevantReviews.reduce((sum, review) => sum + review.rating, 0);
            averageRating = totalRating / relevantReviews.length;
            reviewCount = relevantReviews.length;
          }

          return { ...restaurant, averageRating, reviewCount };
        }).filter(r => r.reviewCount > 0);

        recommendations.sort((a, b) => b.averageRating - a.averageRating);
        restaurants.value = recommendations.slice(0, 10);

      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          userLocation.value = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          fetchRecommendations();
          subscribeToBucketList();
        }, (error) => {
          console.error("Geolocation failed. Using default location.", error);
          userLocation.value = { lat: 41.5, lng: -90.5 }; // Default to Quad Cities
          fetchRecommendations();
          subscribeToBucketList();
        });
      } else {
        console.error("Geolocation is not supported by this browser.");
        userLocation.value = { lat: 41.5, lng: -90.5 }; // Default to Quad Cities
        fetchRecommendations();
        subscribeToBucketList();
      }
    });

    onUnmounted(() => {
      bucketListUnsubscribe();
    });

    const getDirectionsUrl = (restaurant) => {
      const destination = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    };

    const getDetailsUrl = (restaurant) => {
      const query = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/search?q=${query}`;
    };

    const subscribeToBucketList = () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const q = query(collection(db, 'bucketListItems'), where('userId', '==', currentUser.uid));
      bucketListUnsubscribe = onSnapshot(q, (snapshot) => {
        const newBucketList = new Set();
        snapshot.forEach(doc => newBucketList.add(doc.data().restaurantId));
        bucketList.value = newBucketList;
      });
    };

    const isInBucketList = (restaurantId) => {
      return bucketList.value.has(restaurantId);
    };

    const toggleBucketList = async (restaurant) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      if (isInBucketList(restaurant.id)) {
        const q = query(collection(db, 'bucketListItems'), where('userId', '==', currentUser.uid), where('restaurantId', '==', restaurant.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => deleteDoc(doc.ref));
      } else {
        await addDoc(collection(db, 'bucketListItems'), {
          userId: currentUser.uid,
          restaurantId: restaurant.id,
          createdAt: serverTimestamp()
        });
      }
    };

    return {
      restaurants,
      loading,
      getDirectionsUrl,
      getDetailsUrl,
      isInBucketList,
      toggleBucketList
    };
  }
};
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 2em;
}
.page-header h2 {
  margin-bottom: 0.25em;
}
.page-header p {
  color: #777;
  max-width: 500px;
  margin: 0 auto;
}
.loading-indicator, .no-restaurants-message {
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
  word-break: break-word;
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
  word-break: break-word;
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
.action-btn svg {
  width: 20px;
  height: 20px;
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
.in-bucket-list {
  color: var(--primary-color) !important;
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
    justify-content: center;
  }
}
</style>