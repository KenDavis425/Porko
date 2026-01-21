<template>
  <div class="comments-section">
    <div class="comment-list">
      <div v-for="comment in comments" :key="comment.id" class="comment">
        <img :src="comment.userPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" :alt="comment.userName" class="comment-user-photo" referrerpolicy="no-referrer" />
        <div class="comment-content">
          <div class="comment-header">
            <div class="comment-user-section">
              <span class="comment-user-name">{{ comment.userName }}</span>
              <div v-if="comment.medals && comment.medals.length > 0" class="comment-medals">
                <span v-for="(medalData, idx) in comment.medals" :key="idx" class="comment-medal" :title="medalData.title">{{ medalData.medal }}</span>
              </div>
              <BadgeDisplay v-if="comment.userBadges && comment.userBadges.length > 0" :badges="comment.userBadges" :title="''" class="comment-badges" />
            </div>
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
          </div>
          <div v-if="editingCommentId !== comment.id">
            <p class="comment-text">{{ comment.text }}</p>
            <div class="comment-actions">
              <button v-if="canEdit(comment)" @click="startEditing(comment)" class="action-btn">Edit</button>
              <button v-if="canDelete(comment)" @click="deleteComment(comment.id)" class="action-btn delete">Delete</button>
            </div>
          </div>
          <div v-else class="edit-comment">
            <input v-model="editingText" @keyup.enter="saveEdit" class="edit-input" />
            <div class="edit-actions">
              <button @click="saveEdit" class="btn-primary">Save</button>
              <button @click="cancelEdit" class="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="user" class="add-comment">
      <input v-model="newComment" placeholder="Add a comment..." @keyup.enter="addComment" />
      <button @click="addComment" :disabled="!newComment.trim()">Post</button>
    </div>
    <div v-else class="add-comment-login-prompt">
      <p>Please log in to comment.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, documentId, limit, increment } from 'firebase/firestore';
import { showToast } from '../utils/toast.js';
import BadgeDisplay from './BadgeDisplay.vue';
import { calculateEarnedBadges, formatUserStats } from '../utils/badges.js';

