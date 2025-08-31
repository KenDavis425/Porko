<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Reviews by {{ user.displayName }}</h2>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-indicator">Loading reviews...</div>
        <p v-else-if="reviews.length === 0" class="no-reviews-message">
          This user hasn't posted any reviews yet.
        </p>
        <ul v-else class="reviews-list">
          <li v-for="review in reviews" :key="review.id" class="review-item">
            <div class="review-header">
              <span class="restaurant-name">{{ review.restaurantName }}</span>
              <span class="review-date">{{ formatDate(review.createdAt) }}</span>
            </div>
            <div class="review-body">
              <StarRating :rating="review.rating" />
              <p v-if="review.text" class="review-text">"{{ review.text }}"</p>
              <img v-if="review.photoURL" :src="review.photoURL" alt="Review photo" class="review-photo" />
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
  name: 'UserReviewsModal',
  components: { StarRating },
  props: {
    user: {
      type: Object,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const reviews = ref([]);
    const loading = ref(true);

    const fetchReviews = async () => {
      if (!props.user?.uid) {
        reviews.value = [];
        loading.value = false;
        return;
      }
      loading.value = true;
      reviews.value = [];
      try {
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        const restaurantsMap = new Map();
        restaurantsSnap.forEach(doc => {
          restaurantsMap.set(doc.id, doc.data().name);
        });

        const q = query(
          collection(db, 'reviews'),
          where('userId', '==', props.user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        reviews.value = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            restaurantName: restaurantsMap.get(data.restaurantId) || 'Unknown Restaurant'
          };
        });
      } catch (error) {
        console.error("Error fetching user reviews:", error);
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.user, (newUser) => {
      if (newUser) {
        fetchReviews();
      }
    }, { immediate: true });

    const formatDate = (timestamp) => {
      return timestamp && timestamp.toDate ? timestamp.toDate().toLocaleDateString() : '';
    };

    return { reviews, loading, formatDate };
  }
};
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; padding: 2em; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1em; margin-bottom: 1em; }
.modal-header h2 { margin: 0; font-size: 1.5em; }
.close-btn { background: none; border: none; font-size: 2em; cursor: pointer; line-height: 1; }
.modal-body { overflow-y: auto; }
.loading-indicator, .no-reviews-message { text-align: center; padding: 2em; color: #777; }
.reviews-list { list-style: none; padding: 0; margin: 0; }
.review-item { padding: 1.5em 0; border-bottom: 1px solid #eee; }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1em; }
.restaurant-name { font-weight: 600; font-size: 1.1em; }
.review-date { font-size: 0.9em; color: #777; }
.review-body .star-rating { margin-bottom: 0.5em; }
.review-text { margin: 0.5em 0 0; font-style: italic; color: #333; }
.review-photo { max-width: 100%; border-radius: 8px; margin-top: 1em; }
.tags-container { margin-top: 1em; display: flex; flex-wrap: wrap; gap: 0.5em; }
.tag { background-color: #ecf0f1; color: var(--secondary-color); padding: 4px 10px; border-radius: 15px; font-size: 0.85em; }
</style>