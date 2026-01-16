<template>
  <div class="my-reviews-page">
    <div v-if="loading" class="loading-indicator">Loading your reviews...</div>
    <div v-else-if="populatedReviews.length === 0" class="no-reviews-message">
      <h3>You haven't posted any reviews yet.</h3>
      <button @click="$emit('go-to-review')" class="btn-primary">Post your first review!</button>
    </div>
    <div v-else class="feed">
      <div v-for="review in populatedReviews" :key="review.id" class="post-card">
        <div class="post-header">
          <img :src="review.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
          <div class="post-info">
            <div class="user-line">
              <span class="user-name">{{ review.userName }}</span>
              <span v-if="review.medal" class="medal">{{ review.medal }}</span>
            </div>
            <span class="post-date">{{ formatDate(review.createdAt) }}</span>
          </div>
        </div>
        <div class="post-content">
          <div class="post-title-line">
            <div class="restaurant-title-group">
              <h2 class="restaurant-name">{{ review.restaurantName }}</h2>
              <div v-if="editingReviewId !== review.id" class="review-actions">
                <button @click="startEditing(review)" class="action-btn" title="Edit Review">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button @click="deleteReview(review.id)" class="action-btn delete" title="Delete Review">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="review.distance !== null" class="distance">
              {{ review.distance.toFixed(1) }} miles away
            </div>
          </div>
          <div v-if="review.restaurantCity || review.restaurantState" class="restaurant-location">
            {{ review.restaurantCity }}<template v-if="review.restaurantCity && review.restaurantState">, </template>{{ review.restaurantState }}
          </div>
          <div v-if="editingReviewId === review.id" class="edit-review-form">
            <div class="form-group">
              <label>Rating</label>
              <StarRating :rating="editingRating" :editable="true" @update:rating="editingRating = $event" />
            </div>
            <div class="form-group">
              <label>Comment</label>
              <textarea v-model="editingText" class="edit-textarea" rows="4"></textarea>
            </div>
            <div class="edit-actions">
              <button @click="saveEdit" class="btn-primary">Save</button>
              <button @click="cancelEdit" class="btn-secondary">Cancel</button>
            </div>
          </div>
          <div v-else class="review-body">
            <StarRating :rating="review.rating" />
            <p v-if="review.text" class="review-text">"{{ review.text }}"</p>
            <img v-if="review.photoURL" :src="review.photoURL" alt="Review photo" class="review-photo" />
            <div v-if="review.tags && review.tags.length > 0" class="tags-container">
              <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="post-actions">
            <button @click="toggleLike(review.id)" class="like-btn" :class="{ 'liked': review.isLiked }" :disabled="!user">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>{{ review.likeCount || 0 }}</span>
            </button>
            <button @click="shareReview(review.id)" class="share-btn" :title="'Share this review'">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
              </svg>
              <span>Share</span>
            </button>
          </div>
          <Comments :post-id="review.id"
                    :user="user"
                    post-type="reviews"
                    :post-author-id="review.userId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import Comments from './Comments.vue';
import { getDistance } from '../utils/geolocation.js';

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
const editingReviewId = ref(null);
const editingText = ref('');
const editingRating = ref(0);
const userLocation = ref(null);
const leaderboardRanks = ref(new Map());

const getMedal = (index) => {
  // Medals are assigned based on position (0-indexed)
  // Position 1 (index 0): Gold medal 🥇
  // Position 2 (index 1): Silver medal 🥈
  // Position 3 (index 2): Bronze medal 🥉
  // Positions 4-10 (index 3-9): Participation medal 🏅
  if (typeof index !== 'number') return null;
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  if (index >= 3 && index < 10) return '🏅';
  return null;
};

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
    reviews.value = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      likeCount: 0,
      isLiked: false
    }));
    loading.value = false;
    
    // Set up like listeners for each review
    reviews.value.forEach(review => {
      setupLikeListener(review.id);
    });
  }, (error) => {
    console.error("Error fetching reviews:", error);
    loading.value = false;
  });
};

const setupLikeListener = (reviewId) => {
  const currentUser = props.user;
  const reviewRef = doc(db, 'reviews', reviewId);
  const likesCollection = collection(reviewRef, 'likes');
  const likesQuery = query(likesCollection);
  
  onSnapshot(likesQuery, (snapshot) => {
    const review = reviews.value.find(r => r.id === reviewId);
    if (review) {
      review.likeCount = snapshot.size;
      review.isLiked = currentUser ? snapshot.docs.some(doc => doc.data().userId === currentUser.uid) : false;
    }
  }, (error) => {
    console.error('Error fetching likes:', error);
  });
};

const toggleLike = async (reviewId) => {
  const currentUser = props.user;
  if (!currentUser) return;
  
  const reviewRef = doc(db, 'reviews', reviewId);
  const likesCollection = collection(reviewRef, 'likes');
  const likeQuery = query(likesCollection, where('userId', '==', currentUser.uid));
  const likeSnap = await getDocs(likeQuery);
  
  if (!likeSnap.empty) {
    // Unlike - delete the like document
    await deleteDoc(likeSnap.docs[0].ref);
  } else {
    // Like - create a like document
    await addDoc(likesCollection, {
      userId: currentUser.uid,
      createdAt: serverTimestamp()
    });
  }
};