export default {
  name: 'Comments',
  components: { BadgeDisplay },
  props: {
    postId: { type: String, required: true },
    postType: { type: String, required: true },
    postAuthorId: { type: String, required: true },
    user: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const comments = ref([]);
    const newComment = ref('');
    const editingCommentId = ref(null);
    const editingText = ref('');
    let unsubscribe = () => {};

    const getMedal = (index) => {
      if (typeof index !== 'number') return null;
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index >= 3 && index < 10) return '🏅';
      return null;
    };

    const getMedalWithTitle = (index, type) => {
      const medal = getMedal(index);
      if (!medal) return null;
      const titles = {
        reviewers: 'Top Reviewer',
        commenters: 'Top Commenter',
        state: 'State Leader'
      };
      return { medal, title: `${index + 1}. ${titles[type]}` };
    };

    const leaderboardRanks = ref(new Map());
    const commenterRanks = ref(new Map());

    const loadUserBadges = async (userId) => {
      try {
        const userReviewsSnap = await getDocs(query(collection(db, 'reviews'), where('userId', '==', userId)));
        const userReviews = userReviewsSnap.docs.map(doc => doc.data());
        
        const allReviewsSnap = await getDocs(collection(db, 'reviews'));
        const restaurantReviews = allReviewsSnap.docs.map(doc => doc.data());
        
        const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
        let userDoc = null;
        if (!userDocSnap.empty) {
          userDoc = userDocSnap.docs[0].data();
        }
        
        if (userDoc) {
          const userStats = formatUserStats(userDoc, userReviews, restaurantReviews);
          const badgeIds = calculateEarnedBadges(userStats);
          return badgeIds;
        }
        return [];
      } catch (error) {
        console.error('Error loading user badges:', error);
        return [];
      }
    };

    onMounted(() => {
      // Load leaderboard ranks once
      (async () => {
        try {
          const leaderboardSnap = await getDocs(query(collection(db, 'users'), orderBy('reviewCount', 'desc'), limit(30)));
          const usersWithReviews = leaderboardSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => (Number(user.reviewCount) || 0) > 0)
            .sort((a, b) => (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0))
            .slice(0, 10);
          
          const ranks = new Map();
          usersWithReviews.forEach((user, index) => {
            ranks.set(user.id, index);
          });
          leaderboardRanks.value = ranks;

          // Load commenter ranks
          const commentersSnap = await getDocs(query(collection(db, 'users'), orderBy('commentCount', 'desc'), limit(30)));
          const usersWithComments = commentersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => (Number(user.commentCount) || 0) > 0)
            .sort((a, b) => (Number(b.commentCount) || 0) - (Number(a.commentCount) || 0))
            .slice(0, 10);
          
          const commenterRanksMap = new Map();
          usersWithComments.forEach((user, index) => {
            commenterRanksMap.set(user.id, index);
          });
          commenterRanks.value = commenterRanksMap;
        } catch (error) {
          console.error('Error loading leaderboard:', error);
        }
      })();

      // Use a DocumentReference for the parent, then get the subcollection correctly.
      const parentDocRef = doc(db, props.postType, props.postId);
      const commentsCollection = collection(parentDocRef, 'comments');
      const commentsQuery = query(commentsCollection, orderBy('createdAt', 'asc'));
      unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
        const commentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const userIds = [...new Set(commentData.map(c => c.userId))];
        
        if (userIds.length > 0) {
          const usersMap = new Map();
          const userBadgesMap = new Map();
          
          // Firestore 'in' query is limited to 30 elements
          for (let i = 0; i < userIds.length; i += 30) {
            const batchIds = userIds.slice(i, i + 30);
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', batchIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));
          }
          
          // Load badges for all users
          for (const userId of userIds) {
            const badges = await loadUserBadges(userId);
            userBadgesMap.set(userId, badges);
          }
          
          comments.value = commentData.map(comment => {
            const user = usersMap.get(comment.userId);
            const reviewerRank = leaderboardRanks.value.get(comment.userId);
            const commenterRank = commenterRanks.value.get(comment.userId);
            
            // Build array of all applicable medals
            const medals = [];
            if (reviewerRank !== undefined) {
              const medalData = getMedalWithTitle(reviewerRank, 'reviewers');
              if (medalData) medals.push(medalData);
            }
            if (commenterRank !== undefined) {
              const medalData = getMedalWithTitle(commenterRank, 'commenters');
              if (medalData) medals.push(medalData);
            }
            
            return {
              ...comment,
              userName: user?.displayName || comment.userName || 'Unknown User',
              userPhoto: user?.photoURL || comment.userPhoto || null,
              userBadges: userBadgesMap.get(comment.userId) || [],
              medals: medals
            };
          });
        } else {
          comments.value = [];
        }
      });
    });

    onUnmounted(() => {
      unsubscribe();
    });

    const addComment = async () => {
      if (newComment.value.trim() === '') return;
      const currentUser = props.user;
      if (!currentUser) return;

      const now = serverTimestamp();
      const parentDocRef = doc(db, props.postType, props.postId);
      const commentsCollection = collection(parentDocRef, 'comments');
      const reviewDocRef = doc(db, 'reviews', props.postId);
      const userRef = doc(db, 'users', currentUser.uid);

      await Promise.all([
        addDoc(commentsCollection, {
          userId: currentUser.uid,
          text: newComment.value,
          createdAt: now,
        }),
        updateDoc(reviewDocRef, { lastActivityAt: now }),
        updateDoc(userRef, { commentCount: increment(1) })
      ]);
      newComment.value = '';
    };

    const canEdit = (comment) => {
      const currentUser = props.user;
      return currentUser && currentUser.uid === comment.userId;
    };

    const canDelete = (comment) => {
      const currentUser = props.user;
      return currentUser && (currentUser.uid === comment.userId || currentUser.uid === props.postAuthorId);
    };

    const startEditing = (comment) => {
      editingCommentId.value = comment.id;
      editingText.value = comment.text;
    };

    const cancelEdit = () => {
      editingCommentId.value = null;
      editingText.value = '';
    };

    const saveEdit = async () => {
      if (editingText.value.trim() === '' || !editingCommentId.value) return;
      const parentDocRef = doc(db, props.postType, props.postId);
      const commentsCollection = collection(parentDocRef, 'comments');
      const commentDoc = doc(commentsCollection, editingCommentId.value);
      const reviewDocRef = doc(db, 'reviews', props.postId);
      await Promise.all([
        updateDoc(commentDoc, { text: editingText.value }),
        updateDoc(reviewDocRef, { lastActivityAt: serverTimestamp() })
      ]);
      cancelEdit();
    };

    const deleteComment = async (commentId) => {
      if (confirm('Are you sure you want to delete this comment?')) {
        try {
          const comment = comments.value.find(c => c.id === commentId);
          const parentDocRef = doc(db, props.postType, props.postId);
          const commentsCollection = collection(parentDocRef, 'comments');
          const commentDoc = doc(commentsCollection, commentId);
          const reviewDocRef = doc(db, 'reviews', props.postId);
          const userRef = doc(db, 'users', comment.userId);
          await Promise.all([
            deleteDoc(commentDoc),
            updateDoc(reviewDocRef, { lastActivityAt: serverTimestamp() }),
            updateDoc(userRef, { commentCount: increment(-1) })
          ]);
          showToast('Comment deleted successfully', 'success');
        } catch (error) {
          console.error('Error deleting comment:', error);
          showToast('Failed to delete comment. Please try again.', 'error');
        }
      }
    };

    const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleString();
    };

    return {
      comments, newComment, addComment, canEdit, canDelete, startEditing,
      cancelEdit, saveEdit, deleteComment, editingCommentId, editingText, formatDate
    };
  },
};
</script>

