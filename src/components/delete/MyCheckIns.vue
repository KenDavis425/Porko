<template>
  <div class="my-check-ins-page">
    <EditCheckInModal
      v-if="isEditModalVisible"
      :checkin="reviewToEdit"
      @close="closeEditModal"
      @save="handleSaveReview"
    />
    <div v-if="loading" class="loading-indicator">Loading your reviews...</div>
    <div v-else-if="populatedReviews.length === 0" class="no-check-ins-message">
      <p>You haven't posted any reviews yet.</p>
      <button @click="$emit('go-to-check-in')">Post your first review!</button>
    </div>
    <div v-else class="check-ins-list">
      <div v-for="review in populatedReviews" :key="review.id" class="check-in-card">
        <div class="card-header">
          <span class="restaurant-name">{{ review.restaurantName }}</span>
          <span class="check-in-date">{{ formatDate(review.createdAt) }}</span>
        </div>
        <div v-if="review.photoURL" class="photo-container">
          <img :src="review.photoURL" alt="Review photo" class="check-in-photo" />
        </div>
        <div class="card-body">
          <div class="rating-display">
            <StarRating :rating="review.rating" />
          </div>
          <p v-if="review.comment" class="comment-text">"{{ review.comment }}"</p>
          <div v-if="review.tags && review.tags.length > 0" class="tags-container">
            <span v-for="tag in review.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="openEditModal(review)" class="action-btn edit-btn">Edit</button>
          <button @click="handleDeleteReview(review)" class="action-btn delete-btn">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import StarRating from './StarRating.vue';
import EditCheckInModal from './EditCheckInModal.vue';

export default {
  name: 'MyCheckIns',
  components: { StarRating, EditCheckInModal },
  emits: ['go-to-check-in'],
  setup() {
    const loading = ref(true);
    const reviews = ref([]);
    const restaurantsMap = ref(new Map());
    const isEditModalVisible = ref(false);
    const reviewToEdit = ref(null);

    const fetchReviews = async () => {
      loading.value = true;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        loading.value = false;
        return;
      }

      try {
        const [reviewsSnapshot, restaurantsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'reviews'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'restaurants'))
        ]);

        restaurantsSnapshot.forEach(doc => {
          restaurantsMap.value.set(doc.id, doc.data());
        });

        reviews.value = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(fetchReviews);

    const populatedReviews = computed(() => {
      return reviews.value.map(review => ({
        ...review,
        comment: review.text,
        restaurantName: restaurantsMap.value.get(review.restaurantId)?.name || 'Unknown Restaurant'
      }));
    });

    const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleDateString();
    };

    const openEditModal = (review) => {
      reviewToEdit.value = review;
      isEditModalVisible.value = true;
    };

    const closeEditModal = () => {
      isEditModalVisible.value = false;
      reviewToEdit.value = null;
    };

    const handleDeleteReview = async (review) => {
      if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
        return;
      }
      try {
        // If there's a photo, schedule it for deletion
        if (review.photoURL) {
          const storage = getStorage();
          const photoRef = storageRef(storage, review.photoURL);
          await deleteObject(photoRef).catch(err => console.error("Error deleting old photo:", err)); // Log error but don't block
        }

        const reviewDocRef = doc(db, 'reviews', review.id);
        await deleteDoc(reviewDocRef);

        // Update local state
        reviews.value = reviews.value.filter(c => c.id !== review.id);
      } catch (error) {
        console.error("Error deleting review:", error);
        alert("Failed to delete review. Please try again.");
      }
    };

    const handleSaveReview = async (updatedPayload) => {
      const { checkinData: reviewData, newPhotoDataUrl, photoRemoved } = updatedPayload;
      const originalReview = reviews.value.find(c => c.id === reviewData.id);

      try {
        let photoURL = originalReview.photoURL;
        const storage = getStorage();

        // Handle photo removal or replacement
        if (newPhotoDataUrl || photoRemoved) {
          if (originalReview.photoURL) {
            const oldPhotoRef = storageRef(storage, originalReview.photoURL);
            await deleteObject(oldPhotoRef).catch(err => console.warn("Could not delete old photo:", err));
          }
        }

        // Handle new photo upload
        if (newPhotoDataUrl) {
          const currentUser = auth.currentUser;
          const filePath = `checkins/${currentUser.uid}/${Date.now()}.jpg`;
          const photoRef = storageRef(storage, filePath);
          const uploadResult = await uploadString(photoRef, newPhotoDataUrl, 'data_url');
          photoURL = await getDownloadURL(uploadResult.ref);
        } else if (photoRemoved) {
          photoURL = null;
        }

        const reviewDocRef = doc(db, 'reviews', reviewData.id);
        await updateDoc(reviewDocRef, {
          rating: reviewData.rating,
          text: reviewData.comment,
          tags: reviewData.tags,
          photoURL: photoURL
        });

        // Update local state
        const index = reviews.value.findIndex(c => c.id === reviewData.id);
        if (index !== -1) {
          reviews.value[index] = { ...reviews.value[index], ...reviewData, photoURL };
        }
        closeEditModal();
      } catch (error) {
        console.error("Error updating review:", error);
        alert("Failed to update review. Please try again.");
      }
    };

    return {
      loading,
      populatedReviews,
      formatDate,
      isEditModalVisible,
      reviewToEdit,
      openEditModal,
      closeEditModal,
      handleDeleteReview,
      handleSaveReview
    };
  }
};
</script>

<style scoped>
.my-check-ins-page { max-width: 800px; margin: 0 auto; }
.loading-indicator, .no-check-ins-message { text-align: center; color: #777; padding: 3em; }
.check-in-card { background: var(--card-background); border-radius: 12px; box-shadow: 0 4px 15px var(--shadow-color); margin-bottom: 1.5em; overflow: hidden; }
.photo-container {
  width: 100%;
  max-height: 400px;
  overflow: hidden;
}
.check-in-photo { width: 100%; height: auto; object-fit: cover; }
.card-header { background-color: #f9f9f9; padding: 1em 1.5em; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.restaurant-name { font-weight: 600; font-size: 1.1em; }
.restaurant-name { font-weight: 600; font-size: 1.1em; word-break: break-word; }
.check-in-date { font-size: 0.9em; color: #777; }
.card-body { padding: 1.5em; }
.rating-display { margin-bottom: 1em; }
.comment-text { font-style: italic; color: #555; margin: 0 0 1em 0; word-break: break-word; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.5em; }
.tag { background-color: #ecf0f1; color: var(--secondary-color); padding: 4px 10px; border-radius: 15px; font-size: 0.85em; }
.card-actions { padding: 0 1.5em 1.5em; display: flex; justify-content: flex-end; gap: 1em; }
.action-btn { background: none; border: 1px solid #ccc; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
.edit-btn { color: var(--primary-color); border-color: var(--primary-color); }
.edit-btn:hover { background-color: var(--primary-color); color: white; }
.delete-btn { color: #e74c3c; border-color: #e74c3c; }
.delete-btn:hover { background-color: #e74c3c; color: white; }
@media (max-width: 768px) {
  .card-actions {
    flex-wrap: wrap;
  }
  .card-actions .action-btn {
    flex-grow: 1;
  }
}
</style>