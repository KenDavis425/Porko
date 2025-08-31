<template>
  <div class="home-page">
    <div v-if="locationPermission === 'prompt'" class="location-prompt-banner">
      <div class="banner-content">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <p>Share your location to see posts and restaurants near you!</p>
      </div>
      <button @click="requestLocationAccess" class="btn-primary">Share Location</button>
    </div>
    <div v-if="locationPermission === 'denied'" class="location-prompt-banner warning">
      <div class="banner-content">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>
        <p>Location access is denied. To see local content, please enable location services for this site in your browser settings.</p>
      </div>
    </div>

    <div class="feed">
      <div v-if="loading" class="loading-indicator">Loading feed...</div>
      <div v-else>
        <div v-if="posts.length === 0" class="no-posts-message">
          <h3>Welcome to Porko!</h3>
          <p>Follow some users to see their reviews in your feed, or check out the Restaurants page to find new places.</p>
        </div>
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="post-header">
            <img :src="post.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
            <div class="post-info">
              <div class="user-line">
                <span class="user-name">{{ post.userName }}</span>
                <span v-if="post.medal" class="medal">{{ post.medal }}</span>
              </div>
              <span class="post-date">{{ post.createdAt.toDate().toLocaleString() }}</span>
            </div>
          </div>
          <div class="post-content">
            <div class="post-title-line">
              <div class="restaurant-title-group">
                <h4 class="restaurant-name">{{ post.restaurantName }}</h4>
                <button @click="toggleBucketList(post)" class="action-btn bucket-list-btn" :class="{ 'in-bucket-list': isInBucketList(post.restaurantId) }" :title="isInBucketList(post.restaurantId) ? 'In Bucket List' : 'Add to Bucket List'">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 7h-2.06c-.33-3.2-2.46-5.8-5.94-5.8S4.39 3.8 4.06 7H2v12h16V7zM6.14 7c.2-1.92 1.6-3.48 3.86-3.8A4.002 4.002 0 0 1 14 7h-2.14c-.2-1.92-1.6-3.48-3.86-3.8zM16 17H4v-8h12v8z"/></svg>
                </button>
              </div>
              <div v-if="post.distance !== null" class="distance">
                {{ post.distance.toFixed(1) }} miles away
              </div>
            </div>
            <div class="review-body">
              <StarRating :rating="post.rating" />
              <p v-if="post.text" class="review-text">"{{ post.text }}"</p>
              <img v-if="post.photoURL" :src="post.photoURL" alt="Review photo" class="review-photo" />
              <div v-if="post.tags && post.tags.length > 0" class="tags-container">
                <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <Comments :post-id="post.id"
                      post-type="reviews"
                      :post-author-id="post.userId" />
          </div>
        </div>
        <div ref="loadMoreTrigger"></div>
        <div v-if="loadingMore" class="loading-indicator">Loading more...</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import Comments from './Comments.vue';
import StarRating from './StarRating.vue';
import { getDistance } from '../utils/geolocation.js';

