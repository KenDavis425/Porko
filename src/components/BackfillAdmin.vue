<template>
  <div class="backfill-page">
    <h2>Backfill Review Counts</h2>
    <p class="description">
      This tool recalculates and updates the <code>reviewCount</code> field for all users 
      by counting their actual reviews in the database. Use this to fix discrepancies 
      between the leaderboard and actual review counts.
    </p>
    
    <div v-if="!isAdmin" class="error-message">
      <p>⛔ Only administrators can access this tool.</p>
    </div>
    
    <div v-else class="backfill-container">
      <div class="info-box">
        <h3>How it works:</h3>
        <ol>
          <li>Scans all reviews in the database</li>
          <li>Counts reviews per user</li>
          <li>Updates each user's <code>reviewCount</code> field using batched writes</li>
        </ol>
      </div>

      <button 
        class="btn-primary" 
        :disabled="running || !isAdmin" 
        @click="runBackfill"
      >
        {{ running ? 'Running Backfill...' : 'Run Backfill' }}
      </button>

      <div v-if="status" class="status-message" :class="{ 'status-error': hasError }">
        {{ status }}
      </div>

      <div v-if="stats.totalReviews > 0" class="stats-section">
        <h3>Backfill Statistics:</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <strong>Total Reviews Scanned</strong>
            <span>{{ stats.totalReviews }}</span>
          </div>
          <div class="stat-card">
            <strong>Users with Reviews</strong>
            <span>{{ stats.usersWithReviews }}</span>
          </div>
          <div class="stat-card">
            <strong>Users Updated</strong>
            <span>{{ stats.usersUpdated }}</span>
          </div>
        </div>
      </div>

      <div v-if="logs.length > 0" class="log-container">
        <h3>Operation Log:</h3>
        <div class="log-content">
          <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, writeBatch, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default {
  name: 'BackfillAdmin',
  setup() {
    const running = ref(false);
    const status = ref('');
    const logs = ref([]);
    const stats = ref({
      totalReviews: 0,
      usersWithReviews: 0,
      usersUpdated: 0
    });
    const currentUser = ref(null);

    // Check if current user is admin
    const isAdmin = computed(() => {
      return currentUser.value && currentUser.value.email === 'kennected.com@gmail.com';
    });
    const hasError = computed(() => status.value.toLowerCase().includes('error') || status.value.toLowerCase().includes('fail'));

    const appendLog = (msg) => {
      const timestamp = new Date().toLocaleTimeString();
      logs.value.push(`[${timestamp}] ${msg}`);
    };

    onMounted(() => {
      onAuthStateChanged(auth, (user) => {
        currentUser.value = user;
      });
    });

    const runBackfill = async () => {
      if (!isAdmin.value) {
        status.value = 'Error: Only administrators can run this operation.';
        return;
      }

      if (!confirm('This will update reviewCount for all users in the database. This may take a few minutes. Continue?')) {
        return;
      }

      running.value = true;
      status.value = 'Starting backfill...';
      logs.value = [];
      stats.value = { totalReviews: 0, usersWithReviews: 0, usersUpdated: 0 };

      try {
        // ============================================================================
        // STEP 1: Aggregate review counts per user (with pagination for large datasets)
        // ============================================================================
        appendLog('Reading reviews collection...');
        const counts = new Map();
        const pageSize = 500;
        let lastDoc = null;
        let totalReviews = 0;

        while (true) {
          const reviewsQuery = lastDoc
            ? query(collection(db, 'reviews'), orderBy('createdAt'), startAfter(lastDoc), limit(pageSize))
            : query(collection(db, 'reviews'), orderBy('createdAt'), limit(pageSize));
          
          const reviewsSnap = await getDocs(reviewsQuery);
          if (reviewsSnap.empty) break;

          reviewsSnap.forEach(r => {
            const data = r.data();
            const uid = data.userId;
            if (!uid) return;
            counts.set(uid, (counts.get(uid) || 0) + 1);
            totalReviews += 1;
          });

          lastDoc = reviewsSnap.docs[reviewsSnap.docs.length - 1];
          status.value = `Scanned ${totalReviews} reviews...`;
          appendLog(`Processed ${totalReviews} reviews...`);
        }

        stats.value.totalReviews = totalReviews;
        stats.value.usersWithReviews = counts.size;
        appendLog(`Found ${totalReviews} reviews across ${counts.size} users.`);

        // ============================================================================
        // STEP 2: Build a mapping from user ID to user document reference
        // ============================================================================
        appendLog('Reading users collection to map UIDs to document references...');
        const usersSnap = await getDocs(collection(db, 'users'));
        const uidToDocRef = new Map();

        usersSnap.forEach(u => {
          const d = u.data();
          // Handle both cases: document ID is uid OR document has uid field
          const uid = d?.uid || u.id;
          if (uid) {
            uidToDocRef.set(uid, doc(db, 'users', u.id));
          }
        });

        appendLog(`Mapped ${uidToDocRef.size} user documents.`);

        // ============================================================================
        // STEP 3: Perform batched updates to user documents
        // ============================================================================
        appendLog('Starting batched updates...');
        const entries = Array.from(counts.entries());
        const batchLimit = 400; // Firestore limit is 500, use 400 for safety margin
        let processed = 0;
        let usersUpdated = 0;

        for (let i = 0; i < entries.length; i += batchLimit) {
          const batch = writeBatch(db);
          const slice = entries.slice(i, i + batchLimit);
          let opsInBatch = 0;

          for (const [uid, count] of slice) {
            const userRef = uidToDocRef.get(uid);
            if (!userRef) {
              appendLog(`Warning: No user document found for uid=${uid} — skipping`);
              processed++;
              continue;
            }

            // Check if user document exists before updating
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              batch.update(userRef, { reviewCount: count });
              opsInBatch++;
              usersUpdated++;
            } else {
              appendLog(`Warning: User document does not exist for uid=${uid} — skipping`);
            }
            processed++;
          }

          if (opsInBatch > 0) {
            await batch.commit();
            appendLog(`Committed batch: ${opsInBatch} updates (processed ${processed}/${entries.length})`);
            status.value = `Updated ${processed}/${entries.length} users...`;
          }
        }

        stats.value.usersUpdated = usersUpdated;
        status.value = 'Backfill completed successfully!';
        appendLog(`Backfill complete. Processed ${processed} users, updated ${usersUpdated} user documents.`);
        
      } catch (error) {
        console.error('Backfill failed:', error);
        status.value = `Error: ${error.message || 'Backfill failed. See console for details.'}`;
        appendLog(`ERROR: ${error.message || String(error)}`);
      } finally {
        running.value = false;
      }
    };

    return {
      running,
      status,
      logs,
      stats,
      isAdmin,
      hasError,
      runBackfill
    };
  }
};
</script>