<style scoped>
.comments-section {
  margin-top: 0.5em;
  padding-top: 0.75em;
  border-top: 1px solid #eee;
}
.comment-list { margin-bottom: 1em; }
.comment { display: flex; gap: 0.75em; margin-bottom: 1em; }
.comment-user-photo { width: 32px; height: 32px; border-radius: 50%; }
.comment-content { flex-grow: 1; }
.comment-header { display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.25em; justify-content: space-between; }
.comment-user-section { display: flex; align-items: center; gap: 0.5em; }
.comment-info { display: flex; align-items: baseline; gap: 0.5em; }
.comment-user-name { font-weight: 600; font-size: 0.9em; }
.comment-date { font-size: 0.75em; color: #777; }
.comment-badges { display: flex; gap: 2px; }
.comment-badges :deep(.badge) { font-size: 0.7em; width: 16px; height: 16px; }
.comment-medals { display: flex; gap: 0.25em; }
.comment-medal { font-size: 0.9em; cursor: help; }
.comment-text { margin: 0 0 0.5em; font-size: 0.95em; line-height: 1.4; }
.comment-actions { font-size: 0.8em; }
.action-btn { background: none; border: none; color: #777; cursor: pointer; padding: 0 5px 0 0; }
.action-btn.delete { color: #e74c3c; }
.edit-comment { display: flex; flex-direction: column; gap: 0.5em; }
.edit-input { width: 100%; padding: 0.5em; border-radius: 4px; border: 1px solid #ccc; }
.edit-actions { display: flex; gap: 0.5em; justify-content: flex-end; }
.add-comment { display: flex; gap: 0.5em; margin-top: 1em; }
.add-comment input { flex-grow: 1; border: 1px solid #ddd; border-radius: 15px; padding: 0.5em 1em; }
.add-comment button { background-color: var(--primary-color); color: white; border: none; border-radius: 15px; padding: 0.5em 1em; cursor: pointer; }
.add-comment button:disabled { background-color: #bdc3c7; cursor: not-allowed; }
.btn-primary { background-color: var(--primary-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.btn-secondary { background-color: #ecf0f1; color: var(--secondary-color); border: 1px solid #bdc3c7; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.add-comment-login-prompt {
  text-align: center;
  color: #777;
  font-size: 0.9em;
}
</style>