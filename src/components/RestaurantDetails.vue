<template>
  <div class="restaurant-details-page">
    <button @click="$emit('close')" class="close-btn">Back to List</button>
    <div v-if="loading">Loading details...</div>
    <div v-else-if="details">
      <div class="restaurant-image">
        <img :src="restaurant.photoURL || 'https://via.placeholder.com/150'" alt="Restaurant image" referrerpolicy="no-referrer" />
      </div>
      <h2>{{ details.name }}</h2>
      <p><strong>Address:</strong> {{ displayAddress }}</p>
      <p><strong>Phone:</strong> {{ details.phone }}</p>
      <p><strong>Website:</strong> <a :href="details.website" target="_blank" rel="noopener noreferrer">{{ details.website }}</a></p>
      <p><strong>Description:</strong> {{ details.description }}</p>
      <div class="store-hours">
        <h4>Store Hours</h4>
        <ul>
          <li v-for="(hours, day) in details.hours" :key="day">
            <strong>{{ day }}:</strong> {{ hours }}
          </li>
        </ul>
      </div>
      <div class="reviews">
        <h4>Google Reviews</h4>
        <p><strong>Average Rating:</strong> {{ details.reviews.rating }} ({{ details.reviews.count }} reviews)</p>
        <p>"{{ details.reviews.snippet }}"</p>
      </div>
      <div id="map" class="map-container"></div>
      <button @click="getDirections" class="directions-btn">Get Directions</button>
    </div>
    <div v-else>
      <p>No details found for this restaurant.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';

export default {
  name: 'RestaurantDetails',
  props: {
    restaurant: {
      type: Object,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const loading = ref(true);
    const details = ref(null);
    const map = ref(null);

    const displayAddress = computed(() => {
      const r = props.restaurant;
      if (r.address && r.city && r.state) {
        return `${r.address}, ${r.city}, ${r.state} ${r.zip || ''}`.trim();
      }
      return details.value ? details.value.address : '';
    });

    const loadGoogleMaps = () => {
      return new Promise((resolve) => {
        if (window.google && window.google.maps) {
          return resolve();
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBKm_s48NvZUAOlmB9V9PZhjgOjYmgkji4&callback=initMap`;
        script.async = true;
        script.defer = true;
        window.initMap = () => {
          map.value = new window.google.maps.Map(document.getElementById('map'), {
            center: { lat: props.restaurant.location.lat, lng: props.restaurant.location.lng },
            zoom: 15
          });
          new window.google.maps.Marker({
            position: { lat: props.restaurant.location.lat, lng: props.restaurant.location.lng },
            map: map.value,
            title: props.restaurant.name
          });
          resolve();
        };
        document.head.appendChild(script);
      });
    };

    const getDirections = () => {
      if (props.restaurant.location) {
        const { lat, lng } = props.restaurant.location;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
      }
    };

    const fetchDetails = async () => {
      loading.value = true;
      // Mocking API call as seen in bundled code
      await new Promise(res => setTimeout(res, 500));
      details.value = {
        name: props.restaurant.name,
        address: '506 N Jefferson St, Huntington, IN 46750', // Mock data
        phone: '(260) 356-6618', // Mock data
        website: props.restaurant.url,
        description: props.restaurant.description,
        hours: {
          Monday: '7:00 AM - 2:00 PM',
          Tuesday: '7:00 AM - 2:00 PM',
          Wednesday: '7:00 AM - 2:00 PM',
          Thursday: '7:00 AM - 2:00 PM',
          Friday: '7:00 AM - 2:00 PM',
          Saturday: '7:00 AM - 2:00 PM',
          Sunday: 'Closed'
        },
        reviews: {
          rating: 4.3,
          count: 150,
          snippet: 'Great food, service, and atmosphere! Breaded tenderloins and pie!'
        }
      };
      loading.value = false;
      await loadGoogleMaps();
    };

    onMounted(fetchDetails);

    return { loading, details, getDirections, displayAddress };
  }
};
</script>

<style scoped>
.restaurant-details-page {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-background);
  padding: 2em;
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}
.restaurant-image {
  text-align: center;
  margin-bottom: 2em;
}
.restaurant-image img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
}
.close-btn, .directions-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.8em 1.2em;
  border-radius: 20px;
  cursor: pointer;
  margin-bottom: 2em;
  transition: background-color 0.3s;
}
.close-btn:hover, .directions-btn:hover {
  background-color: #2980b9;
}
.store-hours, .reviews {
  margin-top: 2em;
  border-top: 1px solid #ecf0f1;
  padding-top: 2em;
}
.store-hours ul {
  list-style: none;
  padding: 0;
}
.map-container {
  height: 400px;
  margin-top: 2em;
  border-radius: 12px;
}
.directions-btn {
  margin-top: 1em;
}
</style>