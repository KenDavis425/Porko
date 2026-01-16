<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Your Review</h2>
        <button @click="$emit('close')" class="close-btn" :disabled="isUploading">&times;</button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="submitReview">
          <div class="form-group">
            <label>Your Rating</label>
            <StarRating :rating="review.rating" :editable="true" @update:rating="newVal => review.rating = newVal" />
          </div>
          <div class="form-group">
            <label for="review-text">Your Review</label>
            <textarea id="review-text" v-model="review.text" placeholder="What did you think?"></textarea>
          </div>
          <div class="form-group">
            <label for="review-photo">Add a Photo</label>
            <input type="file" id="review-photo" @change="handleFileChange" accept="image/*" />
            <div v-if="photoPreview" class="photo-preview-container">
              <img :src="photoPreview" alt="Photo preview" class="photo-preview" />
            </div>
          </div>
          <div v-if="isUploading" class="upload-progress">
            <p>Uploading... {{ uploadProgress.toFixed(0) }}%</p>
            <progress :value="uploadProgress" max="100"></progress>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="isUploading || review.rating === 0">
              {{ isUploading ? 'Submitting...' : 'Submit Review' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import StarRating from './StarRating.vue';
import { showToast } from '../utils/toast.js';

export default {
  name: 'AddReviewModal',
  components: { StarRating },
  props: {
    restaurantId: { type: String, required: true },
    user: { type: Object, required: true }
  },
  emits: ['close', 'review-added'],
  setup(props, { emit }) {
    const review = ref({ rating: 0, text: '' });
    const photoFile = ref(null);
    const photoPreview = ref(null);
    const isUploading = ref(false);
    const uploadProgress = ref(0);
    const error = ref('');

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        photoFile.value = null;
        photoPreview.value = null;
        return;
      }
      if (!file.type.startsWith('image/')) {
        error.value = 'Please select an image file.';
        return;
      }
      photoPreview.value = URL.createObjectURL(file);

      // Image resizing logic
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIMENSION = 1024;
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height *= MAX_DIMENSION / width;
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width *= MAX_DIMENSION / height;
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            photoFile.value = blob;
          }, file.type, 0.9); // Compress JPEG to 90% quality
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    const submitReview = async () => {
      if (review.value.rating === 0) {
        error.value = "Please provide a star rating.";
        return;
      }
      isUploading.value = true;
      error.value = '';

      try {
        let photoURL = null;
        if (photoFile.value) {
          const filePath = `reviews/${props.restaurantId}/${Date.now()}_${props.user.uid}`;
          const fileRef = storageRef(storage, filePath);
          const uploadTask = uploadBytesResumable(fileRef, photoFile.value);

          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                uploadProgress.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              },
              (uploadError) => {
                console.error("Upload failed:", uploadError);
                error.value = "Image upload failed. Please try again.";
                isUploading.value = false;
                reject(uploadError);
              },
              async () => {
                photoURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              }
            );
          });
        }

        const timestamp = serverTimestamp();
        const reviewData = {
          userId: props.user.uid,
          userName: props.user.displayName || 'Anonymous',
          userPhoto: props.user.photoURL,
          restaurantId: props.restaurantId,
          rating: review.value.rating,
          text: review.value.text,
          photoURL: photoURL,
          tags: [], // AddReviewModal doesn't support tags yet
          createdAt: timestamp,
          lastActivityAt: timestamp
        };

        await addDoc(collection(db, 'reviews'), reviewData);
        
        // Update the user's reviewCount atomically
        // Using increment() ensures thread-safe updates and handles the case where reviewCount doesn't exist yet
        const userRef = doc(db, 'users', props.user.uid);
        try {
          await updateDoc(userRef, { reviewCount: increment(1) });
        } catch (countError) {
          console.warn("Failed to update reviewCount (non-critical):", countError);
        }
        
        showToast('Review added successfully!', 'success', 2000);
        emit('review-added', props.restaurantId);
      } catch (e) {
        if (!error.value) { // Don't overwrite upload-specific error
          console.error("Error submitting review:", e);
          error.value = "Failed to submit review. Please try again.";
          showToast("Failed to submit review. Please try again.", 'error');
        }
        isUploading.value = false;
      }
    };

    return { review, photoPreview, isUploading, uploadProgress, error, handleFileChange, submitReview };
  }
};
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: var(--card-background); padding: 2em; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1em; margin-bottom: 1em; }
.modal-header h2 { margin: 0; }
.close-btn { background: none; border: none; font-size: 2em; cursor: pointer; color: #777; }
.modal-body { overflow-y: auto; }
.form-group { margin-bottom: 1.5em; }
.form-group label { display: block; margin-bottom: 0.5em; font-weight: 600; }
.form-group textarea { width: 100%; min-height: 100px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; font-family: inherit; }
.form-group input[type="file"] { width: 100%; }
.photo-preview-container { margin-top: 1em; }
.photo-preview { max-width: 100%; max-height: 200px; border-radius: 8px; }
.upload-progress { margin-top: 1em; }
.upload-progress progress { width: 100%; }
.error-message { color: #e74c3c; margin-bottom: 1em; }
.form-actions { display: flex; justify-content: flex-end; }
.btn-primary { background-color: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-primary:disabled { background-color: #bdc3c7; cursor: not-allowed; }
</style>