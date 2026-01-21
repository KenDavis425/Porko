<template>
  <div class="review-page">
    <div class="review-card">
      <form @submit.prevent="submitReview">
        <div class="form-group">
          <label for="restaurant">Restaurant</label>
          <select id="restaurant" v-model="selectedRestaurant" :disabled="!!selectedRestaurantId" required>
            <option disabled value="">Please select a restaurant</option>
            <option v-for="restaurant in restaurants" :key="restaurant.id" :value="restaurant.id">
              {{ restaurant.name }}
            </option>
          </select>
          <div class="add-restaurant-prompt" v-if="!selectedRestaurantId">
            Can't find the restaurant?
            <button type="button" class="link-button" @click="showAddRestaurantForm = !showAddRestaurantForm">
              {{ showAddRestaurantForm ? 'Cancel' : 'Add a new one' }}
            </button>
          </div>
        </div>

        <div v-if="showAddRestaurantForm" class="add-restaurant-form">
          <h3 class="add-restaurant-header">Add New Restaurant</h3>
          <div class="form-group">
            <label for="new-rest-name">Name</label>
            <input id="new-rest-name" v-model="newRestaurant.name" type="text" required>
          </div>
          <div class="form-group">
            <label for="new-rest-address">Address</label>
            <input id="new-rest-address" v-model="newRestaurant.address" type="text" required>
          </div>
          <div class="form-group">
            <label for="new-rest-city">City</label>
            <input id="new-rest-city" v-model="newRestaurant.city" type="text">
          </div>
          <div class="form-group">
            <label for="new-rest-state">State</label>
            <select id="new-rest-state" v-model="newRestaurant.state">
              <option value="">-- Select a State --</option>
              <option v-for="state in usStates" :key="state" :value="state">{{ state }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="new-rest-zip">Zip Code</label>
            <input id="new-rest-zip" v-model="newRestaurant.zip" type="text">
          </div>
          <div class="form-group">
            <label for="url">Website URL</label>
            <input id="url" v-model="newRestaurant.url" type="url" placeholder="https://example.com" />
          </div>
          <button type="button" class="btn-save-restaurant" @click="saveNewRestaurant" :disabled="isSavingRestaurant">
            {{ isSavingRestaurant ? 'Saving...' : 'Save Restaurant' }}
          </button>
          <p v-if="addRestaurantError" class="error-message">{{ addRestaurantError }}</p>
        </div>

        <div class="form-group">
          <label>Photo</label>
          <div v-if="!photoDataUrl" class="photo-actions">
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
          <div v-else class="photo-preview">
            <img :src="photoDataUrl" alt="Review photo preview" />
            <button type="button" @click="removePhoto" class="btn-remove-photo" title="Remove Photo">&times;</button>
          </div>
        </div>
        <div v-if="isCameraOpen" class="camera-modal">
          <video ref="videoPlayer" class="camera-video" autoplay playsinline></video>
          <button type="button" @click="capturePhoto" class="btn-capture">Capture</button>
          <button type="button" @click="closeCamera" class="btn-cancel-camera">Cancel</button>
        </div>

        <div class="form-group">
          <label>Rating</label>
          <div class="star-rating-input">
            <span v-for="star in 5" :key="star"
              class="star"
              @mouseover="hoverRating = star"
              @mouseleave="hoverRating = 0"
              @click="rating = star"
              :title="`${star} star${star > 1 ? 's' : ''}`"
            >
              <svg height="28px" width="28px" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path :d="getStarPath(star)" />
              </svg>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Tags</label>
          <div class="tags-container">
            <button
              v-for="tag in tags"
              :key="tag.id"
              type="button"
              class="tag-btn"
              :class="{ selected: selectedTags.includes(tag.name) }"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="new-tag">Add a new tag</label>
          <div class="new-tag-input">
            <input id="new-tag" v-model.trim="newTag" @keydown.enter.prevent="addNewTag" placeholder="e.g., crispy, peppery, huge">
            <button type="button" @click="addNewTag" :disabled="!newTag.trim()">Add Tag</button>
          </div>
        </div>

        <div class="form-group">
          <label for="comment">Comment</label>
          <textarea id="comment" v-model="comment" rows="4" placeholder="How was the tenderloin?"></textarea>
          <span v-if="comment.length > 0" class="char-count">{{ comment.length }} characters</span>
        </div>

        <div v-if="showPreview && selectedRestaurant && rating" class="review-preview">
          <h3>Preview</h3>
          <div class="preview-content">
            <div class="preview-restaurant">{{ getRestaurantName(selectedRestaurant) }}</div>
            <StarRating :rating="rating" />
            <p v-if="comment">{{ comment }}</p>
            <div v-if="selectedTags.length > 0" class="tags-container">
              <span v-for="tag in selectedTags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div v-if="photoDataUrl" class="photo-preview">
              <img :src="photoDataUrl" alt="Review photo preview" />
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="showPreview = !showPreview" class="btn-secondary" v-if="selectedRestaurant && rating">
            {{ showPreview ? 'Hide Preview' : 'Preview Review' }}
          </button>
          <button type="submit" :disabled="submitting || !selectedRestaurant || !rating">
            {{ submitting ? 'Submitting...' : 'Submit Review' }}
          </button>
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>
<script>
import { ref, onMounted, nextTick } from 'vue';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, where, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getDistance } from '../utils/geolocation.js';
import { geocodeAddress } from '../utils/geocoding.js';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { showToast } from '../utils/toast.js';

