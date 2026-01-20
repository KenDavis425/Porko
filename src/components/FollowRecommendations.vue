<template>
  <div class="recommendations-section">
    <h2>Suggested Users to Follow</h2>
    <p class="description">Users similar to reviewers you already follow</p>

    <div v-if="loading" class="loading-indicator">Loading recommendations...</div>
    <div v-else-if="recommendedUsers.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 0 24 24" width="48px" fill="var(--primary-color)" opacity="0.3">
        <path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      <h3>No Recommendations Yet</h3>
      <p>Follow more users to get better recommendations!</p>
    </div>

    <div v-else class="recommendations-grid">
      <div v-for="user in recommendedUsers" :key="user.uid" class="user-card">
        <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-photo" referrerpolicy="no-referrer" />
        
        <h4 class="user-name">{{ user.displayName }}</h4>
        
        <div class="user-stats">
          <div class="stat">
            <span class="stat-label">Reviews</span>
            <span class="stat-value">{{ user.reviewCount || 0 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Followers</span>
            <span class="stat-value">{{ user.followerCount || 0 }}</span>
          </div>
        </div>

        <div v-if="user.badges && user.badges.length > 0" class="user-badges">
          <span v-for="badgeId in user.badges.slice(0, 3)" :key="badgeId" class="badge-icon" :title="getBadgeName(badgeId)">
            {{ getBadgeEmoji(badgeId) }}
          </span>
          <span v-if="user.badges.length > 3" class="badge-more">+{{ user.badges.length - 3 }}</span>
        </div>

        <div class="reason" v-if="user.reason">
          <span class="reason-label">Why we recommend this:</span>
          <span class="reason-text">{{ user.reason }}</span>
        </div>

        <button @click="followUser(user.uid)" :disabled="isFollowing(user.uid)" class="btn-follow">
          {{ isFollowing(user.uid) ? 'Following' : 'Follow' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getBadgeById } from '../utils/badges';

export default {
  name: 'FollowRecommendations',
  props: {
    user: {
      type: Object,
      required: true
    },
    following: {
      type: Array,
      default: () => []
    }
  },
  emits: ['follow-user'],
  setup(props, { emit }) {
    const recommendedUsers = ref([]);
    const loading = ref(true);
    const userFollowing = ref(new Set(props.following || []));

    const loadRecommendations = async () => {
      loading.value = true;
      try {
        if (!props.user || !props.following || props.following.length === 0) {
          recommendedUsers.value = [];
          loading.value = false;
          return;
        }

        // Get all users that people you follow are following
        const followsSnap = await getDocs(
          query(
            collection(db, 'follows'),
            where('followerId', 'in', props.following)
          )
        );

        const recommendedUserIds = new Set();
        const followCountMap = new Map();

        followsSnap.docs.forEach(doc => {
          const follow = doc.data();
          const followingId = follow.followingId;

          // Don't recommend users already followed or the current user
          if (
            followingId !== props.user.uid &&
            !props.following.includes(followingId)
          ) {
            recommendedUserIds.add(followingId);
            followCountMap.set(followingId, (followCountMap.get(followingId) || 0) + 1);
          }
        });

        if (recommendedUserIds.size === 0) {
          recommendedUsers.value = [];
          loading.value = false;
          return;
        }

        // Get user details
        const userIds = Array.from(recommendedUserIds).slice(0, 12); // Limit to top 12
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('uid', 'in', userIds))
        );

        const users = [];
        usersSnap.docs.forEach(doc => {
          const userData = doc.data();
          const mutualFollowCount = followCountMap.get(doc.id) || 0;

          users.push({
            uid: doc.id,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            reviewCount: userData.reviewCount || 0,
            followerCount: userData.followerCount || 0,
            badges: userData.earnedBadges || [],
            mutualFollowCount,
            reason: generateReason(userData, mutualFollowCount)
          });
        });

        // Sort by mutual follows and review count
        users.sort((a, b) => {
          if (b.mutualFollowCount !== a.mutualFollowCount) {
            return b.mutualFollowCount - a.mutualFollowCount;
          }
          return b.reviewCount - a.reviewCount;
        });

        recommendedUsers.value = users;
      } catch (error) {
        console.error('Error loading recommendations:', error);
        recommendedUsers.value = [];
      } finally {
        loading.value = false;
      }
    };

    const generateReason = (user, mutualCount) => {
      if (mutualCount >= 3) {
        return `Followed by ${mutualCount} reviewers you know`;
      }
      if (user.reviewCount >= 25) {
        return 'Prolific reviewer with quality content';
      }
      if (user.badges && user.badges.length > 0) {
        return 'Earned multiple achievements';
      }
      return 'Similar taste in restaurants';
    };

    const isFollowing = (userId) => {
      return userFollowing.value.has(userId);
    };

    const followUser = async (userId) => {
      try {
        const followRef = doc(
          collection(db, 'follows'),
          `${props.user.uid}_${userId}`
        );

        if (isFollowing(userId)) {
          // Unfollow
          await deleteDoc(followRef);
          userFollowing.value.delete(userId);
        } else {
          // Follow
          await setDoc(followRef, {
            followerId: props.user.uid,
            followingId: userId,
            createdAt: new Date()
          });
          userFollowing.value.add(userId);
        }

        emit('follow-user', { userId, isFollowing: !isFollowing(userId) });
      } catch (error) {
        console.error('Error following user:', error);
      }
    };

    const getBadgeName = (badgeId) => {
      const badge = getBadgeById(badgeId);
      return badge ? badge.name : 'Achievement';
    };

    const getBadgeEmoji = (badgeId) => {
      const badge = getBadgeById(badgeId);
      return badge ? badge.emoji : '🏆';
    };

    onMounted(() => {
      loadRecommendations();
    });

    return {
      recommendedUsers,
      loading,
      isFollowing,
      followUser,
      getBadgeName,
      getBadgeEmoji
    };
  }
};
</script>

<style scoped>
.recommendations-section {
  width: 100%;
  margin-bottom: 2rem;
}

.recommendations-section h2 {
  color: var(--primary-color);
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.description {
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  opacity: 0.8;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: var(--text-color);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  background: var(--background-color);
  border-radius: 8px;
  color: var(--text-color);
}

.empty-state svg {
  display: block;
  margin: 0 auto 1rem;
}

.empty-state h3 {
  margin: 0.5rem 0;
  color: var(--secondary-color);
}

.empty-state p {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.user-card {
  background: var(--card-background);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 1px 3px var(--shadow-color);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-card:hover {
  box-shadow: 0 4px 12px var(--shadow-color);
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.user-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto;
  border: 3px solid var(--primary-color);
}

.user-name {
  margin: 0.5rem 0 0;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  padding: 0.75rem;
  background: var(--background-color);
  border-radius: 6px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color);
  opacity: 0.7;
  text-transform: uppercase;
}

.stat-value {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.user-badges {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.badge-icon {
  font-size: 1.5rem;
  cursor: help;
}

.badge-more {
  font-size: 0.9rem;
  color: var(--primary-color);
  font-weight: 600;
  align-self: center;
}

.reason {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  padding: 0.75rem;
  border-radius: 6px;
}

.reason-label {
  color: var(--primary-color);
  font-weight: 600;
}

.reason-text {
  color: var(--text-color);
}

.btn-follow {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.65rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-follow:hover:not(:disabled) {
  background: #2980b9;
  transform: scale(1.02);
}

.btn-follow:disabled {
  background: #95a5a6;
  cursor: not-allowed;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .recommendations-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .user-card {
    padding: 1rem;
  }

  .user-photo {
    width: 70px;
    height: 70px;
  }
}
</style>