export default {
  name: 'Home',
  components: {
    StarRating,
    Comments
  },
  setup() {
    const posts = ref([]);
    const loading = ref(true);
    const userLocation = ref(null);
    const locationPermission = ref(''); // 'prompt', 'granted', 'denied'
    const loadMoreTrigger = ref(null);
    const loadingMore = ref(false);
    const allPosts = new Map();
    const fullSortedPosts = ref([]);
    const pageSize = 10;
    let observer = null;
    const unsubscribes = [];
    const bucketList = ref(new Set());

    onUnmounted(() => {
      unsubscribes.forEach(unsub => unsub());
      if (observer) {
        observer.disconnect();
      }
    });

    onMounted(() => {
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      });
      checkLocationPermission();
    });

    watch(loadMoreTrigger, (newValue, oldValue) => {
      if (oldValue) observer.unobserve(oldValue);
      if (newValue) observer.observe(newValue);
    });

    const setupFeedListeners = async () => {
      loading.value = true;
      // Clear existing listeners and posts
      unsubscribes.forEach(unsub => unsub());
      unsubscribes.length = 0;
      allPosts.clear();

      const bucketListQuery = query(collection(db, 'bucketListItems'), where('userId', '==', auth.currentUser.uid));
      const unsubBucketList = onSnapshot(bucketListQuery, (snapshot) => {
        const newBucketList = new Set();
        snapshot.forEach(doc => newBucketList.add(doc.data().restaurantId));
        bucketList.value = newBucketList;
      });
      unsubscribes.push(unsubBucketList);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        loading.value = false;
        return;
      }

      const [followsSnap, restaurantsSnap, usersSnap, leaderboardSnap] = await Promise.all([
        getDocs(query(collection(db, 'follows'), where('followerId', '==', currentUser.uid))),
        getDocs(collection(db, 'restaurants')),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(3)))
      ]);

      const restaurantsMap = new Map();
      restaurantsSnap.forEach(doc => {
        restaurantsMap.set(doc.id, doc.data());
      });

      const usersMap = new Map();
      usersSnap.forEach(doc => {
        usersMap.set(doc.id, doc.data());
      });

      const leaderboardRanks = new Map();
      leaderboardSnap.forEach((doc, index) => {
        leaderboardRanks.set(doc.id, index);
      });

      const processAndSetPosts = () => {
        fullSortedPosts.value = Array.from(allPosts.values()).sort((a, b) => {
            const timeA = a.lastActivityAt || a.createdAt;
            const timeB = b.lastActivityAt || b.createdAt;
            return timeB.seconds - timeA.seconds;
        });
        // Update the displayed posts, preserving the current scroll length
        posts.value = fullSortedPosts.value.slice(0, posts.value.length || pageSize);
      };

      const processSnapshot = (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            allPosts.delete(change.doc.id);
          } else {
            const docData = change.doc.data();
            const restaurant = restaurantsMap.get(docData.restaurantId);
            const user = usersMap.get(docData.userId);
            const rank = leaderboardRanks.get(docData.userId);
            const post = {
              ...docData,
              id: change.doc.id,
              restaurantName: restaurant?.name || 'Unknown Restaurant',
              location: restaurant?.location || null,
              distance: userLocation.value && restaurant?.location ? getDistance(userLocation.value.lat, userLocation.value.lng, restaurant.location.lat, restaurant.location.lng) : null,
              userName: user?.displayName || 'Unknown User',
              userPhoto: user?.photoURL || null,
              medal: getMedal(rank)
            };
            allPosts.set(post.id, post);
          }
        });
        processAndSetPosts();
        loading.value = false;
      };

      const followingIds = followsSnap.docs.map(doc => doc.data().followingId);

      // Add current user's ID to see their own posts
      if (!followingIds.includes(currentUser.uid)) {
        followingIds.push(currentUser.uid);
      }

      if (followingIds.length > 0) {
        // Firestore 'in' query is limited to 30 elements, so we batch
        for (let i = 0; i < followingIds.length; i += 30) {
            const batchIds = followingIds.slice(i, i + 30);
            const q = query(collection(db, 'reviews'), where('userId', 'in', batchIds), orderBy('lastActivityAt', 'desc'));
            const unsub = onSnapshot(q, processSnapshot, (error) => console.error("Feed error (followed):", error));
            unsubscribes.push(unsub);
        }
      }

      if (userLocation.value) {
        const nearbyRestaurantIds = [];
        restaurantsSnap.forEach(doc => {
          const restaurant = doc.data();
          if (restaurant.location) {
            const distance = getDistance(userLocation.value.lat, userLocation.value.lng, restaurant.location.lat, restaurant.location.lng);
            if (distance !== null && distance <= 100) {
              nearbyRestaurantIds.push(doc.id);
            }
          }
        });
        if (nearbyRestaurantIds.length > 0) {
            for (let i = 0; i < nearbyRestaurantIds.length; i += 30) {
                const batchIds = nearbyRestaurantIds.slice(i, i + 30);
                const q = query(collection(db, 'reviews'), where('restaurantId', 'in', batchIds), orderBy('lastActivityAt', 'desc'));
                const unsub = onSnapshot(q, processSnapshot, (error) => console.error("Feed error (nearby):", error));
                unsubscribes.push(unsub);
            }
        }
      }

      if (unsubscribes.length === 0) {
        loading.value = false;
      }
    };

    const loadMorePosts = () => {
      if (loadingMore.value || posts.value.length >= fullSortedPosts.value.length) {
        return;
      }
      loadingMore.value = true;

      setTimeout(() => {
        const currentLength = posts.value.length;
        const nextPosts = fullSortedPosts.value.slice(currentLength, currentLength + pageSize);
        posts.value.push(...nextPosts);
        loadingMore.value = false;
      }, 300);
    };

    const requestLocationAccess = () => {
      navigator.geolocation.getCurrentPosition(
        position => {
          locationPermission.value = 'granted';
          userLocation.value = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setupFeedListeners();
        },
        () => {
          locationPermission.value = 'denied';
          setupFeedListeners(); // Fetch feed without location
        },
        { timeout: 10000 }
      );
    };

    const checkLocationPermission = async () => {
      if (!navigator.permissions) {
        requestLocationAccess(); // Fallback for older browsers
        return;
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        locationPermission.value = permissionStatus.state;

        permissionStatus.onchange = () => {
          locationPermission.value = permissionStatus.state;
          if (permissionStatus.state === 'granted') {
            requestLocationAccess();
          }
        };

        if (permissionStatus.state === 'granted') {
          requestLocationAccess();
        } else {
          setupFeedListeners();
        }
      } catch (error) {
        console.error("Error checking location permission:", error);
        // If permission query fails (e.g. in Firefox private mode), fallback to just asking.
        requestLocationAccess();
      }
    };

    const getMedal = (index) => {
      if (typeof index !== 'number') return null;
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';      
      return null;
    };

    const isInBucketList = (restaurantId) => {
      return bucketList.value.has(restaurantId);
    };

    const toggleBucketList = async (post) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      if (isInBucketList(post.restaurantId)) {
        const q = query(collection(db, 'bucketListItems'), where('userId', '==', currentUser.uid), where('restaurantId', '==', post.restaurantId));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => deleteDoc(doc.ref));
      } else {
        await addDoc(collection(db, 'bucketListItems'), {
          userId: currentUser.uid,
          restaurantId: post.restaurantId,
          createdAt: serverTimestamp()
        });
      }
    };

    onMounted(checkLocationPermission);

    return {
      posts,
      loading,
      locationPermission,
      requestLocationAccess,
      loadMoreTrigger,
      loadingMore,
      isInBucketList,
      toggleBucketList
    };
  }
};
</script>

