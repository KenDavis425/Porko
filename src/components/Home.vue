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

    <div class="sort-toggle" v-if="userLocation">
      <button @click="setSortOrder('time')" :class="{ active: sortOrder === 'time' }">Most Recent</button>
      <button @click="setSortOrder('distance')" :class="{ active: sortOrder === 'distance' }">Nearby</button>
    </div>

    <div class="feed">
      <div v-if="loading" class="loading-indicator">Loading feed...</div>
      <div v-else>
        <div v-if="posts.length === 0" class="no-posts-message">
          <div v-if="user">
            <h3>Your Feed is Empty</h3>
            <p>Follow some users to see their reviews here, or check out the Restaurants page to find new places.</p>
          </div>
          <div v-else>
            <h3>Welcome to PorkHub!</h3>
            <p>There are no reviews to show right now. Check out the Restaurants page to discover new places!</p>
          </div>
        </div>
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="post-header">
            <img :src="post.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" referrerpolicy="no-referrer" />
            <div class="post-info">
              <div class="user-line">
                <span class="user-name">{{ post.userName }}</span>
                <div v-if="post.medals && post.medals.length > 0" class="medals">
                  <span v-for="(medalData, idx) in post.medals" :key="idx" class="medal" :title="medalData.title">{{ medalData.medal }}</span>
                </div>
                <BadgeDisplay v-if="post.userBadges && post.userBadges.length > 0" :badges="post.userBadges" :title="''" class="post-badges" />
              </div>
              <span class="post-date">{{ post.createdAt.toDate().toLocaleString() }}</span>
            </div>
          </div>
          <div class="post-content">
            <div class="post-title-line">
              <div class="restaurant-title-group">
                <h2 class="restaurant-name">{{ post.restaurantName }}</h2>
              <button v-if="user" @click="toggleBucketList(post)" class="action-btn bucket-list-btn" :class="{ 'in-bucket-list': isInBucketList(post.restaurantId) }" :title="isInBucketList(post.restaurantId) ? 'In Bucket List' : 'Add to Bucket List'">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 7h-2.06c-.33-3.2-2.46-5.8-5.94-5.8S4.39 3.8 4.06 7H2v12h16V7zM6.14 7c.2-1.92 1.6-3.48 3.86-3.8A4.002 4.002 0 0 1 14 7h-2.14c-.2-1.92-1.6-3.48-3.86-3.8zM16 17H4v-8h12v8z"/></svg>
              </button>
              </div>
              <div v-if="post.distance !== null" class="distance">
                {{ post.distance.toFixed(1) }} miles away
              </div>
            </div>
            <div v-if="post.restaurantCity || post.restaurantState" class="restaurant-location">
              {{ post.restaurantCity }}<template v-if="post.restaurantCity && post.restaurantState">, </template>{{ post.restaurantState }}
            </div>
            <div class="review-body">
              <StarRating :rating="post.rating" />
              <p v-if="post.text" class="review-text">"{{ post.text }}"</p>
              <img v-if="post.photoURL" :src="post.photoURL" alt="Review photo" class="review-photo" loading="lazy" />
              <div v-if="post.tags && post.tags.length > 0" class="tags-container">
                <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="post-actions">
              <button @click="toggleLike(post.id)" class="like-btn" :class="{ 'liked': post.isLiked }" :disabled="!user" :aria-label="post.isLiked ? 'Unlike this review' : 'Like this review'" :aria-pressed="post.isLiked">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>{{ post.likeCount || 0 }}</span>
              </button>
              <button @click="shareReview(post.id)" class="share-btn" title="Share this review" aria-label="Share this review">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
                <span>Share</span>
              </button>
            </div>
            <Comments :post-id="post.id"
                      :user="user"
                      post-type="reviews"
                      :post-author-id="post.userId" />
          </div>
        </div>
        <div ref="loadMoreTrigger"></div>
        <div v-if="loadingMore" class="loading-indicator">Loading more...</div>
      </div>
    </div>

    <!-- Gamification Features Section -->
    <div v-if="user" class="gamification-features">
      <div class="features-container">
        <!-- Trending Restaurants -->
        <div class="feature-column">
          <TrendingRestaurants @restaurant-selected="handleRestaurantSelected" />
        </div>

        <!-- Activity Feed -->
        <div class="feature-column">
          <ActivityFeed :user="user" :following="userFollowing" @restaurant-selected="handleRestaurantSelected" />
        </div>

        <!-- Follow Recommendations -->
        <div class="feature-column">
          <FollowRecommendations :user="user" :following="userFollowing" @follow-user="handleFollowUser" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, deleteDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import Comments from './Comments.vue';