export default {
  name: 'Review',
  props: {
    selectedRestaurantId: {
      type: String,
      default: null
    }
  },
  emits: ['reviewed'],
  setup(props, { emit }) {
    const usStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    
    const restaurants = ref([]);
    const selectedRestaurant = ref(props.selectedRestaurantId || null);
    const rating = ref(null);
    const hoverRating = ref(0);
    const comment = ref('');
    const submitting = ref(false);
    const errorMessage = ref('');
    const tags = ref([]);
    const selectedTags = ref([]);
    const newTag = ref('');
    const showAddRestaurantForm = ref(false);
    const newRestaurant = ref({ name: '', address: '', city: '', state: '', zip: '', url: '' });
    const isSavingRestaurant = ref(false);
    const addRestaurantError = ref('');
    const isCameraOpen = ref(false);
    const photoDataUrl = ref(null);
    const videoPlayer = ref(null);
    const stream = ref(null);
    const fileInput = ref(null);
    const userLocation = ref(null);
    const showPreview = ref(false);

    // SVG paths for stars
    const fullStarPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z";
    const emptyStarPath = "M22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z";

    const fetchTags = async () => {
      const tagsQuery = query(collection(db, 'tags'), orderBy('name'));
      const tagsSnapshot = await getDocs(tagsQuery);
      tags.value = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const getUserLocation = () => {
      return new Promise((resolve) => {
        if (navigator.geolocation && !props.selectedRestaurantId) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              userLocation.value = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              resolve();
            },
            () => resolve(), // Resolve even on error to not block
            { timeout: 5000 }
          );
        } else {
          resolve();
        }
      });
    };

    const selectClosestRestaurant = () => {
      if (!userLocation.value || restaurants.value.length === 0) return;

      let closestRestaurant = null;
      let minDistance = Infinity;

      restaurants.value.forEach(restaurant => {
        if (restaurant.location) {
          const distance = getDistance(
            userLocation.value.lat,
            userLocation.value.lng,
            restaurant.location.lat,
            restaurant.location.lng
          );
          if (distance !== null && distance < minDistance) {
            minDistance = distance;
            closestRestaurant = restaurant;
          }
        }
      });

      if (closestRestaurant) {
        selectedRestaurant.value = closestRestaurant.id;
      }
    };

    const fetchInitialData = async () => {
      if (props.selectedRestaurantId) {
        const restaurantRef = doc(db, 'restaurants', props.selectedRestaurantId);
        const restaurantSnap = await getDoc(restaurantRef);
        if (restaurantSnap.exists()) {
            restaurants.value = [{ id: restaurantSnap.id, ...restaurantSnap.data() }];
        }
      } else {
        const restaurantsQuery = query(collection(db, 'restaurants'), orderBy('name'));
        const restaurantsSnapshot = await getDocs(restaurantsQuery);
        restaurants.value = restaurantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        await getUserLocation();
        selectClosestRestaurant();
      }
    };

    onMounted(async () => {
      await Promise.all([fetchTags(), fetchInitialData()]);
    });

    const getStarPath = (starIndex) => {
      const displayRating = hoverRating.value || rating.value;
      return displayRating >= starIndex ? fullStarPath : emptyStarPath;
    };

    const getRestaurantName = (restaurantId) => {
      const restaurant = restaurants.value.find(r => r.id === restaurantId);
      return restaurant?.name || 'Selected Restaurant';
    };

    const toggleTag = (tagName) => {
      const index = selectedTags.value.indexOf(tagName);
      if (index > -1) {
        selectedTags.value.splice(index, 1);
      } else {
        selectedTags.value.push(tagName);
      }
    };

    const addNewTag = async () => {
      const tagName = newTag.value.toLowerCase();
      if (!tagName || tags.value.some(t => t.name === tagName)) {
        newTag.value = '';
        return;
      }

      try {
        const newDocRef = await addDoc(collection(db, 'tags'), {
          name: tagName,
          createdAt: serverTimestamp()
        });
        const newTagObject = { id: newDocRef.id, name: tagName };
        tags.value.push(newTagObject);
        tags.value.sort((a, b) => a.name.localeCompare(b.name));
        selectedTags.value.push(tagName);
        newTag.value = '';
      } catch (error) {
        errorMessage.value = "Failed to add new tag.";
        console.error("Error adding new tag: ", error);
      }
    };

    const saveNewRestaurant = async () => {
      const name = newRestaurant.value.name.trim();
      const address = newRestaurant.value.address.trim();

      if (!name || !address) {
        addRestaurantError.value = "Restaurant name and address are required.";
        return;
      }
      isSavingRestaurant.value = true;
      addRestaurantError.value = '';

      try {
        // Check for duplicates
        const q = query(collection(db, 'restaurants'), where('name', '==', name), where('address', '==', address));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          addRestaurantError.value = "This restaurant already exists in the database.";
          isSavingRestaurant.value = false;
          return;
        }

        const fullAddress = [newRestaurant.value.address, newRestaurant.value.city, newRestaurant.value.state, newRestaurant.value.zip].filter(Boolean).join(', ');
        const location = await geocodeAddress(fullAddress);

        if (!location) {
          addRestaurantError.value = "Could not find a location for the provided address. Please check the address and try again.";
          isSavingRestaurant.value = false;
          return;
        }

        // Add new restaurant
        const docData = {
          ...newRestaurant.value,
          name,
          address,
          location,
          createdAt: serverTimestamp(),
        };
        const newDocRef = await addDoc(collection(db, 'restaurants'), docData);

        // Update local state
        const addedRestaurant = { id: newDocRef.id, ...docData };
        restaurants.value.push(addedRestaurant);
        restaurants.value.sort((a, b) => a.name.localeCompare(b.name));
        selectedRestaurant.value = newDocRef.id;

        // Reset form
        showAddRestaurantForm.value = false;
        newRestaurant.value = { name: '', address: '', city: '', state: '', zip: '', url: '' };
      } catch (error) {
        console.error("Error saving new restaurant:", error);
        addRestaurantError.value = "Failed to save restaurant. Please try again.";
      } finally {
        isSavingRestaurant.value = false;
      }
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
        errorMessage.value = "Could not access the camera. Please check permissions.";
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
      closeCamera();
    };

    const removePhoto = () => {
      photoDataUrl.value = null;
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
        };
        reader.readAsDataURL(file);
      }
    };

    const submitReview = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !selectedRestaurant.value || !rating.value) {
        errorMessage.value = "Please select a restaurant and provide a rating.";
        return;
      }
      submitting.value = true;
      errorMessage.value = '';

      try {
        let photoURL = null;
        if (photoDataUrl.value) {
            const storage = getStorage();
            const filePath = `reviews/${currentUser.uid}/${Date.now()}.jpg`;
            const photoRef = storageRef(storage, filePath);
            const uploadResult = await uploadString(photoRef, photoDataUrl.value, 'data_url');
            photoURL = await getDownloadURL(uploadResult.ref);
        }

        const timestamp = serverTimestamp();

        // Add a review document
        await addDoc(collection(db, 'reviews'), {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          userPhoto: currentUser.photoURL || null,
          restaurantId: selectedRestaurant.value,
          photoURL,
          rating: rating.value,
          text: comment.value,
          tags: selectedTags.value,
          createdAt: timestamp,
          lastActivityAt: timestamp
        });

        // Update the user's reviewCount atomically (non-blocking - don't fail if this errors)
        // Using increment() ensures thread-safe updates and handles the case where reviewCount doesn't exist yet
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, { reviewCount: increment(1) });
        } catch (countError) {
          console.warn("Failed to update reviewCount (non-critical):", countError);
          // Don't fail the entire submission if reviewCount update fails
        }

        // Check if this restaurant is on the bucket list and mark as complete (non-blocking)
        try {
          const bucketListQuery = query(
            collection(db, 'bucketListItems'),
            where('userId', '==', currentUser.uid),
            where('restaurantId', '==', selectedRestaurant.value)
          );
          const bucketListSnapshot = await getDocs(bucketListQuery);
          if (!bucketListSnapshot.empty) {
            const bucketListItemDoc = bucketListSnapshot.docs[0];
            await updateDoc(bucketListItemDoc.ref, { completedAt: timestamp });
          }
        } catch (bucketError) {
          console.warn("Failed to update bucket list (non-critical):", bucketError);
          // Don't fail the entire submission if bucket list update fails
        }

        showToast('Review submitted successfully!', 'success', 2000);
        // Small delay to show success message before navigation
        await new Promise(resolve => setTimeout(resolve, 500));
        emit('reviewed');
      } catch (error) {
        console.error("Error submitting check-in: ", error);
        errorMessage.value = "Failed to submit check-in. Please try again.";
        showToast("Failed to submit check-in. Please try again.", 'error');
      } finally {
        submitting.value = false;
      }
    };

    return {
      usStates,
      restaurants,
      selectedRestaurant,
      rating,
      hoverRating,
      comment,
      submitting,
      errorMessage,
      getStarPath,
      submitReview,
      tags,
      selectedTags,
      newTag,
      toggleTag,
      addNewTag,
      showAddRestaurantForm,
      newRestaurant,
      isSavingRestaurant,
      addRestaurantError,
      saveNewRestaurant,
      isCameraOpen,
      photoDataUrl,
      videoPlayer,
      openCamera, closeCamera, capturePhoto, removePhoto,
      fileInput,
      triggerFileUpload,
      handleFileUpload,
      showPreview,
      getRestaurantName
    };
  }
};
</script>

