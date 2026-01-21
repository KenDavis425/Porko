<template>
  <UserReviewsModal v-if="isReviewsModalVisible" :user="userForReviews" @close="closeReviewsModal" />
  <div class="followers-page">
    <div v-if="loading" class="loading-indicator">Loading followers...</div>
    <div v-else>
      <div v-if="followers.length === 0" class="no-followers-message">
        <h3>No followers yet</h3>
        <p>Start sharing reviews to attract followers! The more you review, the more visible you'll be.</p>
      </div>
      <div v-for="user in followers" :key="user.uid" class="user-card">
        <div class="user-card-content">
          <div class="user-info">
            <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" class="user-avatar" alt="User" referrerpolicy="no-referrer" />
            <div class="user-name-line">
              <span class="user-name">{{ user.displayName }}</span>
              <BadgeDisplay v-if="user.earnedBadges && user.earnedBadges.length > 0" :badges="user.earnedBadges" :title="''" class="user-card-badges" />
              <span v-if="user.medal" class="medal">{{ user.medal }}</span>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import UserReviewsModal from './UserReviewsModal.vue';
import StarRating from './StarRating.vue';
import BadgeDisplay from './BadgeDisplay.vue';
import { calculateEarnedBadges, formatUserStats } from '../utils/badges.js';

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

export default {
  name: 'Followers',
  components: { UserReviewsModal, StarRating, BadgeDisplay },
  setup() {
    const followers = ref([]);
    const loading = ref(true);
    const isReviewsModalVisible = ref(false);
    const userForReviews = ref(null);
    const leaderboardRanks = ref(new Map());

    const loadUserBadges = async (userId) => {
      try {
        const userReviewsSnap = await getDocs(query(collection(db, 'reviews'), where('userId', '==', userId)));
        const userReviews = userReviewsSnap.docs.map(doc => doc.data());
        
        const allReviewsSnap = await getDocs(collection(db, 'reviews'));
        const restaurantReviews = allReviewsSnap.docs.map(doc => doc.data());
        
        const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
        let userDoc = null;
        if (!userDocSnap.empty) {
          userDoc = userDocSnap.docs[0].data();
        }
        
        if (userDoc) {
          const userStats = formatUserStats(userDoc, userReviews, restaurantReviews);
          const badgeIds = calculateEarnedBadges(userStats);
          return badgeIds;
        }
        return [];
      } catch (error) {
        console.error('Error loading user badges:', error);
        return [];
      }
    };

    const fetchFollowers = async () => {
      loading.value = true;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        loading.value = false;
        return;
      }

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

      const followsQuery = query(collection(db, 'follows'), where('followingId', '==', currentUser.uid));
      const followsSnap = await getDocs(followsQuery);
      const followerIds = followsSnap.docs.map(doc => doc.data().followerId);

      if (followerIds.length === 0) {
        followers.value = [];
        loading.value = false;
        return;
      }
      
      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      const restaurantsMap = new Map();
      restaurantsSnap.forEach(doc => {
        restaurantsMap.set(doc.id, doc.data().name);
      });

      const usersData = [];
      for (let i = 0; i < followerIds.length; i += 30) {
        const batchIds = followerIds.slice(i, i + 30);
        if (batchIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', batchIds));
            const usersSnap = await getDocs(usersQuery);
            usersSnap.forEach(doc => {
                usersData.push({ uid: doc.id, ...doc.data() });
            });
        }
      }

      const followersWithDetails = await Promise.all(
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
          const rank = leaderboardRanks.value.get(user.uid);
          const badges = await loadUserBadges(user.uid);
          return { ...user, lastReview, medal: getMedal(rank), earnedBadges: badges };
        })
      );

      followers.value = followersWithDetails;
      loading.value = false;
    };

    onMounted(fetchFollowers);

    const openReviewsModal = (user) => {
      userForReviews.value = user;
      isReviewsModalVisible.value = true;
    };

    const closeReviewsModal = () => {
      isReviewsModalVisible.value = false;
      userForReviews.value = null;
    };

    return { followers, loading, isReviewsModalVisible, userForReviews, openReviewsModal, closeReviewsModal };
  }
};
</script>

<style scoped>
.followers-page { max-width: 800px; margin: 0 auto; }
.loading-indicator, .no-followers-message { 
  text-align: center; 
  color: #777; 
  padding: 3em 2em;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}

.no-followers-message h3 {
  margin: 0 0 0.5em 0;
  color: var(--text-color);
}

.no-followers-message p {
  margin: 0;
  font-size: 0.95em;
}
.user-card { display: flex; align-items: center; justify-content: space-between; background: var(--card-background); padding: 1.5em; border-radius: 12px; box-shadow: 0 4px 15px var(--shadow-color); margin-bottom: 1.5em; gap: 1.5em; }
.user-card-content { flex-grow: 1; }
.user-info { display: flex; align-items: center; gap: 1em; }
.user-avatar { width: 60px; height: 60px; border-radius: 50%; }
.user-name-line {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.user-name { font-weight: 600; font-size: 1.1em; }
.user-card-badges {
  display: flex;
  gap: 2px;
}
.user-card-badges :deep(.badge) {
  font-size: 0.75em;
  width: 16px;
  height: 16px;
}
.medal {
  font-size: 1.1em;
}
.user-actions .action-btn { background: none; border: 1px solid #ccc; border-radius: 8px; padding: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #555; }
.user-actions .action-btn:hover { background-color: #f0f0f0; border-color: #bbb; }
.last-review { margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; }
.review-header { margin-bottom: 0.5em; color: #555; }
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
    align-self: stretch;
  }
  .user-actions .action-btn {
    width: 100%;
  }
}
</style>