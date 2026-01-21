<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <h2>Leaderboard</h2>
      <p>Rankings and stats</p>
    </div>

    <!-- Tabs for different leaderboard types -->
    <div class="leaderboard-tabs">
      <button @click="activeTab = 'reviews'" :class="{ active: activeTab === 'reviews' }">
        📝 Top Reviewers
      </button>
      <button @click="activeTab = 'commenters'" :class="{ active: activeTab === 'commenters' }">
        💬 Top Commenters
      </button>
      <button @click="activeTab = 'regional'" :class="{ active: activeTab === 'regional' }">
        🗺️ By State
      </button>
    </div>

    <!-- Reviews Leaderboard -->
    <div v-if="activeTab === 'reviews'" class="tab-content">
      <div v-if="loading" class="loading-indicator">Loading leaderboard...</div>
      <div v-else-if="users.length === 0" class="no-users-message">
        <p>No users to display on the leaderboard yet.</p>
      </div>
      <ol v-else class="leaderboard-list">
        <li v-for="(user, index) in users" :key="user.uid" class="leaderboard-item" :class="getRankClass(index)">
          <div class="rank-container">
            <span class="rank">{{ index + 1 }}</span>
            <span v-if="getMedal(index)" class="medal">{{ getMedal(index) }}</span>
          </div>
          <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
          <div class="user-info">
            <div class="user-name-line">
              <span class="user-name">{{ user.displayName }}</span>
              <BadgeDisplay v-if="user.earnedBadges && user.earnedBadges.length > 0" :badges="user.earnedBadges" :title="''" class="leaderboard-badges" />
            </div>
            <span class="review-count">{{ user.reviewCount || 0 }} reviews</span>
          </div>
        </li>
      </ol>
    </div>

    <!-- Commenters Leaderboard -->
    <div v-else-if="activeTab === 'commenters'" class="tab-content">
      <div v-if="loadingCommenters" class="loading-indicator">Loading commenters...</div>
      <div v-else-if="commenters.length === 0" class="no-users-message">
        <p>No users have left comments yet.</p>
      </div>
      <ol v-else class="leaderboard-list">
        <li v-for="(user, index) in commenters" :key="user.uid" class="leaderboard-item">
          <div class="rank-container">
            <span class="rank">{{ index + 1 }}</span>
            <span v-if="index < 3" class="medal">{{ ['🥇', '🥈', '🥉'][index] }}</span>
          </div>
          <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
          <div class="user-info">
            <div class="user-name-line">
              <span class="user-name">{{ user.displayName }}</span>
              <BadgeDisplay v-if="user.earnedBadges && user.earnedBadges.length > 0" :badges="user.earnedBadges" :title="''" class="leaderboard-badges" />
            </div>
            <span class="review-count">{{ user.commentCount || 0 }} comments</span>
          </div>
        </li>
      </ol>
    </div>

    <!-- Regional Leaderboard -->
    <div v-else-if="activeTab === 'regional'" class="tab-content">
      <div class="state-filter">
        <label for="state-select">Filter by state:</label>
        <select v-model="selectedState" id="state-select">
          <option value="">All States</option>
          <option v-for="state in statesList" :key="state" :value="state">
            {{ state }}
          </option>
        </select>
      </div>

      <div v-if="loadingRegional" class="loading-indicator">Loading regional leaderboard...</div>
      <div v-else-if="regionalLeaderboard.length === 0" class="no-users-message">
        <p v-if="selectedState">
          No reviews in {{ selectedState }} yet.
        </p>
        <p v-else>No regional data available.</p>
      </div>
      <ol v-else class="leaderboard-list">
        <li v-for="(user, index) in regionalLeaderboard" :key="user.uid + selectedState" class="leaderboard-item">
          <div class="rank-container">
            <span class="rank">{{ index + 1 }}</span>
            <span v-if="index < 3" class="medal">{{ ['🥇', '🥈', '🥉'][index] }}</span>
          </div>
          <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
          <div class="user-info">
            <div class="user-name-line">
              <span class="user-name">{{ user.displayName }}</span>
              <BadgeDisplay v-if="user.earnedBadges && user.earnedBadges.length > 0" :badges="user.earnedBadges" :title="''" class="leaderboard-badges" />
            </div>
            <span class="review-count">{{ user.reviewCount }} reviews</span>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot } from 'firebase/firestore';
