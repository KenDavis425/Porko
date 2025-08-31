<template>
  <div class="restaurants-page">
    <EditRestaurantModal 
      v-if="isEditModalVisible"
      :restaurant="restaurantToEdit"
      @close="closeEditModal"
      @save="saveRestaurantChanges"
    />
    <RestaurantReviewsModal
      v-if="isReviewsModalVisible"
      :restaurant="restaurantForReviews"
      @close="closeReviewsModal"
    />
    <div class="search-box">
      <input type="text" v-model="searchQuery" placeholder="Search by name, address, city, state, or zip..." class="search-input" />
    </div>
    <div v-if="loading" class="loading-indicator">Loading restaurants...</div>
    <div v-else class="restaurant-list-container">
      <ul v-if="filteredRestaurants.length > 0" class="restaurant-list">
        <li v-for="restaurant in filteredRestaurants" :key="restaurant.id" class="restaurant-item">
          <div class="restaurant-details">
            <span class="restaurant-name">{{ restaurant.name }}</span>
            <div class="restaurant-meta">
              <div v-if="restaurant.averageRating > 0" class="rating" :title="`${restaurant.averageRating.toFixed(2)} average rating`">
                <StarRating :rating="restaurant.averageRating" />
                <span class="rating-text">{{ restaurant.averageRating.toFixed(1) }}</span>
                <span class="rating-count">({{ restaurant.ratingCount }})</span>
              </div>
              <span v-if="restaurant.distance !== null" class="distance">{{ restaurant.distance.toFixed(1) }} miles away </span>
            </div>
            <span class="restaurant-address">
              {{ restaurant.address }}<template v-if="restaurant.city">, {{ restaurant.city }}</template><template v-if="restaurant.state">, {{ restaurant.state }}</template><template v-if="restaurant.zip"> {{ restaurant.zip }}</template>
            </span>
          </div>
          <div class="restaurant-actions">
            <button @click="toggleBucketList(restaurant)" class="action-btn" :class="{ 'in-bucket-list': isInBucketList(restaurant.id) }" :title="isInBucketList(restaurant.id) ? 'Remove from Bucket List' : 'Add to Bucket List'">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 7h-2.06c-.33-3.2-2.46-5.8-5.94-5.8S4.39 3.8 4.06 7H2v12h16V7zM6.14 7c.2-1.92 1.6-3.48 3.86-3.8A4.002 4.002 0 0 1 14 7h-2.14c-.2-1.92-1.6-3.48-3.86-3.8zM16 17H4v-8h12v8z"/></svg>
            </button>
            <button @click="openReviewsModal(restaurant)" class="action-btn" title="View Reviews">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            </button>
            <button @click="openEditModal(restaurant)" class="action-btn" title="Edit Restaurant">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
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
      <p v-else class="no-restaurants-message">No restaurants found matching your search.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import EditRestaurantModal from './EditRestaurantModal.vue'; 
import RestaurantReviewsModal from './RestaurantReviewsModal.vue'; 
import { getDistance } from '../utils/geolocation.js';

