<template>
  <div class="tags-container">
    <div class="available-tags">
      <span 
        v-for="tag in availableTags" 
        :key="tag" 
        class="tag" 
        :class="{ selected: isSelected(tag) }" 
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </span>
    </div>
    <div class="add-tag-form">
      <input v-model="newTag" @keyup.enter="addNewTag" placeholder="Add a new tag" />
      <button @click="addNewTag">Add Tag</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export default {
  name: 'Tags',
  props: {
    modelValue: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const availableTags = ref([]);
    const selectedTags = ref([...props.modelValue]);
    const newTag = ref('');

    const fetchTags = async () => {
      const tagsSnap = await getDocs(collection(db, 'tags'));
      availableTags.value = tagsSnap.docs.map(doc => doc.data().name);
    };

    onMounted(fetchTags);

    watch(selectedTags, (newValue) => {
      emit('update:modelValue', newValue);
    });

    const isSelected = (tag) => {
      return selectedTags.value.includes(tag);
    };

    const toggleTag = (tag) => {
      if (isSelected(tag)) {
        selectedTags.value = selectedTags.value.filter(t => t !== tag);
      } else {
        selectedTags.value.push(tag);
      }
    };

    const addNewTag = async () => {
      if (newTag.value.trim() === '') return;
      const tagToAdd = newTag.value.trim();
      if (!availableTags.value.includes(tagToAdd)) {
        await addDoc(collection(db, 'tags'), { name: tagToAdd });
        availableTags.value.push(tagToAdd);
      }
      toggleTag(tagToAdd);
      newTag.value = '';
    };

    return { availableTags, selectedTags, newTag, isSelected, toggleTag, addNewTag };
  }
};
</script>

<style scoped>
.tags-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.available-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  background: #ccc;
  color: #333;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.tag.selected {
  background: #e67e22;
  color: #fff;
}
.add-tag-form {
  display: flex;
  gap: 8px;
}
.add-tag-form input {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e67e22;
}
.add-tag-form button {
  background: #e67e22;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
</style>
