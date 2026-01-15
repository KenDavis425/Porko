<template>
  <div class="my-reviews-page">
    <h2>My Reviews</h2>
    <div v-if="loading" class="loading-indicator">Loading your reviews...</div>
    <div v-else-if="populatedReviews.length === 0" class="no-reviews-message">
      <p>You haven't posted any reviews yet.</p>
      <button @click="$emit('go-to-review')">Post your first review!</button>
    </div>
    <div v-else class="reviews-list">
      <div v-for="review in populatedReviews" :key="review.id" class="review-card">
        <div class="card-header">
          <span class="restaurant-name">{{ review.restaurantName }}</span>
          <span class="review-date">{{ formatDate(review.createdAt) }}</span>
        </div>
        <div v-if="review.photoURL" class="photo-container">
          <img :src="review.photoURL" alt="Review photo" class="check-in-photo" />
        </div>
        <div class="card-body">
          <div class="rating-display">
            <StarRating :rating="review.rating" />
          </div>
          <p v-if="review.text" class="comment-text">"{{ review.text }}"</p>
          <div v-if="review.tags && review.tags.length > 0" class="tags-container">
            <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="card-actions">
          <!-- Edit and Delete functionality can be added here -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import StarRating from './StarRating.vue';

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
});

defineEmits(['go-to-review']);

const loading = ref(true);
const reviews = ref([]);
const restaurantsMap = ref(new Map());

let reviewsUnsubscribe = () => {};
let restaurantsUnsubscribe = () => {};

const setupListeners = (currentUser) => {
  if (!currentUser) {
    reviews.value = [];
    loading.value = false;
    if (reviewsUnsubscribe) reviewsUnsubscribe();
    return;
  }

  loading.value = true;

  // Real-time listener for the user's reviews
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  reviewsUnsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
    reviews.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    loading.value = false;
  }, (error) => {
    console.error("Error fetching reviews:", error);
    loading.value = false;
  });
};

onMounted(() => {
  // Real-time listener for all restaurants to get their names
  restaurantsUnsubscribe = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
    const newMap = new Map();
    snapshot.forEach(doc => {
      newMap.set(doc.id, doc.data());
    });
    restaurantsMap.value = newMap;
  });

  // Watch for user prop changes to set up or tear down listeners
  watch(() => props.user, (newUser) => {
    setupListeners(newUser);
  }, { immediate: true });
});

onUnmounted(() => {
  if (reviewsUnsubscribe) reviewsUnsubscribe();
  if (restaurantsUnsubscribe) restaurantsUnsubscribe();
});

const populatedReviews = computed(() => {
  return reviews.value.map(review => ({
    ...review,
    restaurantName: restaurantsMap.value.get(review.restaurantId)?.name || "Unknown Restaurant"
  }));
});

const formatDate = (timestamp) => {
  return timestamp && timestamp.toDate ? timestamp.toDate().toLocaleDateString() : '';
};
</script>

<style scoped>
.my-reviews-page {
  padding: 1em;
}
h2 {
  margin-bottom: 1em;
}
.loading-indicator, .no-reviews-message {
  text-align: center;
  color: #777;
  padding: 3em;
}
.no-reviews-message button {
  margin-top: 1em;
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.reviews-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5em;
}
.review-card {
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card-header {
  padding: 1em;
  border-bottom: 1px solid #eee;
}
.restaurant-name {
  font-weight: 600;
  font-size: 1.1em;
}
.review-date {
  font-size: 0.8em;
  color: #777;
}
.photo-container {
  width: 100%;
  max-height: 250px;
  overflow: hidden;
}
.check-in-photo {
  width: 100%;
  height: auto;
  object-fit: cover;
}
.card-body {
  padding: 1em;
  flex-grow: 1;
}
.rating-display {
  margin-bottom: 0.5em;
}
.comment-text {
  font-style: italic;
  color: #333;
}
.tags-container {
  margin-top: 1em;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}
.tag {
  background-color: #eee;
  padding: 0.25em 0.75em;
  border-radius: 15px;
  font-size: 0.8em;
}
.card-actions {
  padding: 0.5em 1em;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  padding: 5px;
}
</style>