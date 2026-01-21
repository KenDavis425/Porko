<template>
  <div class="restaurant-form-page">
    <h2>{{ isEditing ? 'Edit Restaurant' : 'Add Restaurant' }}</h2>
    <div class="form-container">
      <input v-model="form.name" placeholder="Name" />
      <input v-model="form.description" placeholder="Description" />
      <input v-model="form.address" placeholder="Address" />
      <input v-model="form.city" placeholder="City" />
      <select v-model="form.state">
        <option value="" disabled>State</option>
        <option v-for="state in usStates" :key="state" :value="state">{{ state }}</option>
      </select>
      <input v-model="form.zip" placeholder="Zip Code" />
      <input v-model="form.url" placeholder="Website URL" />
      <div class="form-actions">
        <button @click="saveRestaurant">{{ isEditing ? 'Update' : 'Save' }}</button>
        <button @click="cancel">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { db } from '../firebase';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';

export default {
  name: 'RestaurantForm',
  props: {
    restaurantId: { type: String, default: null }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const usStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    const form = reactive({
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      url: ''
    });
    const isEditing = ref(false);

    onMounted(async () => {
      if (props.restaurantId) {
        isEditing.value = true;
        const restaurantRef = doc(db, 'restaurants', props.restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);
        if (restaurantSnap.exists()) {
          const data = restaurantSnap.data();
          form.name = data.name;
          form.description = data.description;
          form.address = data.address;
          form.city = data.city;
          form.state = data.state;
          form.zip = data.zip;
          form.url = data.url;
        }
      }
    });

    const saveRestaurant = async () => {
      if (isEditing.value) {
        const restaurantRef = doc(db, 'restaurants', props.restaurantId);
        await updateDoc(restaurantRef, { ...form });
      } else {
        await addDoc(collection(db, 'restaurants'), {
          ...form,
          location: { lat: 41.5, lng: -90.5 } // Default location for new restaurants
        });
      }
      emit('close');
    };

    const cancel = () => {
      emit('close');
    };

    return { form, isEditing, saveRestaurant, cancel, usStates };
  }
};
</script>

<style scoped>
.restaurant-form-page {
  max-width: 700px;
  margin: 0 auto;
  background: #fffbe6;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 32px 24px;
}
.form-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-container input,
.form-container select {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e67e22;
  font-size: 1em;
  background-color: #fff;
  font-family: inherit;
}
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.form-actions button {
  background: #e67e22;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
}
</style>
