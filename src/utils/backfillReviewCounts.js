import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

// Aggregates review counts per user and writes reviewCount to each user document.
export default async function backfillReviewCounts(onProgress) {
  if (onProgress) onProgress('Starting backfill...');

  // Read all reviews
  const reviewsSnap = await getDocs(collection(db, 'reviews'));
  const counts = {};
  reviewsSnap.forEach(r => {
    const data = r.data();
    const uid = data.userId;
    if (!uid) return;
    counts[uid] = (counts[uid] || 0) + 1;
  });

  if (onProgress) onProgress(`Found ${Object.keys(counts).length} users with reviews.`);

  // For each userId, find user doc(s) where uid == userId and update reviewCount
  const usersCol = collection(db, 'users');
  let processed = 0;
  for (const [uid, count] of Object.entries(counts)) {
    const q = query(usersCol, where('uid', '==', uid));
    const userSnap = await getDocs(q);
    userSnap.forEach(async uDoc => {
      const ref = doc(db, 'users', uDoc.id);
      await updateDoc(ref, { reviewCount: count });
    });
    processed += 1;
    if (onProgress) onProgress(`Updated ${processed}/${Object.keys(counts).length} users...`);
  }

  if (onProgress) onProgress('Backfill complete.');
  return counts;
}
