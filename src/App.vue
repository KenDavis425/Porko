<template>
  <div id="app">
    <div class="main-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <aside class="sidebar">
        <div class="sidebar-top">
          <button class="sidebar-toggle" @click="toggleSidebar" title="Toggle Sidebar">
            <svg v-if="!isSidebarCollapsed" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            <img v-else src="/logo.svg" class="sidebar-toggle-logo" alt="Expand menu" />
          </button>
          <div class="sidebar-branding">
            <img src="/logo.svg" alt="PorkHub Logo" class="sidebar-logo" />
            <h1 class="sidebar-title">PorkHub</h1>
          </div>
          <div v-if="user" class="sidebar-header">
            <img :src="user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" class="sidebar-avatar" alt="User Avatar" referrerpolicy="no-referrer" />
            <div class="sidebar-user">{{ user.displayName }}</div>
          </div>
          <nav class="sidebar-nav">
            <button class="sidebar-link" :class="{ 'active': currentPage === 'home' }" @click="goToHome" title="Home">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>
              <span>Home</span>
            </button>
            <button class="sidebar-link" :class="{ 'active': currentPage === 'leaderboard' }" @click="goToLeaderboard" title="Leaderboard">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 11V3H8v6H2v12h20V11h-6zm-6-6h4v14h-4V5zm-6 6h4v8H4v-8zm16 8h-4v-8h4v8z"/></svg>
              <span>Leaderboard</span>
            </button>
            <button class="sidebar-link" :class="{ 'active': currentPage === 'restaurants' }" @click="goToRestaurants" title="Restaurants">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 6v8h3v8h-3v-2h-2v2h-2v-2h-2v2H8v-2H6v2H3v-8h3V6c0-3.31 2.69-6 6-6s6 2.69 6 6zm-2 0c0-2.21-1.79-4-4-4s-4 1.79-4 4v8h8V6zm-5 3h2v2h-2z"/></svg>
              <span>Restaurants</span>
            </button>
            <button class="sidebar-link" :class="{ 'active': currentPage === 'recommendations' }" @click="goToRecommendations" title="Recommendations">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/></svg>
              <span>Recommendations</span>
            </button>
            <!-- Protected Links -->
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'review' }" @click="goToReview" title="Write a Review">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm-1.5 9h-2v-2h2v2zm5 0h-2v-2h2v2zm-2.5-4h-2V5h2v2z"/></svg>
              <span>Write a Review</span>
            </button>
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'user-search' }" @click="goToUserSearch" title="Follow Users">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.41-1.41L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10V7H8v3H5v2h3v3h2v-3h3v-2h-3z"/></svg>
              <span>Follow Users</span>
            </button>
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'bucket-list' }" @click="goToBucketList" title="My Bucket List">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 7h-2.06c-.33-3.2-2.46-5.8-5.94-5.8S4.39 3.8 4.06 7H2v12h16V7zM6.14 7c.2-1.92 1.6-3.48 3.86-3.8A4.002 4.002 0 0 1 14 7h-2.14c-.2-1.92-1.6-3.48-3.86-3.8zM16 17H4v-8h12v8z"/></svg>
              <span>My Bucket List</span>
            </button>
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'my-reviews' }" @click="goToMyReviews" title="My Reviews">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              <span>My Reviews</span>
            </button>
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'followers' }" @click="goToFollowers" title="My Followers">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <span>My Followers</span>
            </button>
            <button v-if="user" class="sidebar-link" :class="{ 'active': currentPage === 'following' }" @click="goToFollowing" title="Following">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><circle cx="6.18" cy="17.82" r="2.18"/><path d="M4 4.44v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9zM4 10.1v2.83c2.39 0 4.33 1.94 4.33 4.33h2.83c0-3.98-3.23-7.16-7.16-7.16z"/></svg>
              <span>Following</span>
            </button>
          </nav>
        </div>
        <div class="sidebar-bottom">
            <button v-if="isAdmin" class="sidebar-link" :class="{ 'active': currentPage === 'database-stats' }" @click="goToDatabaseStats" title="Database Stats">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>
              <span>Database Stats</span>
            </button>
            <button v-if="user" class="sidebar-link" @click="logout" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
              <span>Logout</span>
            </button>
            <button v-else class="login-btn-sidebar" @click="loginWithGoogle" title="Login with Google">
              <span>Login with</span>
              <svg viewBox="0 0 48 48" width="22px" height="22px">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </button>
            <div class="app-version">v{{ appVersion }}</div>
            <button v-if="isAdmin" class="sidebar-link" :disabled="backfillInProgress" @click="runBackfill" title="Backfill review counts">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M13 3a9 9 0 1 0 8.95 8H19a7 7 0 1 1-6.97-6V3zM12 8v5l4 2"/></svg>
              <span>{{ backfillInProgress ? 'Backfilling...' : 'Backfill Reviews' }}</span>
            </button>
            <div v-if="backfillStatus" class="sidebar-status" style="font-size:0.8em;color:#666;padding:0.2em 0.5em">{{ backfillStatus }}</div>
        </div>
      </aside>
      <main class="main-content">
        <keep-alive include="Home">
          <component 
            :is="currentComponent" 
            :user="user"
            @reviewed="goToHome"
            @check-in-at="reviewAt"
            @review-at="reviewAt"
            @go-to-review="goToReview"
            :selected-restaurant-id="selectedRestaurantForReview"
          />
        </keep-alive>
      </main>
    </div>
  </div>
