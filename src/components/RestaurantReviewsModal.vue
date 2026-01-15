<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Reviews for {{ restaurant.name }}</h2>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="restaurant.reviews && restaurant.reviews.length === 0" class="no-reviews-message">
          No reviews yet for this restaurant.
        </div>
        <ul v-else class="reviews-list">
          <li v-for="review in restaurant.reviews" :key="review.id" class="review-item">
            <div v-if="editingReview && editingReview.id === review.id">
              <!-- Edit Form -->
              <div class="edit-review-form">
                <StarRating :rating="editingReview.rating" :editable="true" @update:rating="newVal => editingReview.rating = newVal" />
                <textarea v-model="editingReview.text" class="edit-textarea"></textarea>
                <div class="edit-actions">
                  <button @click="saveEdit" class="btn-primary">Save</button>
                  <button @click="cancelEdit" class="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
            <div v-else>
              <!-- Display Review -->
              <div class="review-header">
                <img :src="review.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" alt="User" class="user-avatar" />
                <div class="user-info">
                  <span class="user-name">{{ review.userName }}</span>
                  <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                </div>
                <div class="review-actions" v-if="user && user.uid === review.userId">
                  <button @click="startEditing(review)" class="action-btn" title="Edit Review">
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button @click="deleteReview(review.id)" class="action-btn" title="Delete Review">
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </div>
              <div class="review-body">
                <StarRating :rating="review.rating" />
                <p v-if="review.text" class="review-text">"{{ review.text }}"</p>
                <div v-if="review.photoURL" class="review-photo-container">
                  <img :src="review.photoURL" alt="Review photo" class="review-photo" />
                </div>
                <div v-if="review.tags && review.tags.length > 0" class="tags-container">
                  <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import StarRating from './StarRating.vue';

export default {
  name: 'RestaurantReviewsModal',
  components: { StarRating },
  props: {
    restaurant: {
      type: Object,
      required: true
    },
    user: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'reviews-updated'],
  setup(props, { emit }) {
    const editingReview = ref(null);

    const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleDateString();
    };

    const startEditing = (review) => {
      editingReview.value = JSON.parse(JSON.stringify(review));
    };

    const cancelEdit = () => {
      editingReview.value = null;
    };

    const saveEdit = async () => {
      if (!editingReview.value) return;
      const reviewRef = doc(db, 'reviews', editingReview.value.id);
      try {
        await updateDoc(reviewRef, {
          rating: editingReview.value.rating,
          text: editingReview.value.text
        });
        emit('reviews-updated');
        cancelEdit();
      } catch (error) {
        console.error("Error updating review:", error);
        alert("Failed to save review. Please try again.");
      }
    };

    const deleteReview = async (reviewId) => {
      if (confirm("Are you sure you want to delete this review?")) {
        try {
          await deleteDoc(doc(db, 'reviews', reviewId));
          emit('reviews-updated');
        } catch (error) {
          console.error("Error deleting review:", error);
          alert("Failed to delete review. Please try again.");
        }
      }
    };

    return {
      formatDate,
      editingReview,
      startEditing,
      cancelEdit,
      saveEdit,
      deleteReview
    };
  }
};
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: var(--card-background); padding: 2em; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1em; margin-bottom: 1em; }
.modal-header h2 { margin: 0; }
.close-btn { background: none; border: none; font-size: 2em; cursor: pointer; color: #777; }
.modal-body { overflow-y: auto; }
.loading-indicator, .no-reviews-message { text-align: center; color: #777; padding: 3em; }
.reviews-list { list-style: none; padding: 0; margin: 0; }
.review-item { border-bottom: 1px solid #eee; padding: 1.5em 0; }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; align-items: center; gap: 1em; margin-bottom: 1em; position: relative; }
.user-avatar { width: 40px; height: 40px; border-radius: 50%; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 600; }
.review-date { font-size: 0.85em; color: #777; }
.review-body { padding-left: 50px; }
.review-text { margin: 0.5em 0; font-style: italic; }
.review-photo-container { margin-top: 1em; }
.review-photo { max-width: 100%; max-height: 300px; border-radius: 8px; }
.tags-container { margin-top: 1em; display: flex; flex-wrap: wrap; gap: 0.5em; }
.tag { background-color: #ecf0f1; color: var(--secondary-color); padding: 4px 10px; border-radius: 15px; font-size: 0.85em; }
.review-actions { margin-left: auto; display: flex; gap: 0.5em; }
.action-btn { background: none; border: none; cursor: pointer; color: #777; padding: 4px; }
.action-btn:hover { color: #333; }
.edit-review-form { display: flex; flex-direction: column; gap: 1em; }
.edit-textarea { width: 100%; min-height: 80px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; font-family: inherit; }
.edit-actions { display: flex; justify-content: flex-end; gap: 0.5em; }
.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.btn-secondary {
  background-color: #ecf0f1;
  color: #34495e;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}
</style>