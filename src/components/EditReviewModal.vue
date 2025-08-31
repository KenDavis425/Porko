<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div v-if="editableReview" class="modal-content">
      <h2>Edit Review</h2>
      <form @submit.prevent="onSave">
        <div class="form-group">
          <label>Rating</label>
          <div class="star-rating-input">
            <span v-for="star in 5" :key="star" class="star" @mouseover="hoverRating = star" @mouseleave="hoverRating = 0" @click="editableReview.rating = star" :title="`${star} star${star > 1 ? 's' : ''}`">
              <svg height="28px" width="28px" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"></path>
                <path :d="getStarPath(star)"></path>
              </svg>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Photo</label>
          <div v-if="photoDataUrl || editableReview.photoURL" class="photo-preview">
            <img :src="photoDataUrl || editableReview.photoURL" alt="Review photo preview">
            <button type="button" @click="removePhoto" class="btn-remove-photo" title="Remove Photo">&times;</button>
          </div>
          <div v-else class="photo-actions">
            <button type="button" @click="openCamera" class="btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
              Take a Picture
            </button>
            <button type="button" @click="triggerFileUpload" class="btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5v-2z"/></svg>
              Upload Photo
            </button>
            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none">
          </div>
        </div>

        <div v-if="isCameraOpen" class="camera-modal">
          <video ref="videoPlayer" class="camera-video" autoplay playsinline></video>
          <button type="button" @click="capturePhoto" class="btn-capture">Capture</button>
          <button type="button" @click="closeCamera" class="btn-cancel-camera">Cancel</button>
        </div>

        <div class="form-group">
          <label for="comment">Comment</label>
          <textarea id="comment" v-model="editableReview.comment" rows="4"></textarea>
        </div>

        <div class="form-group">
          <label>Tags</label>
          <div class="tags-container">
            <button v-for="tag in allTags" :key="tag.id" type="button" class="tag-btn" :class="{ selected: editableReview.tags.includes(tag.name) }" @click="toggleTag(tag.name)">
              {{ tag.name }}
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn-save">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default {
  name: 'EditReviewModal',
  props: {
    review: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const editableReview = ref(null);
    const hoverRating = ref(0);
    const allTags = ref([]);
    const isCameraOpen = ref(false);
    const photoDataUrl = ref(null);
    const photoRemoved = ref(false);
    const videoPlayer = ref(null);
    const stream = ref(null);
    const fileInput = ref(null);

    const fullStarPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z";
    const emptyStarPath = "M22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z";

    watch(() => props.review, (newReview) => {
      if (newReview) {
        editableReview.value = JSON.parse(JSON.stringify(newReview));
        if (!editableReview.value.tags) {
          editableReview.value.tags = [];
        }
        photoDataUrl.value = null;
        photoRemoved.value = false;
      }
    }, { immediate: true, deep: true });

    onMounted(async () => {
      const tagsQuery = query(collection(db, 'tags'), orderBy('name'));
      const tagsSnapshot = await getDocs(tagsQuery);
      allTags.value = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    const getStarPath = (starIndex) => {
      const displayRating = hoverRating.value || (editableReview.value ? editableReview.value.rating : 0);
      return displayRating >= starIndex ? fullStarPath : emptyStarPath;
    };

    const toggleTag = (tagName) => {
      if (!editableReview.value) return;
      const tags = editableReview.value.tags;
      const index = tags.indexOf(tagName);
      if (index > -1) {
        tags.splice(index, 1);
      } else {
        tags.push(tagName);
      }
    };

    const onSave = () => {
      emit('save', {
        reviewData: editableReview.value,
        newPhotoDataUrl: photoDataUrl.value,
        photoRemoved: photoRemoved.value
      });
    };

    const openCamera = async () => {
      isCameraOpen.value = true;
      await nextTick();
      try {
        stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoPlayer.value) {
          videoPlayer.value.srcObject = stream.value;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        isCameraOpen.value = false;
      }
    };

    const closeCamera = () => {
      if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop());
      }
      isCameraOpen.value = false;
    };

    const capturePhoto = () => {
      const canvas = document.createElement('canvas');
      const video = videoPlayer.value;
      const MAX_WIDTH = 1280;
      const MAX_HEIGHT = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);
      photoDataUrl.value = canvas.toDataURL('image/jpeg', 0.8);
      photoRemoved.value = false;
      closeCamera();
    };

    const removePhoto = () => {
      photoDataUrl.value = null;
      if (editableReview.value) {
        editableReview.value.photoURL = null;
      }
      photoRemoved.value = true;
    };

    const triggerFileUpload = () => {
      fileInput.value.click();
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoDataUrl.value = e.target.result;
          photoRemoved.value = false;
        };
        reader.readAsDataURL(file);
      }
    };

    return {
      editableReview,
      hoverRating,
      allTags,
      getStarPath,
      toggleTag,
      onSave,
      isCameraOpen,
      photoDataUrl,
      videoPlayer,
      openCamera,
      closeCamera,
      capturePhoto,
      removePhoto,
      fileInput,
      triggerFileUpload,
      handleFileUpload
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-background);
  padding: 2em;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5em;
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 1em;
}

.star-rating-input {
  display: flex;
  gap: 0.5em;
}

.star {
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s;
}

.star:hover,
.star:hover ~ .star {
  color: #ccc;
}

.star-rating-input:hover .star {
  color: #f39c12;
}

.photo-actions {
  display: flex;
  gap: 1em;
}

.photo-actions .btn-secondary {
  background-color: #ecf0f1;
  color: var(--secondary-color);
  border: 1px solid #bdc3c7;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
}

.photo-preview {
  position: relative;
  display: inline-block;
}

.photo-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.btn-remove-photo {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.2em;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.camera-video {
  width: 100%;
  max-width: 800px;
  height: auto;
}

.btn-capture, .btn-cancel-camera {
  margin-top: 1em;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.btn-capture { background-color: var(--primary-color); color: white; }
.btn-cancel-camera { background-color: #e74c3c; color: white; margin-left: 1em; }

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 1em;
}

.tag-btn {
  background-color: #ecf0f1;
  color: var(--secondary-color);
  border: 1px solid #bdc3c7;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9em;
}

.tag-btn.selected {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1em;
  margin-top: 2em;
}

.btn-cancel, .btn-save {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.btn-cancel {
  background-color: #ecf0f1;
  color: var(--secondary-color);
}

.btn-save {
  background-color: var(--primary-color);
  color: white;
}
</style>