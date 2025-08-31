// Script to clean up all sample data except for restaurants
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function deleteCollection(collectionName, log) {
  try {
    log(`Deleting all documents from "${collectionName}"...`);
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, collectionName, docSnapshot.id)));
    });
    await Promise.all(deletePromises);
    log(`Finished deleting ${querySnapshot.size} documents from "${collectionName}".`);
  } catch (error) {
    log(`Error cleaning up collection "${collectionName}": ${error.message}`);
    console.error(`Error deleting collection ${collectionName}:`, error);
  }
}

export async function cleanupSampleData(log = console.log) {
  log('Starting database cleanup...');
  const collectionsToDelete = ['users', 'reviews', 'checkins', 'follows', 'tags'];

  for (const collectionName of collectionsToDelete) {
    await deleteCollection(collectionName, log);
  }

  log('Database cleanup complete!');
  alert('Database cleanup complete!');
}