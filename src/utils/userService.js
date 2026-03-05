import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, runTransaction, serverTimestamp, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const FOLLOWS_COLLECTION = 'follows'; // Single root collection for scalability

/**
 * Searches users by username prefix (case-sensitive due to Firestore limitations).
 * @param {string} searchTerm - The string to search for.
 * @returns {Array} List of matching user objects.
 */
export const searchUsers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return [];

    try {
        const currentUser = auth.currentUser;
        const usersRef = collection(db, USERS_COLLECTION);

        // Firestore prefix search
        // Note: For a true production app, you typically use Algolia, Typesense, or an extension. 
        // This is a basic lexicographical prefix search constraint.
        const q = query(
            usersRef,
            where('username', '>=', searchTerm.toLowerCase()),
            where('username', '<=', searchTerm.toLowerCase() + '\uf8ff')
        );

        const querySnapshot = await getDocs(q);
        const results = [];

        querySnapshot.forEach((doc) => {
            // Exclude current user from search results
            if (currentUser && doc.id === currentUser.uid) return;

            const data = doc.data();
            results.push({
                id: doc.id,
                name: data.name || '',
                username: data.username || '',
                photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=E6E6FA&color=4A0E4E`,
            });
        });

        // Limit results purely to keep dropdown clean (fallback frontend limit)
        return results.slice(0, 5);
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

/**
 * Checks if the current user is following the target user.
 * @param {string} currentUserId 
 * @param {string} targetUserId 
 * @returns {boolean} true if following, false otherwise.
 */
export const checkFollowStatus = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId) return false;

    try {
        const followDocId = `${currentUserId}_${targetUserId}`;
        const followDocRef = doc(db, FOLLOWS_COLLECTION, followDocId);
        const followSnap = await getDoc(followDocRef);

        return followSnap.exists();
    } catch (error) {
        console.error("Error checking follow status:", error);
        return false;
    }
};

/**
 * Toggles follow/unfollow status using a Firestore transaction to prevent race conditions 
 * and guarantee stats never drop below zero safely.
 * @param {string} targetUserId - The ID of the user to follow/unfollow.
 * @returns {boolean} The new follow status (true if now following, false if unfollowed).
 */
export const toggleFollow = async (targetUserId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in to act");
    if (currentUser.uid === targetUserId) throw new Error("Cannot follow yourself");

    const followDocId = `${currentUser.uid}_${targetUserId}`;
    const followDocRef = doc(db, FOLLOWS_COLLECTION, followDocId);

    const followerRef = doc(db, USERS_COLLECTION, currentUser.uid);     // The person clicking follow
    const followingRef = doc(db, USERS_COLLECTION, targetUserId);       // The person receiving the follow

    try {
        const newStatus = await runTransaction(db, async (transaction) => {
            // 1. Read all required documents first (Transaction rule requirement)
            const followSnap = await transaction.get(followDocRef);
            const followerSnap = await transaction.get(followerRef);
            const followingSnap = await transaction.get(followingRef);

            // Safety check
            if (!followerSnap.exists() || !followingSnap.exists()) {
                throw new Error("One or both users do not exist.");
            }

            const followerData = followerSnap.data();
            const followingData = followingSnap.data();

            // Default nested stat fields if they are missing
            const currentFollowingCount = followerData.stats?.following || followerData.followingCount || 0;
            const currentFollowerCount = followingData.stats?.followers || followingData.followerCount || 0;

            const isCurrentlyFollowing = followSnap.exists();

            if (isCurrentlyFollowing) {
                // ACTION: UNFOLLOW
                // Delete relation
                transaction.delete(followDocRef);

                // Safely decrement counts, locking them strictly to >= 0
                const newFollowingCount = Math.max(0, currentFollowingCount - 1);
                const newFollowerCount = Math.max(0, currentFollowerCount - 1);

                // We must update the fields based on how they're stored in the user doc (nested under 'stats')
                transaction.update(followerRef, { 'stats.following': newFollowingCount, 'followingCount': newFollowingCount });
                transaction.update(followingRef, { 'stats.followers': newFollowerCount, 'followerCount': newFollowerCount });

                return false; // Resulting status is "not following"
            } else {
                // ACTION: FOLLOW
                // Create relation
                transaction.set(followDocRef, {
                    followerId: currentUser.uid,
                    followingId: targetUserId,
                    createdAt: serverTimestamp()
                });

                // Increment safely
                const newFollowingCount = currentFollowingCount + 1;
                const newFollowerCount = currentFollowerCount + 1;

                transaction.update(followerRef, { 'stats.following': newFollowingCount, 'followingCount': newFollowingCount });
                transaction.update(followingRef, { 'stats.followers': newFollowerCount, 'followerCount': newFollowerCount });

                return true; // Resulting status is "following"
            }
        });

        return newStatus;
    } catch (error) {
        console.error("Failed to toggle follow:", error);
        throw error;
    }
};

/**
 * Listens to the followers of a specific user.
 * @param {string} userId 
 * @param {function} callback
 * @param {function} errorCallback
 */
export const listenToFollowers = (userId, callback, errorCallback) => {
    const q = query(
        collection(db, FOLLOWS_COLLECTION),
        where("followingId", "==", userId)
    );

    return onSnapshot(q, async (snapshot) => {
        try {
            const followers = [];
            for (const docSnap of snapshot.docs) {
                const followerId = docSnap.data().followerId;
                const userSnap = await getDoc(doc(db, USERS_COLLECTION, followerId));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    followers.push({
                        id: userSnap.id,
                        name: userData.name || '',
                        username: userData.username || '',
                        photoURL: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&background=E6E6FA&color=4A0E4E`,
                        points: userData.stats?.points || 0
                    });
                }
            }
            callback(followers);
        } catch (error) {
            console.error("Error processing followers snapshot:", error);
            if (errorCallback) errorCallback(error);
        }
    }, (error) => {
        if (errorCallback) errorCallback(error);
        else console.error("Error listening to followers:", error);
    });
};

/**
 * Listens to the users that a specific user is following.
 * @param {string} userId 
 * @param {function} callback
 * @param {function} errorCallback
 */
export const listenToFollowing = (userId, callback, errorCallback) => {
    const q = query(
        collection(db, FOLLOWS_COLLECTION),
        where("followerId", "==", userId)
    );

    return onSnapshot(q, async (snapshot) => {
        try {
            const following = [];
            for (const docSnap of snapshot.docs) {
                const followingId = docSnap.data().followingId;
                const userSnap = await getDoc(doc(db, USERS_COLLECTION, followingId));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    following.push({
                        id: userSnap.id,
                        name: userData.name || '',
                        username: userData.username || '',
                        photoURL: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&background=E6E6FA&color=4A0E4E`,
                        points: userData.stats?.points || 0
                    });
                }
            }
            callback(following);
        } catch (error) {
            console.error("Error processing following snapshot:", error);
            if (errorCallback) errorCallback(error);
        }
    }, (error) => {
        if (errorCallback) errorCallback(error);
        else console.error("Error listening to following:", error);
    });
};