import StarRating from './StarRating.vue';
import BadgeDisplay from './BadgeDisplay.vue';
import ActivityFeed from './ActivityFeed.vue';
import TrendingRestaurants from './TrendingRestaurants.vue';
import FollowRecommendations from './FollowRecommendations.vue';
import { getDistance } from '../utils/geolocation.js';
import { showToast } from '../utils/toast.js';
import { calculateEarnedBadges, formatUserStats } from '../utils/badges.js';

export default {
  name: 'Home',
  components: {
    StarRating,
    Comments,
    BadgeDisplay,
    ActivityFeed,
    TrendingRestaurants,
    FollowRecommendations
  },
  props: {
    user: {
      type: Object,
      default: null
    }
  },
  setup(props) {
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
    const leaderboardRanks = ref(new Map());
    const commenterRanks = ref(new Map());
    const restaurantsMap = ref(new Map());
    const sortOrder = ref('time'); // 'time' or 'distance'
    const userFollowing = ref([]); // For gamification features
    let isSettingUpListeners = false; // Guard to prevent concurrent setup

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

    const processAndSetPosts = () => {
      // Always re-calculate medals before sorting and displaying
      allPosts.forEach(post => {
        const reviewerRank = leaderboardRanks.value.get(post.userId);
        const commenterRank = commenterRanks.value.get(post.userId);
        
        // Build array of all applicable medals
        const medals = [];
        if (reviewerRank !== undefined) {
          const medalData = getMedalWithTitle(reviewerRank, 'reviewers');
          if (medalData) medals.push(medalData);
        }
        if (commenterRank !== undefined) {
          const medalData = getMedalWithTitle(commenterRank, 'commenters');
          if (medalData) medals.push(medalData);
        }
        post.medals = medals;
      });

      const sortedPosts = Array.from(allPosts.values()).sort((a, b) => {
          if (sortOrder.value === 'distance' && userLocation.value) {
            const distanceA = a.distance ?? Infinity;
            const distanceB = b.distance ?? Infinity;

            if (distanceA !== distanceB) {
              return distanceA - distanceB;
            }
            // If distances are equal (e.g. same restaurant), sub-sort by time
            const timeA = a.lastActivityAt || a.createdAt;
            const timeB = b.lastActivityAt || b.createdAt;
            return timeB.seconds - timeA.seconds;
          }

          // Default sort by time
          const timeA = a.lastActivityAt || a.createdAt;
          const timeB = b.lastActivityAt || b.createdAt;
          return timeB.seconds - timeA.seconds;
      });
      fullSortedPosts.value = sortedPosts;
      // Update the displayed posts, preserving the current scroll length
      posts.value = fullSortedPosts.value.slice(0, posts.value.length || pageSize);
    };

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
      checkLocationPermission(); // Now called once on mount.
      loadUserFollowing(); // Load user's following list for gamification
    });

    watch(userLocation, (newLocation) => {
      if (newLocation && allPosts.size > 0) {
        // Location has been granted/updated after posts were already loaded.
        // We need to update distances on existing posts.
        allPosts.forEach(post => {
          const restaurant = restaurantsMap.value.get(post.restaurantId);
          if (restaurant?.location) {
            post.distance = getDistance(newLocation.lat, newLocation.lng, restaurant.location.lat, restaurant.location.lng);
          } else {
            post.distance = null;
          }
        });
        processAndSetPosts(); // Re-sort and update the view
      }
    });

    watch(() => props.user, (newUser, oldUser) => {
      // Re-fetch the feed if the user logs in or out.
      // The check ensures this doesn't run unnecessarily on initial load
      // if the user was already logged in.
      if (newUser?.uid !== oldUser?.uid && !isSettingUpListeners) {
        setupFeedListeners();
      }
    });

    watch(loadMoreTrigger, (newValue, oldValue) => {
      if (oldValue) observer.unobserve(oldValue);
      if (newValue) observer.observe(newValue);
    });

    const setupFeedListeners = async () => {
      // Prevent concurrent calls
      if (isSettingUpListeners) {
        return;
      }
      
      isSettingUpListeners = true;
      loading.value = true;
      
      try {
        // Clear existing listeners and posts
        // Unsubscribe from all existing listeners first
        unsubscribes.forEach(unsub => {
          try {
            unsub();
          } catch (err) {
            console.warn('Error unsubscribing listener:', err);
          }
        });
        unsubscribes.length = 0;
        allPosts.clear();
        
        // Give Firestore a moment to clean up before setting up new listeners
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUser = props.user;
        if (!currentUser) {
          bucketList.value.clear();
        } else {
          const bucketListQuery = query(collection(db, 'bucketListItems'), where('userId', '==', currentUser.uid));
          const unsubBucketList = onSnapshot(
            bucketListQuery, 
            (snapshot) => {
              const newBucketList = new Set();
              snapshot.forEach(doc => newBucketList.add(doc.data().restaurantId));
              bucketList.value = newBucketList;
            },
            (error) => {
              console.error('Error in bucket list listener:', error);
            }
          );
          unsubscribes.push(unsubBucketList);
        }

        // Fetch initial data including the leaderboard to avoid race conditions
        const followsPromise = currentUser ? getDocs(query(collection(db, 'follows'), where('followerId', '==', currentUser.uid))) : Promise.resolve({ docs: [] });
        const [followsSnap, restaurantsSnap, usersSnap, leaderboardSnap, commentersSnap] = await Promise.all([
          followsPromise,
          getDocs(collection(db, 'restaurants')),
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(30))),
          getDocs(query(collection(db, 'users'), orderBy('commentCount', 'desc'), limit(30)))
        ]);

        // Filter out users with 0 or undefined reviewCount, then sort and assign ranks
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
          .slice(0, 10); // Take only top 10
        
        const initialRanks = new Map();
        usersWithReviews.forEach((user, index) => {
          initialRanks.set(user.id, index);
        });
        leaderboardRanks.value = initialRanks;

        // Filter out users with 0 or undefined commentCount for commenter ranks
        const usersWithComments = commentersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => {
            const count = Number(user.commentCount) || 0;
            return count > 0;
          })
          .sort((a, b) => {
            const countA = Number(a.commentCount) || 0;
            const countB = Number(b.commentCount) || 0;
            return countB - countA;
          })
          .slice(0, 10);
        
        const initialCommenterRanks = new Map();
        usersWithComments.forEach((user, index) => {
          initialCommenterRanks.set(user.id, index);
        });
        commenterRanks.value = initialCommenterRanks;

        restaurantsMap.value.clear();
        restaurantsSnap.forEach(doc => {
          restaurantsMap.value.set(doc.id, doc.data());
        });
        
        const usersMap = new Map();
        usersSnap.forEach(doc => {
          usersMap.set(doc.id, doc.data());
        });

        const leaderboardQuery = query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(30));
        const unsubLeaderboard = onSnapshot(
          leaderboardQuery, 
          (leaderboardSnap) => {
            // Filter out users with 0 or undefined reviewCount, then sort and assign ranks
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
              .slice(0, 10); // Take only top 10
            
            const newRanks = new Map();
            usersWithReviews.forEach((user, index) => {
              newRanks.set(user.id, index);
            });
            leaderboardRanks.value = newRanks;
            processAndSetPosts();
          },
          (error) => {
            console.error('Error in leaderboard listener:', error);
          }
        );
        unsubscribes.push(unsubLeaderboard);

        const commenterQuery = query(collection(db, 'users'), orderBy('commentCount', 'desc'), limit(30));
        const unsubCommenters = onSnapshot(
          commenterQuery,
          (commentersSnap) => {
            // Filter out users with 0 or undefined commentCount
            const usersWithComments = commentersSnap.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(user => {
                const count = Number(user.commentCount) || 0;
                return count > 0;
              })
              .sort((a, b) => {
                const countA = Number(a.commentCount) || 0;
                const countB = Number(b.commentCount) || 0;
                return countB - countA;
              })
              .slice(0, 10);
            
            const newCommenterRanks = new Map();
            usersWithComments.forEach((user, index) => {
              newCommenterRanks.set(user.id, index);
            });
            commenterRanks.value = newCommenterRanks;
            processAndSetPosts();
          },
          (error) => {
            console.error('Error in commenters listener:', error);
          }
        );
        unsubscribes.push(unsubCommenters);

        const processSnapshot = (snapshot) => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'removed') {
              allPosts.delete(change.doc.id);
            } else {
              const docData = change.doc.data();
              const restaurant = restaurantsMap.value.get(docData.restaurantId);
              const user = usersMap.get(docData.userId);
              const reviewerRank = leaderboardRanks.value.get(docData.userId);
              const commenterRank = commenterRanks.value.get(docData.userId);
              
              // Build array of all applicable medals
              const medals = [];
              if (reviewerRank !== undefined) {
                const medalData = getMedalWithTitle(reviewerRank, 'reviewers');
                if (medalData) medals.push(medalData);
              }
              if (commenterRank !== undefined) {
                const medalData = getMedalWithTitle(commenterRank, 'commenters');
                if (medalData) medals.push(medalData);
              }
              
              const post = {
                ...docData,
                id: change.doc.id,
                restaurantName: restaurant?.name || 'Unknown Restaurant',
                restaurantCity: restaurant?.city,
                restaurantState: restaurant?.state,
                location: restaurant?.location || null,
                distance: userLocation.value && restaurant?.location ? getDistance(userLocation.value.lat, userLocation.value.lng, restaurant.location.lat, restaurant.location.lng) : null,
                userName: user?.displayName || 'Unknown User',
                userPhoto: user?.photoURL || null,
                userBadges: [],
                medals: medals,
                likeCount: 0,
                isLiked: false
              };
              
              // Load badges for this user asynchronously
              loadUserBadges(docData.userId).then(badges => {
                const postInMap = allPosts.get(post.id);
                if (postInMap) {
                  postInMap.userBadges = badges;
                  processAndSetPosts(); // Re-render to show badges
                }
              });
              
              allPosts.set(post.id, post);
              
              // Set up like listener for this post
              setupLikeListener(post.id);
            }
          });
          processAndSetPosts();
          loading.value = false;
        };

        if (currentUser) {
          // --- LOGGED-IN USER LOGIC ---
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
        } else {
          // --- GUEST USER LOGIC ---
          // Fetch a pool of the 50 most recent reviews globally.
          // The sorting function will then correctly order them by distance if location is available,
          // or by time if not.
          const recentReviewsQuery = query(collection(db, 'reviews'), orderBy('lastActivityAt', 'desc'), limit(50));
          const unsub = onSnapshot(recentReviewsQuery, processSnapshot, (error) => console.error("Feed error (recent for guests):", error));
          unsubscribes.push(unsub);
        }

        if (unsubscribes.length === 0) {
          loading.value = false;
        }
      } catch (error) {
        console.error('Error setting up feed listeners:', error);
        loading.value = false;
        // Make sure to clean up any listeners that might have been set up
        unsubscribes.forEach(unsub => {
          try {
            unsub();
          } catch (err) {
            // Ignore cleanup errors
          }
        });
        unsubscribes.length = 0;
      } finally {
        isSettingUpListeners = false;
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
        },
        () => {
          locationPermission.value = 'denied';
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
          // Asynchronously request location. Don't wait for it.
          requestLocationAccess();
        }
      } catch (error) {
        console.error("Error checking location permission:", error);
        // If permission query fails (e.g. in Firefox private mode), fallback to just asking.
        requestLocationAccess();
      } finally {
        // ALWAYS set up the feed listeners after checking permission.
        setupFeedListeners();
      }
    };

    const setSortOrder = (order) => {
      if (sortOrder.value === order) return;
      sortOrder.value = order;
      processAndSetPosts();
    };

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

    const getMedalWithTitle = (index, type) => {
      const medal = getMedal(index);
      if (!medal) return null;
      const titles = {
        reviewers: 'Top Reviewer',
        commenters: 'Top Commenter',
        state: 'State Leader'
      };
      return { medal, title: `${index + 1}. ${titles[type]}` };
    };

    const isInBucketList = (restaurantId) => {
      return bucketList.value.has(restaurantId);
    };

    const toggleBucketList = async (post) => {
      const currentUser = props.user;
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

    const setupLikeListener = (reviewId) => {
      const currentUser = props.user;
      const reviewRef = doc(db, 'reviews', reviewId);
      const likesCollection = collection(reviewRef, 'likes');
      const likesQuery = query(likesCollection);
      
      const unsub = onSnapshot(likesQuery, (snapshot) => {
        const post = allPosts.get(reviewId);
        if (post) {
          post.likeCount = snapshot.size;
          post.isLiked = currentUser ? snapshot.docs.some(doc => doc.data().userId === currentUser.uid) : false;
          // Update the post in the map
          allPosts.set(reviewId, post);
          // Trigger re-render by updating posts
          processAndSetPosts();
        }
      }, (error) => {
        console.error('Error fetching likes:', error);
      });
      
      unsubscribes.push(unsub);
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
      // Use clean URL format for better social media previews
      // The Cloud Function will handle /review/{reviewId} format
      const shareableLink = `${baseUrl}/review/${reviewId}`;
      
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
        showToast('Link copied to clipboard!', 'success');
      } catch (err) {
        console.error('Failed to copy link:', err);
        // Fallback: Show link in prompt
        const copied = prompt('Copy this link:', shareableLink);
        if (copied) {
          showToast('Link copied!', 'success');
        }
      }
    };

    // Gamification event handlers
    const handleRestaurantSelected = (restaurantId) => {
      // Could navigate to restaurant details or emit event
      console.log('Selected restaurant:', restaurantId);
    };

    const handleFollowUser = ({ userId, isFollowing: nowFollowing }) => {
      // Update userFollowing list
      if (nowFollowing) {
        if (!userFollowing.value.includes(userId)) {
          userFollowing.value.push(userId);
        }
      } else {
        const index = userFollowing.value.indexOf(userId);
        if (index > -1) {
          userFollowing.value.splice(index, 1);
        }
      }
    };

    // Load user's following list on mount
    const loadUserFollowing = async () => {
      if (!props.user) return;
      
      try {
        const followsSnap = await getDocs(
          query(collection(db, 'follows'), where('followerId', '==', props.user.uid))
        );
        userFollowing.value = followsSnap.docs.map(doc => doc.data().followingId);
      } catch (error) {
        console.error('Error loading following list:', error);
      }
    };

    return {
      posts,
      loading,
      locationPermission,
      requestLocationAccess,
      loadMoreTrigger,
      loadingMore,
      isInBucketList,
      toggleBucketList,
      userLocation,
      sortOrder,
      setSortOrder,
      toggleLike,
      shareReview,
      userFollowing,
      handleRestaurantSelected,
      handleFollowUser,
      loadUserFollowing
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

.sort-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5em;
  background-color: #e9ecef;
  border-radius: 8px;
  padding: 4px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.sort-toggle button {
  background: none;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
  color: var(--secondary-color);
  transition: background-color 0.2s, color 0.2s;
}

.sort-toggle button.active {
  background-color: white;
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

.post-badges {
  display: flex;
  gap: 2px;
}

.post-badges :deep(.badge) {
  font-size: 0.8em;
  width: 18px;
  height: 18px;
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

.medal {
  font-size: 1.1em;
  cursor: help;
}

.medals {
  display: flex;
  gap: 0.25em;
  align-items: center;
}

.user-name {
  font-weight: 600;
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

.restaurant-name {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0;
}

.restaurant-location {
  font-size: 0.9em;
  color: #777;
  margin-bottom: 0.75em;
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

/* Gamification Section Styles */
.gamification-section {
  margin-bottom: 2rem;
}

.gamification-features {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid var(--background-color);
}

.features-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.feature-column {
  background: var(--card-background);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
}

@media (max-width: 768px) {
  .features-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .feature-column {
    padding: 1rem;
  }
}

</style>