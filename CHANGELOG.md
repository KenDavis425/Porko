# Changelog

All notable changes to PorkHub are documented in this file.

## [1.0.0] - 2026-01-21

### Added
- **Leaderboard Medals System**: Top 10 reviewers now display achievement medals next to their names
  - 🥇 Gold medal for #1 reviewer
  - 🥈 Silver medal for #2 reviewer
  - 🥉 Bronze medal for #3 reviewer
  - 🏅 Participation medal for positions 4-10

- **Achievement Badges System**: Users earn accomplishment badges based on their reviewing activity
  - First to Review badge when completing their first review
  - Various other badges based on review statistics and contributions

- **Badge Display Integration**: Badges now display across all relevant components
  - Comments: Commenters show their leaderboard medals and badges
  - My Reviews: Author displays leaderboard medal and accomplishment badges
  - User Search / Follow Users page: Users show medals and badges in search results

### Changed
- **Comments Component**: Updated to display leaderboard medals and badges for commenters
- **My Reviews Component**: Now displays badges dynamically calculated from user review stats
- **User Search Component**: Integrated badge display for users in follow list

### Technical Details
- Added missing `limit` import to Comments.vue for proper leaderboard fetching
- Implemented `BadgeDisplay` component usage across multiple components for consistent icon rendering
- Updated badge loading to use dynamic calculation via `calculateEarnedBadges()` and `formatUserStats()` utilities
- Added `documentId` import to support badge queries in UserSearch