<style scoped>
.review-page {
  max-width: 700px;
  margin: 0 auto;
}
.review-card {
  background: var(--card-background);
  padding: 2em;
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}
.form-group {
  margin-bottom: 1.5em;
}
.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
}
.form-group input[type="text"],
.form-group input[type="url"],
.form-group select,
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
.photo-actions {
  display: flex;
  gap: 1em;
}
.star-rating-input:hover .star {
  color: #f39c12;
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
  max-width: 100%;
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
.add-restaurant-prompt {
  font-size: 0.9em;
  margin-top: 0.8em;
}
.link-button {
  background: none;
  border: none;
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}
.add-restaurant-form {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5em;
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  background-color: #f9f9f9;
}
.add-restaurant-header {
  margin-top: 0;
  margin-bottom: 1em;
  font-size: 1.2em;
}
.btn-save-restaurant {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
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
.char-count {
  font-size: 0.85em;
  color: #777;
  margin-top: 0.25em;
  display: block;
}
.review-preview {
  background: var(--card-background);
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  padding: 1.5em;
  margin: 1.5em 0;
}
.review-preview h3 {
  margin: 0 0 1em 0;
  color: var(--primary-color);
}
.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
}
.preview-restaurant {
  font-weight: 600;
  font-size: 1.1em;
  color: var(--text-color);
}
.photo-preview {
  margin-top: 0.5em;
}
.photo-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
}
.form-actions {
  display: flex;
  gap: 1em;
  align-items: center;
  margin-top: 1em;
}
.btn-secondary {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.btn-secondary:hover {
  background-color: #7f8c8d;
}
.new-tag-input {
  display: flex;
  gap: 0.5em;
}
.new-tag-input input {
  flex-grow: 1;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  box-sizing: border-box;
}
.new-tag-input button {
  background-color: #2ecc71;
  white-space: nowrap;
}
.new-tag-input button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.error-message {
  color: #e74c3c;
  margin-top: 1em;
}
button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1em;
  transition: background-color 0.2s;
}
button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>