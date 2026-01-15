<template>
  <div class="star-rating" :class="{ 'is-editable': editable }">
    <span
      v-for="n in 5"
      :key="n"
      @click="setRating(n)"
      @mouseover="handleMouseover(n)"
      @mouseleave="handleMouseleave"
      class="star"
    >
      <svg height="16px" width="16px" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path :d="getStarPath(n)" />
      </svg>
    </span>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'StarRating',
  props: {
    rating: {
      type: Number,
      required: true,
      default: 0
    },
    editable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:rating'],
  setup(props, { emit }) {
    const hoverRating = ref(0);

    const fullStarPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z";
    const halfStarPath = "M22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L18.18 21l-1.64-7.03L22 9.24zM12 15.4z";
    const emptyStarPath = "M22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z";

    const getStarPath = (starIndex) => {
      const displayRating = hoverRating.value || props.rating;
      if (displayRating >= starIndex) {
        return fullStarPath;
      }
      if (!hoverRating.value && props.rating >= starIndex - 0.5) {
        return halfStarPath;
      }
      return emptyStarPath;
    };

    const setRating = (n) => {
      if (props.editable) {
        emit('update:rating', n);
      }
    };

    const handleMouseover = (n) => {
      if (props.editable) {
        hoverRating.value = n;
      }
    };

    const handleMouseleave = () => {
      if (props.editable) {
        hoverRating.value = 0;
      }
    };

    return { getStarPath, setRating, handleMouseover, handleMouseleave };
  }
};
</script>

<style scoped>
.star-rating {
  display: inline-flex;
  color: #f39c12;
  gap: 2px;
}
.star-rating.is-editable .star {
  cursor: pointer;
}
</style>