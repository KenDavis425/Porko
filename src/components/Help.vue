<template>
  <div class="help-page">
    <div class="help-container">
      <div class="help-sidebar">
        <h3>Table of Contents</h3>
        <nav class="toc-nav">
          <a href="#getting-started" @click.prevent="scrollToSection('getting-started')" :class="{ active: activeSection === 'getting-started' }">Getting Started</a>
          <a href="#navigation" @click.prevent="scrollToSection('navigation')" :class="{ active: activeSection === 'navigation' }">Navigation</a>
          <a href="#core-features" @click.prevent="scrollToSection('core-features')" :class="{ active: activeSection === 'core-features' }">Core Features</a>
          <a href="#user-accounts" @click.prevent="scrollToSection('user-accounts')" :class="{ active: activeSection === 'user-accounts' }">User Accounts & Social</a>
          <a href="#gamification" @click.prevent="scrollToSection('gamification')" :class="{ active: activeSection === 'gamification' }">Gamification & Social</a>
          <a href="#tips" @click.prevent="scrollToSection('tips')" :class="{ active: activeSection === 'tips' }">Tips & Best Practices</a>
          <a href="#faq" @click.prevent="scrollToSection('faq')" :class="{ active: activeSection === 'faq' }">FAQ</a>
          <a href="#changelog" @click.prevent="scrollToSection('changelog')" :class="{ active: activeSection === 'changelog' }">Change Log</a>
        </nav>
      </div>

      <div class="help-content" ref="contentRef">
        <h1>PorkHub User Guide</h1>
        <p class="intro">Welcome to <strong>PorkHub</strong> — your community-driven platform for discovering, rating, and reviewing US Breaded Pork Tenderloin restaurants!</p>

        <section id="getting-started">
          <h2>Getting Started</h2>
          
          <h3>Logging In</h3>
          <p>When you first visit PorkHub, you'll see a <strong>"Login with Google"</strong> button at the bottom of the sidebar. Click it to access your account using your Google credentials. Once logged in, your profile information (name and avatar) will appear at the top of the sidebar, and you'll unlock all member-only features.</p>

          <h3>What You Can Do Without Logging In</h3>
          <ul>
            <li>Browse the <strong>Home</strong> feed</li>
            <li>View the <strong>Leaderboard</strong></li>
            <li>Explore <strong>Restaurants</strong> and view their reviews</li>
            <li>View <strong>Recommendations</strong></li>
            <li>Search for users</li>
          </ul>

          <h3>What Requires Login</h3>
          <ul>
            <li>Write and submit reviews</li>
            <li>Follow other users</li>
            <li>Like reviews and add comments</li>
            <li>Manage your bucket list</li>
            <li>View and edit your own reviews</li>
            <li>Share reviews with others</li>
          </ul>
        </section>

        <section id="navigation">
          <h2>Navigation</h2>
          <p>The <strong>sidebar</strong> on the left is your main navigation hub. Click the <strong>hamburger menu icon</strong> (three horizontal lines) to collapse/expand the sidebar for more screen space.</p>

          <h3>Public Pages (Available to Everyone)</h3>
          <div class="feature-list">
            <div class="feature-item">
              <h4>Home</h4>
              <p>Your personalized feed of reviews from followed users and recent activity, with options to sort by Most Recent or Nearby</p>
            </div>
            <div class="feature-item">
              <h4>Leaderboard</h4>
              <p>Top-ranked reviewers in the community, ranked by activity and reputation</p>
            </div>
            <div class="feature-item">
              <h4>Restaurants</h4>
              <p>Browse and search all restaurants, view details, and see reviews</p>
            </div>
            <div class="feature-item">
              <h4>Recommendations</h4>
              <p>Discover new restaurants based on highly-rated reviews from the community</p>
            </div>
          </div>

          <h3>Account-Only Pages (Requires Login)</h3>
          <div class="feature-list">
            <div class="feature-item">
              <h4>Write a Review</h4>
              <p>Submit a new review for a restaurant you've visited</p>
            </div>
            <div class="feature-item">
              <h4>Follow Users</h4>
              <p>Search for and follow other reviewers</p>
            </div>
            <div class="feature-item">
              <h4>My Bucket List</h4>
              <p>Track restaurants you want to visit</p>
            </div>
            <div class="feature-item">
              <h4>My Reviews</h4>
              <p>View and manage all your submitted reviews</p>
            </div>
            <div class="feature-item">
              <h4>My Followers</h4>
              <p>See who is following your reviews</p>
            </div>
            <div class="feature-item">
              <h4>Following</h4>
              <p>View the users you're following</p>
            </div>
          </div>
        </section>

        <section id="core-features">
          <h2>Core Features</h2>

          <h3>🏠 Home Feed</h3>
          <p>The <strong>Home</strong> page displays a personalized feed of reviews from users you follow.</p>
          <p><strong>Features:</strong></p>
          <ul>
            <li>See recent reviews from users you follow</li>
            <li><strong>Location Permission:</strong> On your first visit, you may be prompted to share your location. This unlocks the "Nearby" sorting feature</li>
            <li><strong>Sort by:</strong>
              <ul>
                <li><strong>Most Recent</strong> — Shows the newest reviews first</li>
                <li><strong>Nearby</strong> — Shows restaurants closest to your current location (requires location permission and enabled sorting)</li>
              </ul>
            </li>
          </ul>
          <p><strong>Review Actions:</strong></p>
          <ul>
            <li><strong>Like</strong> — Click the heart icon to like a review (requires login)</li>
            <li><strong>Share</strong> — Share the review using the share button</li>
            <li><strong>Comment</strong> — Add comments to reviews to engage with other reviewers</li>
            <li><strong>Bucket List</strong> — Add restaurants to your bucket list with the heart icon</li>
            <li><strong>View Details</strong> — Click the restaurant name to view full restaurant details</li>
          </ul>

          <h3>📊 Leaderboard</h3>
          <p>View the community's top contributors ranked by their activity and reputation.</p>
          <p><strong>What You See:</strong></p>
          <ul>
            <li>Users ranked by number of reviews and community engagement</li>
            <li>Medals or badges displayed next to top reviewers</li>
            <li>Click on a user to view their profile and all their reviews</li>
          </ul>

          <h3>🏪 Restaurants</h3>
          <p>Browse, search, and manage restaurant listings.</p>
          <p><strong>Searching:</strong></p>
          <ul>
            <li>Search by restaurant <strong>name</strong>, <strong>address</strong>, <strong>city</strong>, <strong>state</strong>, or <strong>ZIP code</strong></li>
            <li>Results update as you type</li>
            <li>See average ratings and review counts for each restaurant</li>
            <li>Distance to each restaurant displayed (when location is enabled)</li>
          </ul>
          <p><strong>What You Can Do:</strong></p>
          <ul>
            <li><strong>View Reviews</strong> — Click the comments icon to see all reviews for a restaurant</li>
            <li><strong>Add Review</strong> — Click "View Reviews" then "Write a Review" button</li>
            <li><strong>Bucket List</strong> — Click the bucket/heart icon to save restaurants you want to visit (requires login)</li>
            <li><strong>Edit Details</strong> (Admin only) — Update restaurant information</li>
            <li><strong>Add New Restaurant</strong> (Logged-in users) — Click "Add New Restaurant" to submit a new location</li>
          </ul>

          <h3>📍 Write a Review</h3>
          <p>Submit detailed reviews for restaurants you've visited.</p>
          <p><strong>To Write a Review:</strong></p>
          <ol>
            <li>Click <strong>"Write a Review"</strong> in the sidebar</li>
            <li>Choose a restaurant from the dropdown or add a new one</li>
            <li>Fill in your review details:
              <ul>
                <li><strong>Star Rating</strong> — Rate from 1-5 stars</li>
                <li><strong>Review Title</strong> — Short summary of your experience</li>
                <li><strong>Review Text</strong> — Detailed comments about the food, service, atmosphere, etc.</li>
                <li><strong>Tags</strong> — Add tags to categorize your experience</li>
                <li><strong>Visit Date</strong> — When you visited</li>
                <li><strong>Photo</strong> — Optionally take a photo with your camera or upload one from your device</li>
              </ul>
            </li>
            <li>Click <strong>"Submit Review"</strong></li>
          </ol>
          <p><strong>Tips:</strong></p>
          <ul>
            <li>Be specific and constructive in your feedback</li>
            <li>Include details about flavors, portions, preparation, and service</li>
            <li>Mention the occasion (family dinner, quick lunch, date night, etc.)</li>
            <li>Use tags to help others quickly understand the experience</li>
            <li>Review soon after your visit while details are fresh</li>
          </ul>

          <h3>⭐ Recommendations</h3>
          <p>Discover new restaurants based on community reviews.</p>
          <p><strong>How It Works:</strong></p>
          <ul>
            <li>Analyzes highly-rated reviews from users you follow</li>
            <li>Shows personalized restaurant suggestions</li>
            <li>Recommendations are tailored based on the reviews and ratings in the community</li>
          </ul>

          <h3>🔍 Follow Users</h3>
          <p>Find and follow other PorkHub members to personalize your feed.</p>
          <p><strong>To Follow a User:</strong></p>
          <ol>
            <li>Click <strong>"Follow Users"</strong> in the sidebar</li>
            <li>Search for a username to find members</li>
            <li>View their profile showing recent reviews and activity</li>
            <li>Click <strong>"Follow"</strong> to add them to your following list</li>
          </ol>
          <p><strong>Benefits:</strong></p>
          <ul>
            <li>Your Home feed will include their reviews</li>
            <li>See their ratings and activity</li>
            <li>Build a community of reviewers with similar tastes</li>
          </ul>

          <h3>🪣 My Bucket List</h3>
          <p>Create and manage a list of restaurants you want to visit.</p>
          <p><strong>Managing Your List:</strong></p>
          <ul>
            <li>Click the <strong>heart icon</strong> on any restaurant card or in the feed to add/remove from bucket list</li>
            <li>View all saved restaurants in <strong>"My Bucket List"</strong></li>
            <li>See distance to each restaurant (when location is enabled)</li>
            <li>View previous reviews and ratings before visiting</li>
            <li>Remove restaurants once you've visited and reviewed them</li>
          </ul>

          <h3>📋 My Reviews</h3>
          <p>View and manage all your submitted reviews.</p>
          <p><strong>Features:</strong></p>
          <ul>
            <li>See all reviews you've written with their ratings and engagement</li>
            <li><strong>Edit</strong> — Update your review text, rating, tags, or photo</li>
            <li><strong>Delete</strong> — Remove a review (this action cannot be undone)</li>
            <li><strong>Share</strong> — Share individual reviews with others</li>
            <li>View how many likes and comments each review has received</li>
            <li>See all reviews sorted by date</li>
          </ul>

          <h3>👥 My Followers / 👤 Following</h3>
          <p>Manage your social connections.</p>
          <p><strong>My Followers:</strong></p>
          <ul>
            <li>See all users who are following your reviews</li>
            <li>View each follower's profile and recent activity</li>
            <li>Click to view all their reviews</li>
          </ul>
          <p><strong>Following:</strong></p>
          <ul>
            <li>View all users you're following</li>
            <li>See previews of their latest reviews and ratings</li>
            <li>Unfollow users by clicking the unfollow button</li>
            <li>Click on a user to view their full profile and all their reviews</li>
          </ul>
        </section>

        <section id="user-accounts">
          <h2>User Accounts & Social</h2>

          <h3>Your Profile</h3>
          <p>Your profile appears in the sidebar and displays:</p>
          <ul>
            <li>Your profile photo (from your Google account)</li>
            <li>Your display name</li>
            <li>Badge/medal (if you're a top reviewer)</li>
          </ul>
          <p>When you log out, you'll see a <strong>"Login with"</strong> button to sign back in.</p>

          <h3>Comments & Interaction</h3>
          <p><strong>Adding Comments:</strong></p>
          <ul>
            <li>Click on any review to expand it and see the comments section</li>
            <li>Type your comment and submit to engage with other reviewers</li>
            <li>Comments appear immediately for all users to see</li>
            <li>Engage in discussions about restaurants and dining experiences</li>
          </ul>
          <p><strong>Liking Reviews:</strong></p>
          <ul>
            <li>Click the heart icon on any review to like it (requires login)</li>
            <li>Like counts are displayed on each review</li>
            <li>Your likes help promote helpful reviews</li>
          </ul>
          <p><strong>Sharing Reviews:</strong></p>
          <ul>
            <li>Click the share icon on any review to share it</li>
            <li>Share via your device's native sharing options, email, social media, or copy the link to clipboard</li>
            <li>Shared reviews include all details (rating, text, photo, tags) when opened by others</li>
          </ul>
          <p><strong>View User Profiles:</strong></p>
          <ul>
            <li>Click on any username to see their complete profile</li>
            <li>View their review history</li>
            <li>Check out their recent activity</li>
            <li>Follow them if interested in their reviews</li>
          </ul>
        </section>

        <section id="gamification">
          <h2>🎮 Gamification & Social Features</h2>
          
          <h3>Your Stats & Achievements</h3>
          <p>Click on your <strong>profile image</strong> in the sidebar to view your personal stats dashboard. Here you can track:</p>
          <ul>
            <li><strong>Total Reviews</strong> — Your contribution count</li>
            <li><strong>Photo Reviews</strong> — Reviews you've submitted with photos</li>
            <li><strong>States Visited</strong> — How many different US states you've reviewed restaurants in</li>
            <li><strong>Followers</strong> — Number of users following your reviews</li>
          </ul>

          <h3>📊 Badges</h3>
          <p>Earn badges as you reach milestones and accomplish goals! Current badges include:</p>
          <div class="feature-list">
            <div class="feature-item">
              <h4>📝 10 Reviews</h4>
              <p>Written 10 reviews</p>
            </div>
            <div class="feature-item">
              <h4>💫 25 Reviews</h4>
              <p>Written 25 reviews</p>
            </div>
            <div class="feature-item">
              <h4>✨ 50 Reviews</h4>
              <p>Written 50 reviews</p>
            </div>
            <div class="feature-item">
              <h4>👑 100 Reviews</h4>
              <p>Written 100 reviews — Master Reviewer status!</p>
            </div>
            <div class="feature-item">
              <h4>📸 Photo Master</h4>
              <p>Written 10+ reviews with photos</p>
            </div>
            <div class="feature-item">
              <h4>🗺️ All 50 States</h4>
              <p>Reviewed restaurants across all 50 US states</p>
            </div>
          </div>

          <h3>🔥 Trending Restaurants</h3>
          <p>Discover what's hot in the community! On the Home page, see two trending views:</p>
          <ul>
            <li><strong>🔥 Most Reviewed This Week</strong> — Restaurants that have generated the most new reviews in the past 7 days</li>
            <li><strong>⭐ Highest Rated This Week</strong> — Restaurants with the best average ratings from recent reviews</li>
          </ul>

          <h3>👥 Follow Recommendations</h3>
          <p>The Home page suggests quality reviewers to follow. Recommendations are based on:</p>
          <ul>
            <li>Users who share similar reviewer interests</li>
            <li>Reviewers followed by people you follow (mutual connections)</li>
            <li>Highly-rated reviewers in the community</li>
          </ul>
          <p>Hover over recommendations to see why they're suggested, then click Follow to add them to your feed!</p>

          <h3>📰 Activity Feed</h3>
          <p>Your Home page feeds you the latest activity from users you follow, including:</p>
          <ul>
            <li>New reviews from people you follow</li>
            <li>Recent badges they've earned</li>
            <li>Ratings, reviews, and photos</li>
            <li>Links to view the full review and restaurant details</li>
          </ul>
          <p>The Activity Feed shows the 15 most recent activities, giving you a real-time window into your community.</p>
        </section>

        <section id="tips">
          <h2>Tips & Best Practices</h2>

          <h3>✅ For Great Reviews</h3>
          <ol>
            <li><strong>Be Specific</strong> — Instead of "good food," describe the breaded pork tenderloin, flavors, preparation, and portion size</li>
            <li><strong>Include Context</strong> — Mention the occasion (family dinner, quick lunch, date night, etc.)</li>
            <li><strong>Balanced Feedback</strong> — Note both strengths (great breading, generous portions) and areas for improvement</li>
            <li><strong>Use Tags</strong> — Categorize your experience (e.g., "crispy-exterior", "family-friendly", "generous-portion", "authentic")</li>
            <li><strong>Add a Photo</strong> — Include a photo of your meal to help others see what to expect</li>
            <li><strong>Be Timely</strong> — Review soon after your visit while details are fresh in your mind</li>
          </ol>

          <h3>📍 Location Tips</h3>
          <ol>
            <li><strong>Enable Location</strong> — Accept the location prompt on the Home page to unlock the "Nearby" sorting feature</li>
            <li><strong>Privacy</strong> — Your location is only used to calculate distances to restaurants and is not stored permanently</li>
            <li><strong>Better Results</strong> — Location data helps show you restaurants closest to you and sorts your feed accordingly</li>
          </ol>

          <h3>👥 Following Strategy</h3>
          <ol>
            <li><strong>Follow Quality Reviewers</strong> — Find users whose tastes align with yours</li>
            <li><strong>Build Your Feed Gradually</strong> — Start with a few followers and expand over time</li>
            <li><strong>Engage</strong> — Comment on reviews and share your thoughts to build community connections</li>
            <li><strong>Explore Profiles</strong> — Click on reviewers from the Leaderboard to find high-quality contributors</li>
          </ol>

          <h3>🍽️ Before Visiting a Restaurant</h3>
          <ol>
            <li>Check <strong>My Bucket List</strong> to see the distance and view saved restaurants</li>
            <li>Read the <strong>latest reviews</strong> to see current conditions and recent experiences</li>
            <li>Check the <strong>restaurant's website</strong> (if available) for hours and menu updates</li>
            <li>Read <strong>recent comments</strong> on reviews for tips and warnings from other reviewers</li>
          </ol>

          <h3>🔍 Search Tips</h3>
          <ul>
            <li>Search by <strong>restaurant name</strong> for direct matches</li>
            <li>Use <strong>address</strong> searches for accuracy when multiple restaurants have similar names</li>
            <li>Try <strong>city names</strong> for broad searches in a specific area</li>
            <li>Search by <strong>ZIP code</strong> to find restaurants in a specific neighborhood</li>
            <li>Try <strong>partial names</strong> if you're unsure of the exact spelling</li>
          </ul>
        </section>

        <section id="faq">
          <h2>Frequently Asked Questions</h2>
          
          <div class="faq-item">
            <h4>Q: Is there a cost to use PorkHub?</h4>
            <p>A: No! PorkHub is completely free to use and enjoy.</p>
          </div>

          <div class="faq-item">
            <h4>Q: How does the Leaderboard work?</h4>
            <p>A: Users are ranked based on the number of reviews they've written and community engagement. Top reviewers earn badges or medals.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Can I delete my account?</h4>
            <p>A: You can delete individual reviews at any time. For full account deletion requests, please contact support.</p>
          </div>

          <div class="faq-item">
            <h4>Q: What if I see incorrect restaurant information?</h4>
            <p>A: Admins can edit restaurant details directly. If you spot an error, you can also leave a comment noting the issue.</p>
          </div>

          <div class="faq-item">
            <h4>Q: How are Recommendations calculated?</h4>
            <p>A: Recommendations are based on highly-rated reviews from users in the community and users you follow.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Are all reviews public?</h4>
            <p>A: Yes, all reviews are public to encourage community engagement and help others discover great restaurants. You can delete reviews if desired.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Can I edit my review after posting?</h4>
            <p>A: Yes! Go to "My Reviews" and click the edit button on any review to update your text, rating, tags, or photo.</p>
          </div>

          <div class="faq-item">
            <h4>Q: How do I report inappropriate content?</h4>
            <p>A: Contact support with details about the concerning review or comment.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Do you collect my location data?</h4>
            <p>A: Your location is only used temporarily to calculate distances and sort the feed nearby. It's not stored permanently in your profile.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Can I search for restaurants without logging in?</h4>
            <p>A: Yes! The Restaurants page is available to all users. You only need to log in to write reviews, follow users, or like reviews.</p>
          </div>

          <div class="faq-item">
            <h4>Q: How do I earn badges?</h4>
            <p>A: Badges are earned automatically as you reach milestones! Write more reviews, include photos, and visit restaurants in different states to unlock achievements. Check your stats on your profile page to see your progress toward the next badge.</p>
          </div>

          <div class="faq-item">
            <h4>Q: Can I see badges earned by other users?</h4>
            <p>A: Yes! When viewing other users' profiles or in the Follow Recommendations section, you can see the badges they've earned. This helps you identify quality reviewers in the community.</p>
          </div>

          <div class="faq-item">
            <h4>Q: How are trending restaurants calculated?</h4>
            <p>A: We calculate trending restaurants based on activity this week. "Most Reviewed" shows restaurants with the most new reviews, while "Highest Rated" shows restaurants with the best average ratings from recent reviews.</p>
          </div>
        </section>

        <section id="changelog">
          <h2>Change Log</h2>
          <p>Track what's new and improved in PorkHub with each release.</p>

          <div class="changelog-item">
            <h3>Version 26.1.20 — Gamification & Social Features</h3>
            <p class="release-date">Released January 20, 2026</p>
            <h4>New Features</h4>
            <ul>
              <li><strong>User Profile Page</strong> — Click your profile picture in the sidebar to view your personal stats dashboard</li>
              <li><strong>Achievement Badges</strong> — Earn 6 different badges as you reach milestones:
                <ul>
                  <li>📝 10 Reviews, 💫 25 Reviews, ✨ 50 Reviews, 👑 100 Reviews</li>
                  <li>📸 Photo Master (10+ photo reviews)</li>
                  <li>🗺️ All 50 States (reviewed in all 50 US states)</li>
                </ul>
              </li>
              <li><strong>Trending Restaurants</strong> — Discover what's hot in the community with two trending views:
                <ul>
                  <li>🔥 Most Reviewed This Week</li>
                  <li>⭐ Highest Rated This Week</li>
                </ul>
              </li>
              <li><strong>Follow Recommendations</strong> — Get smart suggestions on which quality reviewers to follow based on mutual connections</li>
              <li><strong>Activity Feed</strong> — See the latest reviews and achievements from users you follow in real-time</li>
            </ul>
            <h4>Improvements</h4>
            <ul>
              <li>Enhanced user stats tracking (Total Reviews, Photo Reviews, States Visited, Followers)</li>
              <li>Achievement progress bars showing how close you are to the next badge</li>
              <li>Better badge visibility throughout the app</li>
              <li>Gamification features on Home page organized in an attractive 3-column layout</li>
            </ul>
          </div>

          <div class="changelog-item">
            <h3>Version 26.1.5 — Enhanced User Guide</h3>
            <p class="release-date">Released January 5, 2026</p>
            <h4>New Features</h4>
            <ul>
              <li><strong>In-App User Guide</strong> — Access the complete user guide directly in the application via the Help link in the sidebar</li>
              <li><strong>Interactive Table of Contents</strong> — Click any section to jump directly to that part of the guide</li>
              <li><strong>Mobile-Optimized Guide</strong> — User guide formatted for easy reading on all devices</li>
            </ul>
            <h4>Improvements</h4>
            <ul>
              <li>Updated user guide content to match current application features</li>
              <li>Added comprehensive tips and best practices section</li>
              <li>Expanded FAQ with common questions about the app</li>
            </ul>
          </div>

          <div class="changelog-item">
            <h3>Version 24.7.1 — Initial Release</h3>
            <p class="release-date">Released July 1, 2024</p>
            <h4>Features</h4>
            <ul>
              <li>Browse and review restaurants serving breaded pork tenderloin</li>
              <li>Write reviews with ratings (1-5 stars) and optional photos</li>
              <li>Follow other reviewers and see their activity</li>
              <li>View Leaderboard of top reviewers</li>
              <li>Create and manage a bucket list of restaurants to visit</li>
              <li>Search and filter restaurants by location and other criteria</li>
              <li>Like reviews and leave comments</li>
              <li>Share reviews with others</li>
              <li>Location-based features for nearby restaurants</li>
              <li>Google authentication for secure login</li>
            </ul>
          </div>
        </section>

        <div class="help-footer">
          <p>Need more help? Please reach out to the PorkHub support team.</p>
          <p>Happy reviewing and pork tenderloin hunting! 🐷🥓</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'Help',
  setup() {
    const activeSection = ref('getting-started');
    const contentRef = ref(null);

    const scrollToSection = (sectionId) => {
      activeSection.value = sectionId;
      const element = document.querySelector(`#${sectionId}`);
      if (element && contentRef.value) {
        const offsetTop = element.offsetTop;
        contentRef.value.scrollTop = offsetTop - 100;
      }
    };

    onMounted(() => {
      // Track which section is in view as user scrolls
      if (contentRef.value) {
        contentRef.value.addEventListener('scroll', () => {
          const sections = ['getting-started', 'navigation', 'core-features', 'user-accounts', 'tips', 'faq'];
          for (const section of sections) {
            const element = document.querySelector(`#${section}`);
            if (element) {
              const rect = element.getBoundingClientRect();
              const contentRect = contentRef.value.getBoundingClientRect();
              if (rect.top < contentRect.bottom && rect.bottom > contentRect.top) {
                activeSection.value = section;
                break;
              }
            }
          }
        });
      }
    });

    return { activeSection, scrollToSection, contentRef };
  }
};
</script>