export default {
  name: 'Restaurants',
  components: { EditRestaurantModal, StarRating, RestaurantReviewsModal },
  emits: ['review-at'],
  setup() {
    const restaurants = ref([]);
    const loading = ref(true);
    const searchQuery = ref('');
    const isEditModalVisible = ref(false);
    const isReviewsModalVisible = ref(false);
    const restaurantToEdit = ref(null);
    const restaurantForReviews = ref(null);
    const userLocation = ref(null);
    const bucketList = ref(new Set());
    let bucketListUnsubscribe = () => {};

    const fetchRestaurantsAndRatings = async () => {
      loading.value = true;
      try {
        const [restaurantsSnapshot, reviewsSnapshot] = await Promise.all([
          getDocs(collection(db, 'restaurants')),
          getDocs(collection(db, 'reviews'))
        ]);

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

        restaurants.value = restaurantsSnapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          const ratingInfo = ratings[data.id];
          return {
            ...data,
            averageRating: ratingInfo ? ratingInfo.total / ratingInfo.count : 0,
            ratingCount: ratingInfo ? ratingInfo.count : 0,
          };
        });
      } catch (error) {
        console.error("Error fetching restaurants and ratings:", error);
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
          fetchRestaurantsAndRatings();
          subscribeToBucketList();
        }, (error) => {
          console.error("Error getting location", error);
          fetchRestaurantsAndRatings();
          subscribeToBucketList();
        });
      } else {
        console.error("Geolocation is not supported by this browser.");
        fetchRestaurantsAndRatings();
        subscribeToBucketList();
      }
    });

    onUnmounted(() => {
      bucketListUnsubscribe();
    });

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

    const restaurantsWithDistance = computed(() => {
      return restaurants.value.map(r => {
        const distance = userLocation.value && r.location ? getDistance(userLocation.value.lat, userLocation.value.lng, r.location.lat, r.location.lng) : null;
        return { ...r, distance };
      }).sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    });

    const filteredRestaurants = computed(() => {
      if (!searchQuery.value.trim()) {
        return restaurantsWithDistance.value;
      }
      const lowerCaseQuery = searchQuery.value.toLowerCase();
      return restaurantsWithDistance.value.filter(r =>
        (r.name && r.name.toLowerCase().includes(lowerCaseQuery)) ||
        (r.address && r.address.toLowerCase().includes(lowerCaseQuery)) ||
        (r.city && r.city.toLowerCase().includes(lowerCaseQuery)) ||
        (r.state && r.state.toLowerCase().includes(lowerCaseQuery)) ||
        (r.zip && r.zip.toLowerCase().includes(lowerCaseQuery))
      );
    });

    const getDirectionsUrl = (restaurant) => {
      const destination = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    };

    const getDetailsUrl = (restaurant) => {
      const query = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
      return `https://www.google.com/search?q=${query}`;
    };

    const openEditModal = (restaurant) => {
      restaurantToEdit.value = restaurant;
      isEditModalVisible.value = true;
    };

    const closeEditModal = () => {
      isEditModalVisible.value = false;
      restaurantToEdit.value = null;
    };

    const openReviewsModal = (restaurant) => {
      restaurantForReviews.value = restaurant;
      isReviewsModalVisible.value = true;
    };

    const closeReviewsModal = () => {
      isReviewsModalVisible.value = false;
      restaurantForReviews.value = null;
    };

    const saveRestaurantChanges = async (updatedRestaurant) => {
      if (!updatedRestaurant || !updatedRestaurant.id) return;

      const original = restaurantToEdit.value;
      const addressParts = ['address', 'city', 'state', 'zip'];
      const addressChanged = addressParts.some(part => original[part] !== updatedRestaurant[part]);

      if (addressChanged) {
        const fullAddress = [updatedRestaurant.address, updatedRestaurant.city, updatedRestaurant.state, updatedRestaurant.zip].filter(Boolean).join(', ');
        const { geocodeAddress } = await import('../utils/geocoding.js');
        const location = await geocodeAddress(fullAddress);
        if (location) {
          updatedRestaurant.location = location;
        } else {
          alert("Could not find a location for the provided address. Please check the address and try again. The restaurant will be saved without a location.");
          updatedRestaurant.location = null;
        }
      }

      const { id, ...dataToSave } = updatedRestaurant;
      const restaurantRef = doc(db, 'restaurants', id);
      try {
        await updateDoc(restaurantRef, dataToSave);
        const index = restaurants.value.findIndex(r => r.id === id);
        if (index !== -1) {
          // Use splice to ensure reactivity
          restaurants.value.splice(index, 1, { ...restaurants.value[index], ...updatedRestaurant });
        }
        closeEditModal();
      } catch (error) {
        console.error("Error updating restaurant: ", error);
        alert("Failed to save changes. Please try again.");
      }
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
      searchQuery,
      filteredRestaurants,
      getDirectionsUrl,
      getDetailsUrl,
      isEditModalVisible,
      restaurantToEdit,
      isReviewsModalVisible,
      restaurantForReviews,
      openEditModal,
      closeEditModal,
      saveRestaurantChanges,
      openReviewsModal,
      closeReviewsModal,
      isInBucketList,
      toggleBucketList
    };
  }
};
</script>

<style scoped>
.search-box {
  margin-bottom: 2em;
}
.search-input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 1em;
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