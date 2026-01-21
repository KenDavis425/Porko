<template>
  <div v-if="badges && badges.length > 0" class="badges-container">
    <span v-for="badgeId in badges" :key="badgeId" class="badge-icon" :title="getBadgeName(badgeId)">
      {{ getBadgeEmoji(badgeId) }}
    </span>
  </div>
</template>

<script>
import { getBadgeById } from '../utils/badges';

export default {
  name: 'BadgeDisplay',
  props: {
    badges: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: 'Badges'
    }
  },
  setup() {
    const getBadgeById_fn = getBadgeById;

    const getBadgeName = (badgeId) => {
      const badge = getBadgeById_fn(badgeId);
      return badge ? badge.name : 'Achievement';
    };

    const getBadgeEmoji = (badgeId) => {
      const badge = getBadgeById_fn(badgeId);
      return badge ? badge.emoji : '🏆';
    };

    const getBadgeDescription = (badgeId) => {
      const badge = getBadgeById_fn(badgeId);
      return badge ? `${badge.name}: ${badge.description}` : 'Achievement';
    };

    return {
      getBadgeName,
      getBadgeEmoji,
      getBadgeDescription
    };
  }
};
</script>

<style scoped>
.badges-container {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.badge-icon {
  font-size: 1.2rem;
  cursor: help;
  transition: transform 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge-icon:hover {
  transform: scale(1.2);
}
</style>