</template>

<script>
import Home from './components/Home.vue';
import Restaurants from './components/Restaurants.vue';
import UserSearch from './components/UserSearch.vue';
import Review from './components/Review.vue';
import Recommendations from './components/Recommendations.vue';
import DatabaseStats from './components/DatabaseStats.vue';
import MyReviews from './components/MyReviews.vue';
import Leaderboard from './components/Leaderboard.vue';
import Followers from './components/Followers.vue';
import BucketList from './components/BucketList.vue';
import Following from './components/Following.vue';
import { ref, computed } from 'vue';
import { onAuthStateChanged } from "firebase/auth";
import { auth, provider, signInWithPopup, signOut, db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import backfillReviewCounts from './utils/backfillReviewCounts';

export default {
  name: 'App',
  components: {
    Home,
    Restaurants,
    BucketList,
    UserSearch,
    Review,
    Recommendations,
    DatabaseStats,
    MyReviews,
    Leaderboard,
    Followers,
    Following
  },
  setup() {
    const user = ref(null);
    const currentPage = ref('home');
    const selectedRestaurantForReview = ref(null);
    const isSidebarCollapsed = ref(window.innerWidth < 768);
    const appVersion = ref(process.env.VUE_APP_VERSION || 'dev');

    const isAdmin = computed(() => {
      return user.value && user.value.email === 'kennected.com@gmail.com';
    });

    const backfillInProgress = ref(false);
    const backfillStatus = ref('');

    const runBackfill = async () => {
      if (!isAdmin.value) return alert('Only admins can run this operation.');
      if (!confirm('This will write review counts to many user documents. Are you sure you want to proceed?')) return;
      backfillInProgress.value = true;
      backfillStatus.value = 'Starting backfill...';
      try {
        await backfillReviewCounts((msg) => {
          backfillStatus.value = msg;
        });
        backfillStatus.value = 'Backfill completed successfully.';
        // optionally navigate to leaderboard to show results
        currentPage.value = 'leaderboard';
      } catch (err) {
        console.error('Backfill failed:', err);
        backfillStatus.value = 'Backfill failed: ' + (err?.message || String(err));
      } finally {
        backfillInProgress.value = false;
        setTimeout(() => backfillStatus.value = '', 5000);
      }
    };

    const protectedPages = new Set([
      'review', 'user-search', 'bucket-list', 'my-reviews', 
      'followers', 'following', 'database-stats'
    ]);

    const componentMap = {
      'home': 'Home',
      'restaurants': 'Restaurants',
      'bucket-list': 'BucketList',
      'user-search': 'UserSearch',
      'review': 'Review',
      'my-reviews': 'MyReviews',
      'recommendations': 'Recommendations',
      'leaderboard': 'Leaderboard',
      'cleanup': 'Cleanup',
      'database-stats': 'DatabaseStats',
      'followers': 'Followers',
      'following': 'Following'
    };
    const currentComponent = computed(() => componentMap[currentPage.value] || 'Home');

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    window.addEventListener('resize', () => {
      isSidebarCollapsed.value = window.innerWidth < 768;
    });

    onAuthStateChanged(auth, async (u) => {
      user.value = u;
      if (u) { // User is logged in
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            createdAt: new Date(),
            reviewCount: 0
          });
        }
      } else { // User is logged out or a guest
        // If they were on a protected page, redirect to home
        if (protectedPages.has(currentPage.value)) {
          currentPage.value = 'home';
        }
      }
    });

    const loginWithGoogle = async () => {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    };

    const logout = async () => {
      await signOut(auth);
    };

    const goToHome = () => {
      currentPage.value = 'home';
    };

    const goToRestaurants = () => {
      currentPage.value = 'restaurants';
    };

    const goToUserSearch = () => {
      currentPage.value = 'user-search';
    };

    const goToReview = () => {      
      currentPage.value = 'review';
    };

    const goToMyReviews = () => {
      currentPage.value = 'my-reviews';
    };

    const goToRecommendations = () => {
      currentPage.value = 'recommendations';
    };

    const goToLeaderboard = () => {
      currentPage.value = 'leaderboard';
    };

    const goToDatabaseStats = () => {
      currentPage.value = 'database-stats';
    };

    const goToFollowers = () => {
      currentPage.value = 'followers';
    };

    const goToFollowing = () => {
      currentPage.value = 'following';
    };

    const goToBucketList = () => {
      currentPage.value = 'bucket-list';
    };

    const reviewAt = (restaurantId) => {
      selectedRestaurantForReview.value = restaurantId;
      currentPage.value = 'review';
    };

    return { user, loginWithGoogle, logout, currentPage, goToHome, goToRestaurants, goToUserSearch, goToReview, goToMyReviews, goToRecommendations, goToLeaderboard, goToDatabaseStats, goToFollowers, goToFollowing, goToBucketList, reviewAt, selectedRestaurantForReview, isSidebarCollapsed, toggleSidebar, isAdmin, currentComponent, appVersion, backfillInProgress, backfillStatus, runBackfill };
  }
}; 
</script>