const shareReview = async (reviewId) => {
  const baseUrl = window.location.origin;
  const shareableLink = `${baseUrl}/#review/${reviewId}`;
  
  // Try Web Share API first (mobile-friendly)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Check out this review on PorkHub',
        text: 'Check out this review on PorkHub',
        url: shareableLink
      });
      return;
    } catch (err) {
      // User cancelled or error - fall through to copy
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  }
  
  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(shareableLink);
    alert('Link copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy link:', err);
    // Fallback: Show link in prompt
    prompt('Copy this link:', shareableLink);
  }
};

onMounted(() => {
  // Get user location if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    }, (error) => {
      console.error("Error getting location", error);
    });
  }

  // Fetch leaderboard ranks
  getDocs(query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(30))).then(leaderboardSnap => {
    const usersWithReviews = leaderboardSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        const count = Number(user.reviewCount) || 0;
        return count > 0;
      })
      .sort((a, b) => {
        const countA = Number(a.reviewCount) || 0;
        const countB = Number(b.reviewCount) || 0;
        return countB - countA;
      })
      .slice(0, 10);
    
    const ranks = new Map();
    usersWithReviews.forEach((user, index) => {
      ranks.set(user.id, index);
    });
    leaderboardRanks.value = ranks;
  });

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
  const currentUser = props.user;
  return reviews.value.map(review => {
    const restaurant = restaurantsMap.value.get(review.restaurantId);
    const rank = leaderboardRanks.value.get(currentUser?.uid);
    return {
      ...review,
      restaurantName: restaurant?.name || "Unknown Restaurant",
      restaurantCity: restaurant?.city,
      restaurantState: restaurant?.state,
      userName: currentUser?.displayName || 'You',
      userPhoto: currentUser?.photoURL || null,
      distance: userLocation.value && restaurant?.location ? getDistance(userLocation.value.lat, userLocation.value.lng, restaurant.location.lat, restaurant.location.lng) : null,
      medal: getMedal(rank)
    };
  });
});

const formatDate = (timestamp) => {
  return timestamp && timestamp.toDate ? timestamp.toDate().toLocaleString() : '';
};

const startEditing = (review) => {
  editingReviewId.value = review.id;
  editingText.value = review.text || '';
  editingRating.value = review.rating || 0;
};

const cancelEdit = () => {
  editingReviewId.value = null;
  editingText.value = '';
  editingRating.value = 0;
};

const saveEdit = async () => {
  if (!editingReviewId.value) return;
  
  try {
    const reviewRef = doc(db, 'reviews', editingReviewId.value);
    await updateDoc(reviewRef, {
      rating: editingRating.value,
      text: editingText.value,
      lastActivityAt: serverTimestamp() // Update lastActivityAt when editing
    });
    cancelEdit();
  } catch (error) {
    console.error('Error updating review:', error);
    alert('Failed to save review. Please try again.');
  }
};

const deleteReview = async (reviewId) => {
  if (!confirm('Are you sure you want to delete this review?')) return;
  
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('Failed to delete review. Please try again.');
  }
};
</script>

<style scoped>
.my-reviews-page {
  max-width: 800px;
  margin: 0 auto;
}

.loading-indicator, .no-reviews-message {
  text-align: center;
  color: #777;
  padding: 3em;
}

.no-reviews-message h3 {
  margin-bottom: 0.5em;
}

.btn-primary {
  margin-top: 1em;
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.post-card {
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  margin-bottom: 2em;
  overflow: hidden;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 1em;
  padding: 1em 1.5em;
  border-bottom: 1px solid #eee;
}

.user-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
}

.post-info {
  display: flex;
  flex-direction: column;
}

.user-line {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.user-name {
  font-weight: 600;
}

.medal {
  font-size: 1.1em;
}

.post-date {
  color: #7f8c8d;
  font-size: 0.85em;
}

.post-content {
  padding: 0.5em 1.5em 1.5em;
}

.post-title-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25em;
}

.restaurant-title-group {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.restaurant-name {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0;
}

.review-actions {
  display: flex;
  gap: 0.25em;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: #555;
  transition: color 0.2s;
}

.action-btn:hover {
  color: var(--primary-color);
}

.action-btn.delete:hover {
  color: #e74c3c;
}

.distance {
  font-size: 0.9em;
  color: #777;
  font-style: italic;
}

.restaurant-location {
  font-size: 0.9em;
  color: #777;
  margin-bottom: 0.75em;
}

.review-body {
  margin-bottom: 1em;
}

.review-text {
  font-style: italic;
  color: #333;
  margin: 0.5em 0;
}

.review-photo {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5em 0;
}

.tags-container {
  margin-top: 0.75em;
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

.edit-review-form {
  margin-top: 0.5em;
  padding: 1em;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1em;
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.edit-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 1em;
  resize: vertical;
}

.edit-actions {
  display: flex;
  gap: 0.5em;
  margin-top: 1em;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #555;
}

.btn-secondary:hover {
  background-color: #dfe6e9;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5em;
  padding-top: 0.5em;
  margin-bottom: 0;
  padding-bottom: 0;
  border-top: 1px solid #eee;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5em 0.75em;
  border-radius: 8px;
  color: #555;
  transition: all 0.2s;
}

.like-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.like-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.like-btn.liked {
  color: #e74c3c;
}

.like-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5em 0.75em;
  border-radius: 8px;
  color: #555;
  transition: all 0.2s;
}

.share-btn:hover {
  background-color: #f0f0f0;
}

.share-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>