import BadgeDisplay from './BadgeDisplay.vue';
import { calculateEarnedBadges, formatUserStats } from '../utils/badges.js';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default {
  name: 'Leaderboard',
  components: { BadgeDisplay },
  setup() {
    const loading = ref(true);
    const loadingCommenters = ref(true);
    const loadingRegional = ref(true);
    const users = ref([]);
    const commenters = ref([]);
    const regionalLeaderboard = ref([]);
    const activeTab = ref('reviews');
    const selectedState = ref('');
    const statesList = ref(US_STATES);
    let unsubscribe = () => {};

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

    onMounted(() => {
      loadTopReviewers();
      loadTopCommenters();
      loadRegionalData();
    });

    const loadTopReviewers = () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('reviewCount', 'desc'),
          limit(30)
        );
        
        unsubscribe = onSnapshot(usersQuery, async (querySnapshot) => {
          const fetchedUsers = querySnapshot.docs.map(doc => doc.data());
          
          const usersWithReviews = fetchedUsers.filter(user => {
            const count = Number(user.reviewCount) || 0;
            return count > 0;
          });
          
          const sortedUsers = usersWithReviews.sort((a, b) => {
            const countA = Number(a.reviewCount) || 0;
            const countB = Number(b.reviewCount) || 0;
            return countB - countA;
          });
          
          // Load badges for each user
          const usersWithBadges = await Promise.all(
            sortedUsers.slice(0, 10).map(async (user) => {
              const badges = await loadUserBadges(user.uid);
              return { ...user, earnedBadges: badges };
            })
          );
          
          users.value = usersWithBadges;
          loading.value = false;
        }, (error) => {
          console.error("Error fetching leaderboard:", error);
          loading.value = false;
        });

      } catch (error) {
        console.error("Error setting up leaderboard listener:", error);
        loading.value = false;
      }
    };

    const loadTopCommenters = async () => {
      try {
        // Get all reviews to access comment subcollections
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const commentCountMap = {};
        
        // Fetch comments from all review subcollections
        for (const reviewDoc of reviewsSnap.docs) {
          try {
            const commentsSnap = await getDocs(collection(db, 'reviews', reviewDoc.id, 'comments'));
            commentsSnap.docs.forEach(commentDoc => {
              const data = commentDoc.data();
              if (data.userId) {
                commentCountMap[data.userId] = (commentCountMap[data.userId] || 0) + 1;
              }
            });
          } catch (error) {
            // Skip reviews that may not have comments subcollection
            console.debug(`No comments for review ${reviewDoc.id}`);
          }
        }

        // Get user details for comment authors
        const usersSnap = await getDocs(collection(db, 'users'));
        const userMap = {};
        usersSnap.docs.forEach(doc => {
          userMap[doc.id] = doc.data();
        });

        // Create leaderboard from comment counts
        const topCommenters = await Promise.all(
          Object.entries(commentCountMap)
            .map(([userId, count]) => ({
              ...userMap[userId],
              uid: userId,
              commentCount: count
            }))
            .filter(user => user.displayName) // Only include users with valid data
            .sort((a, b) => b.commentCount - a.commentCount)
            .slice(0, 10)
            .map(async (user) => {
              const badges = await loadUserBadges(user.uid);
              return { ...user, earnedBadges: badges };
            })
        );

        commenters.value = topCommenters;
        loadingCommenters.value = false;
      } catch (error) {
        console.error("Error loading commenters:", error);
        loadingCommenters.value = false;
      }
    };

    const loadRegionalData = async () => {
      try {
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        
        // Map restaurants to states
        const restaurantStateMap = {};
        restaurantsSnap.docs.forEach(doc => {
          const data = doc.data();
          restaurantStateMap[doc.id] = data.state?.toUpperCase();
        });
        
        console.log('Restaurant State Map:', restaurantStateMap);
        console.log('Total restaurants:', Object.keys(restaurantStateMap).length);
        console.log('Restaurants with states:', Object.values(restaurantStateMap).filter(s => s).length);

        // Count reviews per user per state
        const reviewsByUserState = {};
        const usersSnap = await getDocs(collection(db, 'users'));
        const userMap = {};
        
        usersSnap.docs.forEach(doc => {
          userMap[doc.id] = doc.data();
        });

        let reviewsWithStates = 0;
        let reviewsWithoutStates = 0;
        
        reviewsSnap.docs.forEach(doc => {
          const review = doc.data();
          const state = restaurantStateMap[review.restaurantId];
          if (state && review.userId) {
            const key = `${review.userId}-${state}`;
            if (!reviewsByUserState[key]) {
              reviewsByUserState[key] = { userId: review.userId, state, count: 0 };
            }
            reviewsByUserState[key].count++;
            reviewsWithStates++;
          } else if (!state) {
            reviewsWithoutStates++;
            console.debug(`Review ${doc.id} missing state for restaurant ${review.restaurantId}`);
          }
        });
        
        console.log('Reviews processed - with states:', reviewsWithStates, 'without states:', reviewsWithoutStates);
        console.log('Review By User State Map:', reviewsByUserState);

        // Build regional leaderboard based on selected state
        const updateRegionalLeaderboard = async () => {
          let data = Object.values(reviewsByUserState);
          
          if (selectedState.value) {
            data = data.filter(item => item.state === selectedState.value);
            console.log(`Filtered for ${selectedState.value}:`, data);
          }

          const leaderboard = await Promise.all(
            data
              .map(item => ({
                ...userMap[item.userId],
                uid: item.userId,
                reviewCount: item.count
              }))
              .filter(user => user.displayName)
              .sort((a, b) => b.reviewCount - a.reviewCount)
              .slice(0, 10)
              .map(async (user) => {
                const badges = await loadUserBadges(user.uid);
                return { ...user, earnedBadges: badges };
              })
          );

          regionalLeaderboard.value = leaderboard;
        };

        updateRegionalLeaderboard();
        loadingRegional.value = false;

        // Re-compute when selected state changes
        watch(() => selectedState.value, () => {
          updateRegionalLeaderboard();
        });

      } catch (error) {
        console.error("Error loading regional data:", error);
        loadingRegional.value = false;
      }
    };

    onUnmounted(() => {
      unsubscribe();
    });

    const getMedal = (index) => {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index >= 3 && index < 10) return '🏅';
      return null;
    };

    const getRankClass = (index) => {
      if (index === 0) return 'rank-gold';
      if (index === 1) return 'rank-silver';
      if (index === 2) return 'rank-bronze';
      if (index >= 3 && index < 10) return 'rank-regular';
      return '';
    };

    return {
      loading,
      loadingCommenters,
      loadingRegional,
      users,
      commenters,
      regionalLeaderboard,
      activeTab,
      selectedState,
      statesList,
      getMedal,
      getRankClass
    };
  }
};
</script>

