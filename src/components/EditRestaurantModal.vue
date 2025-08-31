<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Edit Restaurant</h2>
      <form @submit.prevent="onSave" v-if="editableRestaurant">
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" v-model="editableRestaurant.name" type="text" required>
        </div>
        <div class="form-group">
          <label for="address">Address</label>
          <input id="address" v-model="editableRestaurant.address" type="text">
        </div>
        <div class="form-group">
          <label for="city">City</label>
          <input id="city" v-model="editableRestaurant.city" type="text">
        </div>
        <div class="form-group">
          <label for="state">State</label>
          <input id="state" v-model="editableRestaurant.state" type="text">
        </div>
        <div class="form-group">
          <label for="zip">Zip Code</label>
          <input id="zip" v-model="editableRestaurant.zip" type="text">
        </div>
        <div class="form-group">
          <label for="url">Website URL</label>
          <input id="url" v-model="editableRestaurant.url" type="url" placeholder="https://example.com">
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
import { ref, watch } from 'vue';

export default {
  name: 'EditRestaurantModal',
  props: {
    restaurant: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const editableRestaurant = ref(null);

    watch(() => props.restaurant, (newVal) => {
      if (newVal) {
        // Create a deep copy to avoid mutating the prop directly
        editableRestaurant.value = JSON.parse(JSON.stringify(newVal));
      }
    }, { immediate: true, deep: true });

    const onSave = () => {
      emit('save', editableRestaurant.value);
    };

    return {
      editableRestaurant,
      onSave
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
  width: 90%;
  max-width: 500px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.form-group {
  margin-bottom: 1.5em;
}
.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
}
.form-group input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1em;
  margin-top: 2em;
}
.modal-actions button {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.btn-save {
  background-color: var(--primary-color);
  color: white;
}
.btn-cancel {
  background-color: #ecf0f1;
  color: var(--secondary-color);
}
</style>