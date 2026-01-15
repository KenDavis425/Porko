<template>
  <button class="sidebar-link" @click="run" :disabled="running" title="Backfill Leaderboard Counts">
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.69 2.8l1.46 1.46C19.57 15 20 13.56 20 12c0-4.42-3.58-8-8-8zm-6.76.24L3.76 6.71C2.62 8.29 2 10.08 2 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.47.53-2.81 1.41-3.86L5.24 4.24z"/></svg>
    <span>{{ running ? 'Backfilling…' : 'Backfill Leaderboard' }}</span>
  </button>
  <div class="status" v-if="status">{{ status }}</div>
</template>

<script>
import { ref } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc, writeBatch } from 'firebase/firestore';

export default {
  name: 'BackfillButton',
  setup() {
    const running = ref(false);
    const status = ref('');

    const run = async () => {
      if (running.value) return;
      running.value = true;
      status.value = 'Scanning reviews…';

      try {
        const counts = new Map();
        const pageSize = 500;
        let lastDoc = null;
        let total = 0;
        while (true) {
          const q = lastDoc
            ? query(collection(db, 'reviews'), orderBy('createdAt'), startAfter(lastDoc), limit(pageSize))
            : query(collection(db, 'reviews'), orderBy('createdAt'), limit(pageSize));
          const snap = await getDocs(q);
          if (snap.empty) break;

          snap.forEach(d => {
            const data = d.data();
            const uid = data.userId;
            if (!uid) return;
            counts.set(uid, (counts.get(uid) || 0) + 1);
            total++;
          });
          lastDoc = snap.docs[snap.docs.length - 1];
          status.value = `Scanned ${total} reviews…`;
        }

        // Write back in batches
        const entries = Array.from(counts.entries());
        const batchSize = 400;
        let written = 0;
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = writeBatch(db);
          const slice = entries.slice(i, i + batchSize);
          for (const [uid, count] of slice) {
            const userRef = doc(db, 'users', uid);
            // Use set with merge to avoid extra reads
            batch.set(userRef, { reviewCount: count }, { merge: true });
          }
          await batch.commit();
          written += slice.length;
          status.value = `Updated ${written}/${entries.length} users…`;
        }

        status.value = 'Backfill complete';
      } catch (e) {
        console.error(e);
        status.value = 'Backfill failed. Check console.';
      } finally {
        running.value = false;
      }
    };

    return { running, status, run };
  }
};
</script>

<style scoped>
.status {
  padding: 0.25em 1em 0.5em;
  font-size: 12px;
  color: #555;
}
</style>
