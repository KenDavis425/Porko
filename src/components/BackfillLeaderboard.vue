<template>
  <div v-if="canSee" class="backfill-card">
    <h3>Leaderboard Backfill</h3>
    <p>Recalculate users.reviewCount from all reviews. Safe to re-run.</p>
    <button class="btn-primary" :disabled="running" @click="runBackfill">{{ running ? 'Running…' : 'Backfill Leaderboard Counts' }}</button>
    <div class="status" v-if="status">{{ status }}</div>
    <div class="log" v-if="logs.length">
      <div v-for="(line, idx) in logs" :key="idx">{{ line }}</div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

export default {
  name: 'BackfillLeaderboard',
  props: {
    user: { type: Object, required: true }
  },
  setup(props) {
    const allowedEmails = new Set(['ken@kennected.com', 'kennected.com@gmail.com']);
    const canSee = computed(() => !!props.user && allowedEmails.has(props.user.email));

    const running = ref(false);
    const status = ref('');
    const logs = ref([]);

    const appendLog = (msg) => {
      logs.value.push(`${new Date().toLocaleTimeString()} - ${msg}`);
    };

    const runBackfill = async () => {
      if (running.value) return;
      running.value = true;
      status.value = 'Starting backfill…';
      logs.value = [];

      try {
        // 1) Read all reviews in pages
        const counts = new Map();
        const pageSize = 500;
        let lastDoc = null;
        let totalReviews = 0;
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
            totalReviews += 1;
          });

          lastDoc = snap.docs[snap.docs.length - 1];
          status.value = `Scanned ${totalReviews} reviews…`;
        }

        appendLog(`Total reviews scanned: ${totalReviews}`);
        appendLog(`Unique users with reviews: ${counts.size}`);

        // 2) Write back counts in batches
        const entries = Array.from(counts.entries());
        const batchSize = 400; // stay under 500 ops per batch
        let written = 0;
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = writeBatch(db);
          const slice = entries.slice(i, i + batchSize);
          for (const [uid, count] of slice) {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              batch.update(userRef, { reviewCount: count });
            } else {
              batch.set(userRef, {
                uid,
                displayName: 'Unknown',
                photoURL: null,
                createdAt: new Date(),
                reviewCount: count
              });
            }
          }
          await batch.commit();
          written += slice.length;
          status.value = `Updated ${written}/${entries.length} users…`;
        }

        status.value = 'Backfill complete';
        appendLog('Backfill complete.');
      } catch (err) {
        console.error(err);
        status.value = 'Backfill failed. See console.';
        appendLog(`Error: ${err.message || err}`);
      } finally {
        running.value = false;
      }
    };

    return { canSee, running, status, logs, runBackfill };
  }
};
</script>

<style scoped>
.backfill-card {
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  padding: 1rem;
  margin: 1rem 0;
}
.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.status { margin-top: 0.5rem; color: #555; }
.log { margin-top: 0.5rem; max-height: 180px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; color: #444; }
</style>
