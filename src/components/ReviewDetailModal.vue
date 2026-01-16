<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Review</h2>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-indicator">Loading review...</div>
        <div v-else-if="error" class="error-message">{{ error }}</div>
        <div v-else-if="review" class="review-detail">
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
              <h2 class="restaurant-name">{{ review.restaurantName }}</h2>
              <div v-if="review.distance !== null" class="distance">
                {{ review.distance.toFixed(1) }} miles away
              </div>
            </div>
            <div v-if="review.restaurantCity || review.restaurantState" class="restaurant-location">
              {{ review.restaurantCity }}<template v-if="review.restaurantCity && review.restaurantState">, </template>{{ review.restaurantState }}
            </div>
            <div class="review-body">
              <StarRating :rating="review.rating" />
              <p v-if="review.text" class="review-text">"{{ review.text }}"</p>
              <img v-if="review.photoURL" :src="review.photoURL" alt="Review photo" class="review-photo" />
              <div v-if="review.tags && review.tags.length > 0" class="tags-container">
                <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="post-actions">
              <button @click="toggleLike" class="like-btn" :class="{ 'liked': review.isLiked }" :disabled="!user">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>{{ review.likeCount || 0 }}</span>
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
  </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { db } from '../firebase';
import { doc, getDoc, collection, query, onSnapshot, addDoc, deleteDoc, getDocs, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import Comments from './Comments.vue';
import { getDistance } from '../utils/geolocation.js';
import { updateMetaTags, resetMetaTags } from '../utils/meta.js';

export default {
  name: 'ReviewDetailModal',
  components: { StarRating, Comments },
  props: {
    reviewId: {
      type: String,
      required: true
    },
    user: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  setup(props) {
    const review = ref(null);
    const loading = ref(true);
    const error = ref('');
    const restaurantsMap = ref(new Map());
    const leaderboardRanks = ref(new Map());
    const userLocation = ref(null);
    let likeUnsubscribe = () => {};

    const getMedal = (index) => {
      if (typeof index !== 'number') return null;
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index >= 3 && index < 10) return '🏅';
      return null;
    };

    const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleString();
    };

    const fetchReview = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        // Fetch restaurant data
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        restaurantsSnap.forEach(doc => {
          restaurantsMap.value.set(doc.id, doc.data());
        });

        // Fetch leaderboard ranks
        const leaderboardSnap = await getDocs(query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(30)));
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

        // Get user location for distance calculation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            userLocation.value = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            updateReviewDistance();
          }, () => {
            // Ignore location errors
          });
        }

        // Fetch the review
        const reviewRef = doc(db, 'reviews', props.reviewId);
        const reviewSnap = await getDoc(reviewRef);
        
        if (!reviewSnap.exists()) {
          error.value = 'Review not found.';
          loading.value = false;
          return;
        }

        const reviewData = { id: reviewSnap.id, ...reviewSnap.data() };
        const restaurant = restaurantsMap.value.get(reviewData.restaurantId);
        const rank = leaderboardRanks.value.get(reviewData.userId);

        review.value = {
          ...reviewData,
          restaurantName: restaurant?.name || 'Unknown Restaurant',
          restaurantCity: restaurant?.city,
          restaurantState: restaurant?.state,
          location: restaurant?.location || null,
          distance: null, // Will be updated if location available
          medal: getMedal(rank),
          likeCount: 0,
          isLiked: false
        };

        updateReviewDistance();

        // Set up like listener
        setupLikeListener();

        // Update meta tags for social media sharing
        // Use clean URL format for better social media previews
        const shareUrl = `${window.location.origin}/review/${review.value.id}`;
        const shareTitle = `${review.value.userName}'s Review of ${review.value.restaurantName}`;
        const shareDescription = review.value.text 
          ? `"${review.value.text.substring(0, 150)}${review.value.text.length > 150 ? '...' : ''}"` 
          : `${review.value.userName} rated ${review.value.restaurantName} ${review.value.rating} stars`;
        const shareImage = review.value.photoURL || '';

        updateMetaTags({
          title: shareTitle,
          description: shareDescription,
          image: shareImage,
          url: shareUrl,
          type: 'article'
        });

      } catch (err) {
        console.error('Error fetching review:', err);
        error.value = 'Failed to load review. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    const updateReviewDistance = () => {
      if (review.value && userLocation.value && review.value.location) {
        review.value.distance = getDistance(
          userLocation.value.lat,
          userLocation.value.lng,
          review.value.location.lat,
          review.value.location.lng
        );
      }
    };

    const setupLikeListener = () => {
      if (!review.value) return;
      
      const reviewRef = doc(db, 'reviews', review.value.id);
      const likesCollection = collection(reviewRef, 'likes');
      const likesQuery = query(likesCollection);
      
      likeUnsubscribe = onSnapshot(likesQuery, (snapshot) => {
        if (review.value) {
          review.value.likeCount = snapshot.size;
          review.value.isLiked = props.user ? snapshot.docs.some(doc => doc.data().userId === props.user.uid) : false;
        }
      }, (err) => {
        console.error('Error fetching likes:', err);
      });
    };

    const toggleLike = async () => {
      if (!props.user || !review.value) return;
      
      const reviewRef = doc(db, 'reviews', review.value.id);
      const likesCollection = collection(reviewRef, 'likes');
      const likeQuery = query(likesCollection, where('userId', '==', props.user.uid));
      const likeSnap = await getDocs(likeQuery);
      
      if (!likeSnap.empty) {
        await deleteDoc(likeSnap.docs[0].ref);
      } else {
        await addDoc(likesCollection, {
          userId: props.user.uid,
          createdAt: serverTimestamp()
        });
      }
    };

    watch(() => props.reviewId, () => {
      if (props.reviewId) {
        if (likeUnsubscribe) likeUnsubscribe();
        fetchReview();
      } else {
        resetMetaTags();
      }
    }, { immediate: true });

    onMounted(() => {
      if (props.reviewId) {
        fetchReview();
      }
    });

    onUnmounted(() => {
      resetMetaTags();
      if (likeUnsubscribe) {
        likeUnsubscribe();
      }
    });

    return {
      review,
      loading,
      error,
      formatDate,
      toggleLike
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-background);
  padding: 2em;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 1em;
  margin-bottom: 1em;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2em;
  cursor: pointer;
  color: #777;
}

.modal-body {
  overflow-y: auto;
}

.loading-indicator, .error-message {
  text-align: center;
  color: #777;
  padding: 3em;
}

.error-message {
  color: #e74c3c;
}

.review-detail {
  max-width: 100%;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 1em;
  padding: 1em 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 1em;
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
  padding: 0.5em 0;
}

.post-title-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25em;
}

.restaurant-name {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0;
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

.post-actions {
  display: flex;
  gap: 1em;
  margin-top: 0.75em;
  padding-top: 0.75em;
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
</style>
