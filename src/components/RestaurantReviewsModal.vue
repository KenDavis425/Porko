<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Reviews for {{ restaurant.name }}</h2>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-indicator">Loading reviews...</div>
        <div v-else-if="reviews.length === 0" class="no-reviews-message">
          No reviews yet for this restaurant.
        </div>
        <ul v-else class="reviews-list">
          <li v-for="review in reviews" :key="review.id" class="review-item">
            <div class="review-header">
              <img :src="review.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" />
              <div class="user-info">
                <span class="user-name">{{ review.userName }}</span>
                <span class="review-date">{{ formatDate(review.createdAt) }}</span>
              </div>
            </div>
            <div class="review-body">
              <StarRating :rating="review.rating" />
              <p v-if="review.text" class="review-text">"{{ review.text }}"</p>
              <div v-if="review.photoURL" class="review-photo-container">
                <img :src="review.photoURL" alt="Review photo" class="review-photo" />
              </div>
              <div v-if="review.tags && review.tags.length > 0" class="tags-container">
                <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import StarRating from './StarRating.vue';

export default {
  name: 'RestaurantReviewsModal',
  components: { StarRating },
  props: {
    restaurant: {
      type: Object,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const reviews = ref([]);
    const loading = ref(true);

    const fetchReviewsForRestaurant = async () => {
      if (!props.restaurant?.id) return;
      console.log(`Fetching reviews for restaurant ID: ${props.restaurant.id}`);
      loading.value = true;
      reviews.value = [];
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('restaurantId', '==', props.restaurant.id),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        console.log(`Found ${reviewsSnapshot.size} reviews for restaurant ${props.restaurant.id}.`);
        const reviewData = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (reviewData.length === 0) {
          reviews.value = [];
          loading.value = false;
          return;
        }

        const userIds = [...new Set(reviewData.map(r => r.userId))];
        const usersMap = new Map();

        // Firestore 'in' queries are limited to 30 elements.
        // Batch the user ID fetches to handle more than 30 reviews.
        const userPromises = [];
        for (let i = 0; i < userIds.length; i += 30) {
          const batchIds = userIds.slice(i, i + 30);
          if (batchIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', batchIds));
            userPromises.push(getDocs(usersQuery));
          }
        }

        const userSnapshots = await Promise.all(userPromises);
        userSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            const userData = doc.data();
            usersMap.set(userData.uid, userData);
          });
        });

        reviews.value = reviewData.map(review => {
          const user = usersMap.get(review.userId);
          return {
            ...review,
            userName: user?.displayName || 'Unknown User',
            userPhoto: user?.photoURL || null
          };
        });
      } catch (error) {
        console.error("Error fetching reviews for restaurant:", error);
        console.error("Error fetching reviews:", error);
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.restaurant, (newRestaurant) => {
      if (newRestaurant) {
        fetchReviewsForRestaurant();
      }
    }, { immediate: true });

    const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleDateString();
    };

    return {
      reviews,
      loading,
      formatDate
    };
  }
};
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: var(--card-background); padding: 2em; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1em; margin-bottom: 1em; }
.modal-header h2 { margin: 0; }
.close-btn { background: none; border: none; font-size: 2em; cursor: pointer; color: #777; }
.modal-body { overflow-y: auto; }
.loading-indicator, .no-reviews-message { text-align: center; color: #777; padding: 3em; }
.reviews-list { list-style: none; padding: 0; margin: 0; }
.review-item { border-bottom: 1px solid #eee; padding: 1.5em 0; }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; align-items: center; gap: 1em; margin-bottom: 1em; }
.user-avatar { width: 40px; height: 40px; border-radius: 50%; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 600; }
.review-date { font-size: 0.85em; color: #777; }
.review-body { padding-left: 50px; }
.review-text { margin: 0.5em 0; font-style: italic; }
.review-photo-container { margin-top: 1em; }
.review-photo { max-width: 100%; max-height: 300px; border-radius: 8px; }
.tags-container { margin-top: 1em; display: flex; flex-wrap: wrap; gap: 0.5em; }
.tag { background-color: #ecf0f1; color: var(--secondary-color); padding: 4px 10px; border-radius: 15px; font-size: 0.85em; }
</style>