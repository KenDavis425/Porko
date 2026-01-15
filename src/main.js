import { createApp } from 'vue';
import App from './App.vue';
import { seedSampleData } from './sampleData';

// --- How to seed your database ---
// 1. Uncomment the line below.
// 2. Run your app (e.g., 'npm run dev') and let the page load. An alert will pop up when it's done.
// 3. Re-comment the line so it doesn't run again on the next app launch.
// seedSampleData();

createApp(App).mount('#app');