<style scoped>
.backfill-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2em;
}

.description {
  color: #666;
  margin-bottom: 2em;
  line-height: 1.6;
}

.description code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d63384;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 1em;
  color: #c33;
  text-align: center;
}

.backfill-container {
  background: var(--card-background);
  border-radius: 12px;
  padding: 2em;
  box-shadow: 0 4px 15px var(--shadow-color);
}

.info-box {
  background: #f8f9fa;
  border-left: 4px solid var(--primary-color);
  padding: 1em;
  margin-bottom: 2em;
  border-radius: 4px;
}

.info-box h3 {
  margin-top: 0;
  margin-bottom: 0.5em;
}

.info-box ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.info-box li {
  margin: 0.5em 0;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-color-dark, #0056b3);
}

.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.status-message {
  margin-top: 1.5em;
  padding: 1em;
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 8px;
  color: #004085;
}

.status-message.status-error {
  background: #fee;
  border-color: #fcc;
  color: #c33;
}

.stats-section {
  margin-top: 2em;
}

.stats-section h3 {
  margin-bottom: 1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5em;
}

.stat-card {
  background: #f8f9fa;
  padding: 1.5em;
  border-radius: 12px;
  border: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}

.stat-card strong {
  font-size: 0.9em;
  color: #666;
  text-align: center;
}

.stat-card span {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--primary-color);
}

.log-container {
  margin-top: 2em;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1.5em;
}

.log-container h3 {
  color: #fff;
  margin-top: 0;
  margin-bottom: 1em;
}

.log-content {
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  line-height: 1.6;
}

.log-line {
  color: #d4d4d4;
  padding: 2px 0;
}

.log-line:last-child {
  color: #4ec9b0;
  font-weight: 600;
}
</style>
