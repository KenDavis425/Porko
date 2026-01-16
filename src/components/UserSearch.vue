<template>
  <UserReviewsModal v-if="isReviewsModalVisible" :user="userForReviews" @close="closeReviewsModal" />
  <div class="user-search-page">
    <div class="search-box">
      <input type="text" v-model="searchQuery" placeholder="Search for users by name..." class="search-input">
    </div>

    <div v-if="loading">Loading users...</div>
    <div v-else>
      <div v-if="filteredUsers.length === 0" class="no-users-message">
        <div v-if="searchQuery">
          <h3>No users found</h3>
          <p>Try adjusting your search terms or check out the Leaderboard to find active reviewers.</p>
        </div>
        <div v-else>
          <h3>No other users yet</h3>
          <p>Be the first to share reviews! Create your first review and invite others to join.</p>
        </div>
      </div>
      <div v-for="user in filteredUsers" :key="user.uid" class="user-card">
        <div class="user-card-content">
          <div class="user-info">
            <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" class="user-avatar" alt="User" />
            <div class="user-details">
              <div class="user-name-line">
                <span class="user-name">{{ user.displayName }}</span>
                <span v-if="user.medal" class="medal">{{ user.medal }}</span>
              </div>
              <div v-if="user.distance !== null" class="user-distance">{{ user.distance.toFixed(1) }} miles away</div>
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
          <button @click="toggleFollow(user)" class="follow-btn" :class="{ 'unfollow-btn': user.isFollowing }">{{ user.isFollowing ? 'Unfollow' : 'Follow' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import StarRating from './StarRating.vue';
import { getDistance } from '../utils/geolocation.js';
import UserReviewsModal from './UserReviewsModal.vue';

export default {
  name: 'UserSearch',
  components: { StarRating, UserReviewsModal },
  setup() {
    const users = ref([]);
    const loading = ref(true);
    const userLocation = ref(null);
    const following = ref([]);
    const searchQuery = ref('');
    const isReviewsModalVisible = ref(false);
    const userForReviews = ref(null);
    const leaderboardRanks = ref(new Map());
    let followsUnsubscribe = () => {};
    
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

    const fetchUsers = async () => {
      loading.value = true;
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Subscribe to real-time updates for the user's follows
      const followsQuery = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
      followsUnsubscribe = onSnapshot(followsQuery, (snapshot) => {
        const newFollowing = snapshot.docs.map(d => d.data().followingId);
        following.value = newFollowing;
        // Update the isFollowing status on the already-loaded users
        users.value = users.value.map(u => ({
          ...u,
          isFollowing: newFollowing.includes(u.uid)
        }));
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

      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      const restaurantsMap = new Map();
      restaurantsSnap.forEach(doc => {
        restaurantsMap.set(doc.id, doc.data());
      });

      // NOTE: This page performs a query for every user to get their last review.
      // This can be inefficient (N+1 problem). For better performance at scale,
      // consider denormalizing the last review data onto the user document.
      const usersQuery = query(collection(db, 'users'), where('uid', '!=', currentUser.uid));
      const usersSnap = await getDocs(usersQuery);
      const allUsers = usersSnap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))

      const usersWithDetails = await Promise.all(
        allUsers.map(async user => {
          const reviewQuery = query(
            collection(db, 'reviews'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const reviewSnap = await getDocs(reviewQuery);
          let lastReview = null;
          let distance = null;

          if (!reviewSnap.empty) {
            const reviewData = reviewSnap.docs[0].data();
            const restaurant = restaurantsMap.get(reviewData.restaurantId);
            lastReview = {
              ...reviewData,
              restaurantName: restaurant?.name || 'Unknown Restaurant'
            };
            
            if (userLocation.value && restaurant?.location) {
              distance = getDistance(
                userLocation.value.lat,
                userLocation.value.lng,
                restaurant.location.lat,
                restaurant.location.lng
              );
            }
          }

          const rank = leaderboardRanks.value.get(user.uid);
          return {
            ...user,
            isFollowing: following.value.includes(user.uid),
            lastReview,
            distance,
            medal: getMedal(rank)
          };
        })
      );

      users.value = usersWithDetails;
      loading.value = false;
    };

    onMounted(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          userLocation.value = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          fetchUsers();
        }, (error) => {
          console.error("Error getting location", error);
          fetchUsers();
        });
      } else {
        console.error("Geolocation is not supported by this browser.");
        fetchUsers();
      }
    });

    onUnmounted(() => {
      followsUnsubscribe();
    });

    const filteredUsers = computed(() => {
      const sorted = [...users.value].sort((a, b) => {
        if (a.distance === null && b.distance !== null) return 1;
        if (a.distance !== null && b.distance === null) return -1;
        if (a.distance === null && b.distance === null) return 0;
        return a.distance - b.distance;
      });

      if (!searchQuery.value.trim()) {
        return sorted;
      }
      const lowerCaseQuery = searchQuery.value.toLowerCase();
      return sorted.filter(user =>
        user.displayName.toLowerCase().includes(lowerCaseQuery)
      );
    });

    const toggleFollow = async (user) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const followsRef = collection(db, 'follows');
      if (user.isFollowing) {
        // Unfollow
        const q = query(followsRef, where('followerId', '==', currentUser.uid), where('followingId', '==', user.uid));
        const followsSnap = await getDocs(q);
        if (!followsSnap.empty) {
          const docId = followsSnap.docs[0].id;
          await deleteDoc(doc(db, 'follows', docId));
        }
      } else {
        // Follow
        await addDoc(followsRef, {
          followerId: currentUser.uid,
          followingId: user.uid,
        });
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

    return { 
      filteredUsers, 
      loading, 
      toggleFollow, 
      searchQuery,
      isReviewsModalVisible,
      userForReviews,
      openReviewsModal,
      closeReviewsModal
    };
  }
};
</script>

<style scoped>
.user-search-page {
  max-width: 800px;
  margin: 0 auto;
}

.search-box {
  margin-bottom: 2em;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  font-size: 1em;
  border-radius: 8px;
  border: 1px solid #ddd;
  box-sizing: border-box;
}

.no-users-message {
  text-align: center;
  color: #777;
  padding: 3em 2em;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}

.no-users-message h3 {
  margin: 0 0 0.5em 0;
  color: var(--text-color);
}

.no-users-message p {
  margin: 0;
  font-size: 0.95em;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-background);
  padding: 1.5em;
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  margin-bottom: 1.5em;
  gap: 1.5em;
}
.user-card-content { flex-grow: 1; min-width: 0; }
.user-info {
  display: flex;
  align-items: center;
  gap: 1em;
  min-width: 0;
}
.user-details {
  min-width: 0;
}
.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  flex-shrink: 0;
}
.user-name-line {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.user-name {
  font-weight: 600;
  font-size: 1.1em;
  word-break: break-word;
}
.medal {
  font-size: 1.1em;
}
.user-distance {
  font-size: 0.9em;
  color: #777;
}
.user-actions {
  display: flex;
  gap: 0.75em;
  align-items: center;
}
.user-actions .action-btn {
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
.user-actions .action-btn:hover {
  background-color: #f0f0f0;
  border-color: #bbb;
}
.user-actions .follow-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}
.user-actions .follow-btn.unfollow-btn {
  background-color: #e74c3c;
}
.user-actions .follow-btn:hover {
  opacity: 0.9;
}
.last-review { margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; min-width: 0; }
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
  .user-card {
    flex-direction: column;
    align-items: stretch;
  }
  .user-actions {
    margin-top: 1em;
  }
  .user-actions button {
    width: 100%;
  }
}
</style>