<style>
:root {
  --primary-color: #3498db;
  --secondary-color: #2c3e50;
  --background-color: #ecf0f1;
  --sidebar-background: #ffffff;
  --text-color: #34495e;
  --card-background: #ffffff;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

body {
  font-family: 'Roboto', sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  touch-action: manipulation;
}

.main-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: var(--sidebar-background);
  padding: 2em 1em 0.5em;
  box-shadow: 2px 0 5px var(--shadow-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: width 0.3s;
}

.sidebar-top {
  position: relative;
}

.main-layout.sidebar-collapsed .sidebar {
  width: 70px;
  padding: 2em 0;
}

.main-layout.sidebar-collapsed .sidebar-link span,
.main-layout.sidebar-collapsed .sidebar-user {
  display: none;
}

.main-layout.sidebar-collapsed .sidebar-link,
.main-layout.sidebar-collapsed .sidebar-nav button {
  justify-content: center;
}

.main-layout.sidebar-collapsed .sidebar-header {
  display: none;
}

.main-layout.sidebar-collapsed .sidebar-branding {
  display: none;
}

.sidebar-bottom {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
}

.sidebar-header {
  text-align: center;
  margin-bottom: 1em;
}

.sidebar-branding {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  margin-bottom: 1em;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
}

.sidebar-title {
  font-family: 'Arial Black', Gadget, sans-serif;
  font-size: 1.5em;
  font-weight: 900;
  margin: 0;
  color: var(--secondary-color);
  letter-spacing: -1.5px;
}

.sidebar-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-bottom: 0.75em;
}

.sidebar-user {
  font-weight: 600;
  font-size: 1.1em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.2em;
}

.sidebar-link, .sidebar-nav button {
  background: none;
  border: none;
  color: var(--text-color);
  padding: 0.5em 1em;
  text-align: left;
  font-size: 1em;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.8em;
  width: 100%;
}

.sidebar-link:hover, .sidebar-nav button:hover, .sidebar-toggle:hover {
  background-color: var(--primary-color);
  color: white;
}

.sidebar-link.active {
  background-color: var(--primary-color);
  color: white;
}

.sidebar-link svg {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  padding: 2em;
  overflow-y: auto;
  position: relative;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1em;
  }
}

.sidebar-toggle {
  position: absolute;
  top: -1em;
  right: -0.5em;
  background: none;
  border: none;
  padding: 0.5em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-color);
  transition: background-color 0.2s, color 0.2s;
}

.sidebar-toggle-logo {
  width: 40px;
  height: 40px;
}

.main-layout.sidebar-collapsed .sidebar-toggle {
  position: static;
  margin: -1em auto 1em;
  background-color: transparent;
  padding: 0;
}

.main-layout.sidebar-collapsed .sidebar-toggle:hover {
  background-color: transparent;
}

.app-version {
  font-size: 0.8em;
  color: #7f8c8d;
  text-align: center;
  margin-top: 0;
  padding: 0 0.5em;
}

.main-layout.sidebar-collapsed .app-version {
  display: none;
}

.login-btn-sidebar {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}

.login-btn-sidebar:hover {
  background-color: #2980b9;
}
</style>