<style scoped>
.leaderboard-page { max-width: 800px; margin: 0 auto; padding: 1em; }
.page-header { text-align: center; margin-bottom: 2em; }
.page-header h2 { margin-bottom: 0.2em; }
.page-header p { color: #777; margin-top: 0; }

.leaderboard-tabs {
  display: flex;
  gap: 0.5em;
  margin-bottom: 2em;
  border-bottom: 2px solid var(--background-color);
  flex-wrap: wrap;
}

.leaderboard-tabs button {
  background: none;
  border: none;
  padding: 1em;
  font-size: 1em;
  color: #777;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  font-weight: 600;
}

.leaderboard-tabs button:hover {
  color: var(--primary-color);
}

.leaderboard-tabs button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.state-filter {
  margin-bottom: 2em;
  display: flex;
  align-items: center;
  gap: 1em;
}

.state-filter label {
  font-weight: 600;
}

.state-filter select {
  padding: 0.5em 1em;
  border: 1px solid var(--background-color);
  border-radius: 6px;
  font-size: 1em;
  background: var(--card-background);
}

.loading-indicator, .no-users-message { text-align: center; color: #777; padding: 3em; }
.leaderboard-list { list-style: none; padding: 0; }
.leaderboard-item {
  display: flex;
  align-items: center;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  margin-bottom: 1em;
  padding: 1em 1.5em;
  transition: transform 0.2s, box-shadow 0.2s;
}
.leaderboard-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}
.rank-container {
  display: flex;
  align-items: center;
  font-size: 1.5em;
  font-weight: 700;
  color: var(--secondary-color);
  margin-right: 1.5em;
  width: 60px;
  justify-content: center;
}
.medal { font-size: 1.2em; margin-left: 0.3em; }
.rank-gold { border-left: 5px solid #ffd700; }
.rank-silver { border-left: 5px solid #c0c0c0; }
.rank-bronze { border-left: 5px solid #cd7f32; }
.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 1em;
  object-fit: cover;
}
.user-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.user-name-line {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.user-name {
  font-weight: 600;
  font-size: 1.1em;
}
.leaderboard-badges {
  display: flex;
  gap: 2px;
}
.leaderboard-badges :deep(.badge) {
  font-size: 0.8em;
  width: 18px;
  height: 18px;
}
.review-count {
  color: #777;
  font-size: 0.9em;
}
</style>