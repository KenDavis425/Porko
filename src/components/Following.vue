<template>
  <UserReviewsModal v-if="isReviewsModalVisible" :user="userForReviews" @close="closeReviewsModal" />
  <div class="following-page">
    <div v-if="loading" class="loading-indicator">Loading users you follow...</div>
    <div v-else>
      <div v-if="following.length === 0" class="no-users-message">
        <span>You are not following anyone yet.</span>
      </div>
      <div v-for="user in following" :key="user.uid" class="user-card">
        <div class="user-card-content">
          <div class="user-info">
            <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" class="user-avatar" alt="User" referrerpolicy="no-referrer" />
            <div class="user-details">
              <span class="user-name">{{ user.displayName }}</span>
            </div>
          </div>
          <div v-if="user.lastReview" class="last-review">
            <div class="review-header">
              Latest review: <strong>{{ user.lastReview.restaurantName }}</strong>
            </div>
            <div class="review-body">
              <StarRating :rating="user.lastReview.rating" />
              <p v-if="user.lastReview.text" class="review-text">"{{ user.lastReview.text }}"</p>
            </div>
          </div>
          <div v-else class="last-review no-review">
            No reviews yet.
          </div>
        </div>
        <div class="user-actions">
          <button @click="openReviewsModal(user)" class="action-btn" title="View Reviews">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
          </button>
          <button @click="unfollowUser(user)" class="unfollow-btn">Unfollow</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import UserReviewsModal from './UserReviewsModal.vue';

export default {
  name: 'Following',
  components: { StarRating, UserReviewsModal },
  setup() {
    const following = ref([]);
    const loading = ref(true);
    const isReviewsModalVisible = ref(false);
    const userForReviews = ref(null);
    let unsubscribe = () => {};

    const fetchFollowing = async () => {
      loading.value = true;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        loading.value = false;
        return;
      }

      const followsQuery = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));      
      unsubscribe = onSnapshot(followsQuery, async (followsSnap) => {
        const followingIds = followsSnap.docs.map(doc => doc.data().followingId);

      if (followingIds.length === 0) {
        following.value = [];
        loading.value = false;
        return;
      }

      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      const restaurantsMap = new Map();
      restaurantsSnap.forEach(doc => {
        restaurantsMap.set(doc.id, doc.data().name);
      });

      const usersData = [];
      // Firestore 'in' query supports a maximum of 30 elements in the array.
      for (let i = 0; i < followingIds.length; i += 30) {
        const batchIds = followingIds.slice(i, i + 30);
        if (batchIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', batchIds));
            const usersSnap = await getDocs(usersQuery);
            usersSnap.forEach(doc => {
                usersData.push({ uid: doc.id, ...doc.data() });
            });
        }
      }

      const followingWithDetails = await Promise.all(
        usersData.map(async user => {
          const reviewQuery = query(
            collection(db, 'reviews'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const reviewSnap = await getDocs(reviewQuery);
          let lastReview = null;
          if (!reviewSnap.empty) {
            const reviewData = reviewSnap.docs[0].data();
            lastReview = {
              ...reviewData,
              restaurantName: restaurantsMap.get(reviewData.restaurantId) || 'Unknown Restaurant'
            };
          }
          return { ...user, lastReview };
        })
      );

      following.value = followingWithDetails;
      loading.value = false;
      });
    };

    onMounted(fetchFollowing);
    onUnmounted(() => unsubscribe());

    const unfollowUser = async (userToUnfollow) => {
      const currentUser = auth.currentUser;
      if (!currentUser || !window.confirm(`Are you sure you want to unfollow ${userToUnfollow.displayName}?`)) return;

      try {
        const q = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid), where('followingId', '==', userToUnfollow.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await deleteDoc(doc(db, 'follows', docId));
        }
      } catch (error) {
        console.error("Error unfollowing user:", error);
        alert("Failed to unfollow user. Please try again.");
      }
    };

    const openReviewsModal = (user) => {
      userForReviews.value = user;
      isReviewsModalVisible.value = true;
    };

    const closeReviewsModal = () => {
      isReviewsModalVisible.value = false;
      userForReviews.value = null;
    };

    return { following, loading, unfollowUser, isReviewsModalVisible, userForReviews, openReviewsModal, closeReviewsModal };
  }
};
</script>

<style scoped>
.following-page { max-width: 800px; margin: 0 auto; }
.loading-indicator, .no-users-message { text-align: center; color: #777; padding: 2em; }
.user-card { display: flex; align-items: center; justify-content: space-between; background: var(--card-background); padding: 1.5em; border-radius: 12px; box-shadow: 0 4px 15px var(--shadow-color); margin-bottom: 1.5em; gap: 1.5em; }
.user-card-content { flex-grow: 1; min-width: 0; }
.user-info { display: flex; align-items: center; gap: 1em; min-width: 0; }
.user-details { min-width: 0; }
.user-avatar { width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0; }
.user-name { font-weight: 600; font-size: 1.1em; word-break: break-word; }
.user-actions { display: flex; gap: 0.75em; }
.user-actions .action-btn { background: none; border: 1px solid #ccc; border-radius: 8px; padding: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #555; }
.user-actions .action-btn:hover { background-color: #f0f0f0; border-color: #bbb; }
.user-actions button.unfollow-btn { background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: background-color 0.2s; }
.user-actions button.unfollow-btn:hover { opacity: 0.9; }
.last-review { margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; }
.review-header { margin-bottom: 0.5em; color: #555; word-break: break-word; }
.review-body .star-rating { margin-bottom: 0.5em; }
.review-text {
  margin: 0.5em 0 0;
  font-style: italic;
  color: #333;
  word-break: break-word;
}
.no-review { color: #888; font-style: italic; }

@media (max-width: 768px) {
  .user-card { flex-direction: column; align-items: stretch; }
  .user-actions { margin-top: 1em; }
  .user-actions button { flex-grow: 1; justify-content: center; }
}
</style>