<style scoped>
.help-page {
  background: var(--background-color);
  min-height: 100vh;
}

.help-container {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;
  padding: 2rem;
}

.help-sidebar {
  width: 250px;
  position: sticky;
  top: 2rem;
  height: fit-content;
  background: var(--card-background);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.help-sidebar h3 {
  margin: 0 0 1rem 0;
  color: var(--secondary-color);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toc-nav a {
  color: var(--text-color);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: all 0.2s;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.toc-nav a:hover {
  background: var(--background-color);
  color: var(--primary-color);
}

.toc-nav a.active {
  background: var(--background-color);
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 600;
}

.help-content {
  flex: 1;
  background: var(--card-background);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--shadow-color);
  max-height: 90vh;
  overflow-y: auto;
}

.help-content h1 {
  color: var(--secondary-color);
  margin-top: 0;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.intro {
  color: var(--text-color);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.help-content section {
  margin-bottom: 3rem;
  scroll-margin-top: 100px;
}

.help-content h2 {
  color: var(--primary-color);
  font-size: 1.8rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}

.help-content h3 {
  color: var(--secondary-color);
  font-size: 1.3rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.help-content h4 {
  color: var(--text-color);
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem 0;
}

.help-content p {
  line-height: 1.6;
  color: var(--text-color);
  margin: 0.75rem 0;
}

.help-content ul, 
.help-content ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

.help-content li {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.feature-item {
  background: var(--background-color);
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid var(--primary-color);
}

.feature-item h4 {
  margin-top: 0;
  color: var(--primary-color);
}

.feature-item p {
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
}

.faq-item {
  background: var(--background-color);
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  border-left: 4px solid var(--primary-color);
}

.faq-item h4 {
  margin-top: 0;
  color: var(--secondary-color);
  font-weight: 600;
}

.faq-item p {
  margin: 0.5rem 0 0 0;
}

.changelog-item {
  background: var(--background-color);
  padding: 1.5rem;
  border-radius: 6px;
  margin: 1.5rem 0;
  border-left: 4px solid var(--primary-color);
}

.changelog-item h3 {
  margin: 0 0 0.25rem 0;
  color: var(--primary-color);
  font-size: 1.2rem;
}

.release-date {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: #7f8c8d;
  font-style: italic;
}

.changelog-item h4 {
  margin: 1rem 0 0.5rem 0;
  color: var(--secondary-color);
  font-size: 1rem;
  font-weight: 600;
}

.changelog-item ul {
  margin: 0.5rem 0 1rem 0;
}

.help-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid var(--background-color);
  color: var(--text-color);
}

.help-footer p {
  margin: 0.5rem 0;
}

/* Scrollbar styling */
.help-content::-webkit-scrollbar {
  width: 8px;
}

.help-content::-webkit-scrollbar-track {
  background: var(--background-color);
  border-radius: 10px;
}

.help-content::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 10px;
}

.help-content::-webkit-scrollbar-thumb:hover {
  background: var(--secondary-color);
}

/* Responsive design */
@media (max-width: 1024px) {
  .help-container {
    flex-direction: column;
  }

  .help-sidebar {
    position: relative;
    top: 0;
    width: 100%;
  }

  .help-content {
    max-height: none;
    overflow-y: visible;
  }
}

@media (max-width: 768px) {
  .help-container {
    padding: 1rem;
    gap: 1rem;
  }

  .help-sidebar {
    padding: 1rem;
  }

  .help-content {
    padding: 1rem;
  }

  .help-content h1 {
    font-size: 1.8rem;
  }

  .help-content h2 {
    font-size: 1.4rem;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }
}
</style>
