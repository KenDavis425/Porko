#!/usr/bin/env node
/**
 * Admin backfill script for updating users.reviewCount from reviews collection.
 * 
 * PURPOSE:
 * This script synchronizes the `reviewCount` field in the `users` collection by counting
 * the actual number of reviews each user has in the `reviews` collection. This is useful
 * when:
 * - The reviewCount field is out of sync with actual review data
 * - Migrating data or fixing inconsistencies
 * - Adding the reviewCount field for the first time
 * 
 * HOW IT WORKS:
 * 1. Connects to Firestore using admin SDK (requires service account credentials)
 * 2. Reads ALL reviews and counts how many each user has
 * 3. Maps user IDs to their document references
 * 4. Updates all user documents with the correct reviewCount using batched writes
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Uses batched writes to minimize Firestore operations (max 500 ops per batch)
 * - Reads entire collections into memory (works for moderate-sized databases)
 * - For very large databases (100k+ reviews), consider adding pagination
 * 
 * Usage:
 * 1. Install firebase-admin: npm install firebase-admin --save-dev
 * 2. Provide a service account key JSON at scripts/serviceAccountKey.json OR set
 *    the GOOGLE_APPLICATION_CREDENTIALS env var to an absolute path.
 * 3. Run: node scripts/backfill-admin.js
 * 
 * PREREQUISITES:
 * - Firebase Admin SDK service account key with Firestore read/write permissions
 * - Node.js environment
 * - Access to the Firestore database
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

/**
 * Main execution function - orchestrates the entire backfill process
 */
async function main() {
  // ============================================================================
  // STEP 1: Initialize Firebase Admin SDK with service account credentials
  // ============================================================================
  
  // Determine the path to the service account key file
  // Priority: environment variable > default location in scripts directory
  // The GOOGLE_APPLICATION_CREDENTIALS env var allows flexibility for different
  // deployment environments (dev, staging, prod) without changing code
  const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                  path.join(__dirname, 'serviceAccountKey.json');
  
  // Validate that the service account key file exists before proceeding
  // Without this, Firebase initialization would fail with a cryptic error
  if (!fs.existsSync(svcPath)) {
    console.error('Service account key not found at', svcPath);
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in scripts/');
    process.exit(1);
  }

  // Initialize the Firebase Admin SDK
  // This grants the script elevated privileges to read/write all Firestore data
  // (unlike client SDK which is subject to security rules)
  admin.initializeApp({
    credential: admin.credential.cert(require(svcPath))
  });

  // Get a reference to the Firestore database
  // All subsequent operations will use this db instance
  const db = admin.firestore();
  console.log('Connected to Firestore (admin)');

  // ============================================================================
  // STEP 2: Aggregate review counts per user
  // ============================================================================
  
  // Read ALL reviews from the reviews collection
  // NOTE: This loads everything into memory. For very large collections (100k+),
  // you might want to use pagination with startAfter() for better memory usage
  console.log('Reading reviews...');
  const reviewsSnap = await db.collection('reviews').get();
  
  // Use Object.create(null) instead of {} to create a "pure" object without
  // prototype chain, which is slightly faster and avoids potential conflicts
  // with Object.prototype properties (though unlikely here)
  const counts = Object.create(null);
  
  // Iterate through each review document and count reviews per userId
  reviewsSnap.forEach(r => {
    const data = r.data(); // Extract the document data as a plain JavaScript object
    const uid = data.userId; // Get the userId field from the review document
    
    // Skip reviews that don't have a userId (data integrity check)
    // This could happen if old data exists before userId was required
    if (!uid) return;
    
    // Increment the count for this user
    // (counts[uid] || 0) ensures we start at 0 if this is the first review for this user
    counts[uid] = (counts[uid] || 0) + 1;
  });
  
  // Extract all unique user IDs that have at least one review
  const userIds = Object.keys(counts);
  console.log(`Found ${reviewsSnap.size} reviews across ${userIds.length} users.`);

  // ============================================================================
  // STEP 3: Build a mapping from user ID to user document reference
  // ============================================================================
  
  // We need to map user IDs to their document references so we can update them
  // This approach reads all users once instead of making individual queries
  // for each user (which would be much slower and hit query limits)
  console.log('Reading users collection to map UIDs to docs...');
  const usersSnap = await db.collection('users').get();
  
  // Create a map: uid -> DocumentReference
  // This allows O(1) lookup when we need to update a user document
  const uidToDocRef = Object.create(null);
  
  usersSnap.forEach(u => {
    const d = u.data(); // Get user document data
    
    // Handle two possible scenarios:
    // 1. The user document has a 'uid' field (explicit user ID field)
    // 2. The document ID itself is the user ID (common pattern)
    // The ?? operator uses u.id if d?.uid is null or undefined
    const uid = d?.uid || u.id;
    
    // Store the document reference for later use in batch updates
    // u.ref is a DocumentReference that points to this user document
    if (uid) uidToDocRef[uid] = u.ref;
  });
  console.log(`Mapped ${Object.keys(uidToDocRef).length} user docs.`);

  // ============================================================================
  // STEP 4: Perform batched updates to user documents
  // ============================================================================
  
  // Firestore has a limit of 500 operations per batch write
  // We use 400 as a safety margin to avoid hitting the limit due to
  // other operations or future code changes
  const entries = userIds; // All user IDs we found in the reviews
  let processed = 0; // Counter for progress tracking
  const batchLimit = 400; // Safety margin: Firestore max is 500, we use 400
  let batch = db.batch(); // Create the first batch
  let opsInBatch = 0; // Track operations in current batch

  // Iterate through each user that has reviews
  for (const uid of entries) {
    // Get the review count we calculated earlier for this user
    const count = counts[uid];
    
    // Look up the user document reference we mapped earlier
    const userRef = uidToDocRef[uid];
    
    // Safety check: if we found a review with a userId but no matching user doc,
    // this indicates data inconsistency (orphaned review or deleted user)
    if (!userRef) {
      console.warn(`No user document found for uid=${uid} — skipping`);
      processed++; // Still count it as processed to track total
      continue; // Skip to next user
    }
    
    // Add an update operation to the current batch
    // This doesn't write to Firestore yet - we'll commit the batch later
    // The update will set/overwrite the reviewCount field for this user
    batch.update(userRef, { reviewCount: count });
    opsInBatch++;
    processed++;

    // Check if we've reached the batch limit
    // When we hit the limit, we must commit the current batch before adding more operations
    if (opsInBatch >= batchLimit) {
      console.log(`Committing batch after ${opsInBatch} updates (processed ${processed}/${entries.length})`);
      
      // Commit this batch to Firestore - this is an atomic operation
      // All updates in the batch succeed or fail together
      await batch.commit();
      
      // Create a new batch for the next set of updates
      batch = db.batch();
      opsInBatch = 0; // Reset counter for new batch
    }
  }

  // Don't forget the final batch! If there are remaining operations that didn't
  // fill up a complete batch, we need to commit them too
  if (opsInBatch > 0) {
    console.log(`Committing final batch with ${opsInBatch} updates`);
    await batch.commit();
  }

  // Success - all users have been updated
  console.log(`Backfill complete. Processed ${processed} users.`);
  process.exit(0); // Exit with success code (0)
}

// ============================================================================
// Error Handling
// ============================================================================

// Execute main() and catch any errors that occur
// This ensures we always exit with an appropriate error code
// Exit codes: 0 = success, 1 = missing credentials, 2 = execution error
main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(2); // Exit with error code 2 to indicate execution failure
});
