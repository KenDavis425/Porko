/**
 * Badge System for PorkHub
 * Defines all available badges and badge calculation logic
 */

export const BADGES = {
  // Review Count Milestones
  REVIEWER_10: {
    id: 'reviewer-10',
    name: '10 Reviews',
    description: 'Written 10 reviews',
    emoji: '📝',
    requirement: (stats) => stats.reviewCount >= 10,
    category: 'milestone'
  },
  REVIEWER_25: {
    id: 'reviewer-25',
    name: '25 Reviews',
    description: 'Written 25 reviews',
    emoji: '💫',
    requirement: (stats) => stats.reviewCount >= 25,
    category: 'milestone'
  },
  REVIEWER_50: {
    id: 'reviewer-50',
    name: '50 Reviews',
    description: 'Written 50 reviews',
    emoji: '✨',
    requirement: (stats) => stats.reviewCount >= 50,
    category: 'milestone'
  },
  REVIEWER_100: {
    id: 'reviewer-100',
    name: '100 Reviews',
    description: 'Written 100 reviews',
    emoji: '👑',
    requirement: (stats) => stats.reviewCount >= 100,
    category: 'milestone'
  },

  // Photo Master
  PHOTO_MASTER: {
    id: 'photo-master',
    name: 'Photo Master',
    description: 'Written 10+ reviews with photos',
    emoji: '📸',
    requirement: (stats) => stats.photoReviewCount >= 10,
    category: 'engagement'
  },

  // Geographic
  ALL_50_STATES: {
    id: 'all-50-states',
    name: 'All 50 States',
    description: 'Reviewed restaurants in all 50 US states',
    emoji: '🗺️',
    requirement: (stats) => stats.statesVisited && stats.statesVisited.size === 50,
    category: 'geographic'
  },

  // Regional Mastery Badges
  ILLINOIS_MASTER: {
    id: 'illinois-master',
    name: 'Illinois Master',
    description: 'Written 10+ reviews in Illinois',
    emoji: '🏛️',
    requirement: (stats) => (stats.reviewsByState?.['IL'] || 0) >= 10,
    category: 'regional'
  },
  MIDWEST_EXPLORER: {
    id: 'midwest-explorer',
    name: 'Midwest Explorer',
    description: 'Reviewed in 5+ Midwest states',
    emoji: '🧭',
    requirement: (stats) => {
      const midwestStates = ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'];
      const visitedMidwest = midwestStates.filter(state => (stats.reviewsByState?.[state] || 0) > 0);
      return visitedMidwest.length >= 5;
    },
    category: 'regional'
  },

  // Discovery Badge
  FIRST_TO_REVIEW: {
    id: 'first-to-review',
    name: 'First to Review',
    description: 'Be the first to review a restaurant',
    emoji: '🚀',
    requirement: (stats) => (stats.firstReviews || 0) > 0,
    category: 'discovery'
  }
};

/**
 * Calculate which badges a user has earned
 * @param {Object} userStats - User statistics object
 * @returns {Array} Array of badge IDs earned
 */
export function calculateEarnedBadges(userStats) {
  const earned = [];
  
  Object.values(BADGES).forEach(badge => {
    if (badge.requirement(userStats)) {
      earned.push(badge.id);
    }
  });
  
  return earned;
}

/**
 * Get badge details by ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Badge object
 */
export function getBadgeById(badgeId) {
  return Object.values(BADGES).find(badge => badge.id === badgeId) || null;
}

/**
 * Get all badges
 * @returns {Array} Array of all badge objects
 */
export function getAllBadges() {
  return Object.values(BADGES);
}

/**
 * Get badges by category
 * @param {string} category - Category name
 * @returns {Array} Array of badges in that category
 */
export function getBadgesByCategory(category) {
  return Object.values(BADGES).filter(badge => badge.category === category);
}

/**
 * Format user stats for badge calculation
 * Used when calculating from Firestore user documents
 * @param {Object} userDoc - Firestore user document
 * @param {Array} userReviews - Array of user's review documents
 * @param {Array} restaurantReviews - Array of all reviews for restaurants (for first-to-review calculation)
 * @returns {Object} Formatted stats object
 */
export function formatUserStats(userDoc, userReviews = [], restaurantReviews = []) {
  const stats = {
    reviewCount: userDoc.reviewCount || 0,
    photoReviewCount: 0,
    statesVisited: new Set(),
    reviewsByState: {},
    firstReviews: 0
  };

  // Count photo reviews, collect states, and track reviews by state
  if (userReviews && userReviews.length > 0) {
    userReviews.forEach(review => {
      if (review.photoURL) {
        stats.photoReviewCount++;
      }
      if (review.restaurantState) {
        const state = review.restaurantState.toUpperCase();
        stats.statesVisited.add(state);
        stats.reviewsByState[state] = (stats.reviewsByState[state] || 0) + 1;
      }
    });
  }

  // Count first-to-review badges (reviews where user was first to review that restaurant)
  if (restaurantReviews && restaurantReviews.length > 0) {
    const restaurantReviewCounts = {};
    restaurantReviews.forEach(review => {
      const restaurantId = review.restaurantId;
      if (!restaurantReviewCounts[restaurantId]) {
        restaurantReviewCounts[restaurantId] = [];
      }
      restaurantReviewCounts[restaurantId].push(review);
    });

    userReviews.forEach(userReview => {
      const restaurantId = userReview.restaurantId;
      const reviews = restaurantReviewCounts[restaurantId] || [];
      // Sort by timestamp to find first
      const sortedByTime = reviews.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
        const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
        return timeA - timeB;
      });
      if (sortedByTime.length > 0 && sortedByTime[0].userId === userDoc.uid) {
        stats.firstReviews++;
      }
    });
  }

  return stats;
}
