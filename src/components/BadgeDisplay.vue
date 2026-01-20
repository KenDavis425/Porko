<template>
  <div v-if="badges && badges.length > 0" class="badges-container">
    <h4 class="badges-title">{{ title }}</h4>
    <div class="badges-list">
      <div v-for="badgeId in badges" :key="badgeId" class="badge-item" :title="getBadgeDescription(badgeId)">
        <span class="badge-emoji">{{ getBadgeEmoji(badgeId) }}</span>
        <span class="badge-name">{{ getBadgeName(badgeId) }}</span>
      </div>
    </div>
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
  margin: 1rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
  border: 1px solid #ffe082;
  border-radius: 8px;
}

.badges-title {
  margin: 0 0 0.75rem 0;
  color: #f57f17;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badges-list {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  border: 1px solid #ffe082;
  cursor: help;
  transition: all 0.2s;
}

.badge-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
}

.badge-emoji {
  font-size: 1.25rem;
}

.badge-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f57f17;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .badges-list {
    gap: 0.75rem;
  }

  .badge-item {
    padding: 0.4rem 0.6rem;
  }

  .badge-emoji {
    font-size: 1.1rem;
  }

  .badge-name {
    font-size: 0.75rem;
  }
}
</style>