<style scoped>
.home-page {
  max-width: 800px;
  margin: 0 auto;
}

.location-prompt-banner {
  background-color: #eaf5ff;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  padding: 1em 1.5em;
  margin-bottom: 2em;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
}

.location-prompt-banner.warning {
  background-color: #fff4e5;
  border-color: #ff9800;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1em;
}

.banner-content p {
  margin: 0;
  color: var(--secondary-color);
}

.location-prompt-banner .btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.6em 1.2em;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}

.loading-indicator, .no-posts-message {
  text-align: center;
  color: #777;
  padding: 3em;
}

.no-posts-message h3 {
  margin-bottom: 0.5em;
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

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
}

.bucket-list-btn {
  color: #ccc;
}
.bucket-list-btn.in-bucket-list, .bucket-list-btn:hover {
  color: var(--primary-color);
}

.medal {
  font-size: 1.1em;
}

.user-name {
  font-weight: 600;
}

.post-date {
  color: #7f8c8d;
  font-size: 0.85em;
}

.post-content {
  padding: 1.5em;
}

.post-title-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1em;
}

.restaurant-name {
  font-size: 1.2em;
  font-weight: 600;
  margin: 0;
}

.restaurant-title-group {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.review-photo {
  max-width: 100%;
  border-radius: 8px;
  margin-top: 1em;
}

.review-text {
  font-style: italic;
  color: #333;
  margin: 0.5em 0;
}

.tags-container {
  margin-top: 1em;
}

.tag {
  background-color: var(--primary-color);
  color: white;
  padding: 0.3em 0.8em;
  border-radius: 15px;
  font-size: 0.8em;
  margin-right: 0.5em;
  display: inline-block;
}

.distance {
  font-size: 0.9em;
  color: #777;
  flex-shrink: 0;
  padding-left: 1em;
}
</style>