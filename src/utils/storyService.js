import { db, auth } from '../firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { safeDecrement } from './statService';

const STORIES_COLLECTION = 'stories';
const STORY_REPOSTS_COLLECTION = 'storyReposts';

export const createStory = async (storyData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to post a story.");

        // We fetch current user metadata to get absolute accurate display names/photos for optimistic UI if needed
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const authorName = storyData.authorName || userData.username || user.displayName || "Sister";

        const newStory = {
            userId: user.uid,
            authorName,
            designation: storyData.designation || "",
            title: storyData.title,
            content: storyData.content,
            coverImageUrl: storyData.coverImageUrl,
            coverImagePublicId: storyData.coverImagePublicId,
            media: storyData.media || [],
            category: storyData.category || "General",
            likesCount: 0,
            repliesCount: 0,
            repostCount: 0,
            isFeatured: false,
            isApproved: true,
            createdAt: serverTimestamp(),
            editedAt: null
        };

        const docRef = await addDoc(collection(db, STORIES_COLLECTION), newStory);

        // Increment user's storyCount
        const userUpdateRef = doc(db, 'users', user.uid);
        await updateDoc(userUpdateRef, { storyCount: increment(1) });

        return {
            id: docRef.id,
            ...newStory,
            createdAt: new Date()
        };
    } catch (error) {
        console.error("Error creating story:", error);
        throw error;
    }
};

export const fetchFeaturedStory = async () => {
    try {
        const q = query(
            collection(db, STORIES_COLLECTION),
            where('isFeatured', '==', true),
            where('isApproved', '==', true),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
        console.error("Error fetching featured story:", error);
        throw error;
    }
};

export const fetchStories = async (lastDocSnap = null, selectedCategory = "All", searchQuery = "", listLimit = 10) => {
    try {
        let constraints = [
            where('isApproved', '==', true),
            orderBy('createdAt', 'desc')
        ];

        // Only query category if not "All" and we assume index available or filter locally if complex
        if (selectedCategory !== "All") {
            constraints.unshift(where('category', '==', selectedCategory));
        }

        if (lastDocSnap) {
            constraints.push(startAfter(lastDocSnap));
        }

        // Fetch extra for client-side search filtering if search query exists
        constraints.push(limit(searchQuery ? listLimit * 3 : listLimit));

        const q = query(collection(db, STORIES_COLLECTION), ...constraints);
        const snapshot = await getDocs(q);

        let stories = [];
        snapshot.forEach(docSnap => {
            stories.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            stories = stories.filter(s =>
                s.title.toLowerCase().includes(queryLower) ||
                s.authorName.toLowerCase().includes(queryLower) ||
                s.content.toLowerCase().includes(queryLower)
            );
        }

        stories = stories.slice(0, listLimit);

        return {
            stories,
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
        };
    } catch (error) {
        console.error("Error fetching stories:", error);
        throw error;
    }
};

export const listenToStories = (selectedCategory = "All", searchQuery = "", listLimit = 50, onNext, onError) => {
    let constraints = [
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc')
    ];

    if (selectedCategory !== "All") {
        constraints.unshift(where('category', '==', selectedCategory));
    }

    // Limit to prevent massive reads if collection gets large
    constraints.push(limit(listLimit));

    const q = query(collection(db, STORIES_COLLECTION), ...constraints);

    return onSnapshot(q, (snapshot) => {
        let stories = [];
        snapshot.forEach(docSnap => {
            stories.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            stories = stories.filter(s =>
                s.title.toLowerCase().includes(queryLower) ||
                s.authorName.toLowerCase().includes(queryLower) ||
                s.content.toLowerCase().includes(queryLower)
            );
        }

        onNext(stories);
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to stories:", error);
    });
};

export const fetchStoryById = async (storyId) => {
    try {
        const docRef = doc(db, STORIES_COLLECTION, storyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching story by id:", error);
        throw error;
    }
};

// --- ENGAGEMENT LOGIC ---

export const toggleStoryLike = async (storyId, currentStatus) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to like.");

        const storyRef = doc(db, STORIES_COLLECTION, storyId);
        const likeRef = doc(db, STORIES_COLLECTION, storyId, 'likes', user.uid);

        if (currentStatus) {
            // Unliking
            await deleteDoc(likeRef);
            await updateDoc(storyRef, { likesCount: increment(-1) });
        } else {
            // Liking
            await setDoc(likeRef, { likedAt: serverTimestamp() });
            await updateDoc(storyRef, { likesCount: increment(1) });
        }
        return true;
    } catch (error) {
        console.error("Error toggling like:", error);
        return false;
    }
};

export const hasUserLikedStory = async (storyId) => {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const likeRef = doc(db, STORIES_COLLECTION, storyId, 'likes', user.uid);
        const snap = await getDoc(likeRef);
        return snap.exists();
    } catch (error) {
        return false;
    }
};

export const addStoryReply = async (storyId, replyContent) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to reply.");

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const actualUsername = userData.username ? `@${userData.username}` : "Sister";
        const actualPhoto = userData.photoURL || `https://ui-avatars.com/api/?name=${actualUsername.replace('@', '')}&background=E6E6FA&color=4A0E4E`;

        const newReply = {
            userId: user.uid,
            displayName: actualUsername,
            displayPhoto: actualPhoto,
            content: replyContent,
            createdAt: serverTimestamp()
        };

        const repliesCol = collection(db, STORIES_COLLECTION, storyId, 'replies');
        const docRef = await addDoc(repliesCol, newReply);

        const storyRef = doc(db, STORIES_COLLECTION, storyId);
        await updateDoc(storyRef, { repliesCount: increment(1) });

        return { id: docRef.id, ...newReply, createdAt: new Date() };
    } catch (error) {
        console.error("Error adding story reply:", error);
        throw error;
    }
};

export const listenToStoryReplies = (storyId, callback) => {
    const q = query(
        collection(db, STORIES_COLLECTION, storyId, 'replies'),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
        const replies = [];
        snapshot.forEach(docSnap => replies.push({ id: docSnap.id, ...docSnap.data() }));
        callback(replies);
    }, (error) => {
        console.error("Error listening to replies:", error);
    });
};

export const repostStory = async (storyId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to repost.");

        const repostId = `${storyId}_${user.uid}`;
        const repostRef = doc(db, STORY_REPOSTS_COLLECTION, repostId);

        const snap = await getDoc(repostRef);
        if (snap.exists()) {
            throw new Error("You have already reposted this story.");
        }

        const storyDoc = await getDoc(doc(db, STORIES_COLLECTION, storyId));
        if (!storyDoc.exists()) throw new Error("Story not found.");

        await setDoc(repostRef, {
            storyId,
            originalAuthorId: storyDoc.data().userId,
            repostedBy: user.uid,
            createdAt: serverTimestamp()
        });

        const storyUpdateRef = doc(db, STORIES_COLLECTION, storyId);
        await updateDoc(storyUpdateRef, { repostCount: increment(1) });

        return true;
    } catch (error) {
        console.error("Error reposting story:", error);
        throw error;
    }
};

export const undoRepostStory = async (storyId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to undo repost.");

        const repostId = `${storyId}_${user.uid}`;
        const repostRef = doc(db, STORY_REPOSTS_COLLECTION, repostId);

        const snap = await getDoc(repostRef);
        if (!snap.exists()) {
            throw new Error("You have not reposted this story.");
        }

        await deleteDoc(repostRef);

        const storyUpdateRef = doc(db, STORIES_COLLECTION, storyId);
        await updateDoc(storyUpdateRef, { repostCount: increment(-1) });

        return true;
    } catch (error) {
        console.error("Error undoing repost:", error);
        throw error;
    }
};

export const hasUserRepostedStory = async (storyId) => {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const repostId = `${storyId}_${user.uid}`;
        const snap = await getDoc(doc(db, STORY_REPOSTS_COLLECTION, repostId));
        return snap.exists();
    } catch (error) {
        return false;
    }
};

// --- PROFILE LOGIC ---

export const fetchUserStories = async (userId) => {
    try {
        const q = query(
            collection(db, STORIES_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error("Error fetching user stories:", error);
        throw error;
    }
};

export const listenToUserStories = (userId, onNext, onError) => {
    const q = query(
        collection(db, STORIES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const stories = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        onNext(stories);
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to user stories:", error);
    });
};

export const fetchUserReposts = async (userId) => {
    try {
        const q = query(
            collection(db, STORY_REPOSTS_COLLECTION),
            where('repostedBy', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        const reposts = [];
        // Sequential fetch of original stories to hydrate feed
        for (const docSnap of snapshot.docs) {
            const repostData = docSnap.data();
            const storyDoc = await getDoc(doc(db, STORIES_COLLECTION, repostData.storyId));
            if (storyDoc.exists()) {
                reposts.push({
                    _repostMeta: { id: docSnap.id, createdAt: repostData.createdAt },
                    id: storyDoc.id,
                    ...storyDoc.data()
                });
            }
        }
        return reposts;
    } catch (error) {
        console.error("Error fetching reposts:", error);
        throw error;
    }
};

export const listenToUserReposts = (userId, onNext, onError) => {
    const q = query(
        collection(db, STORY_REPOSTS_COLLECTION),
        where('repostedBy', '==', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, async (snapshot) => {
        try {
            const reposts = [];
            // To maintain order properly with async hydration, we collect promises
            const hydratePromises = snapshot.docs.map(async (docSnap) => {
                const repostData = docSnap.data();
                const storyDoc = await getDoc(doc(db, STORIES_COLLECTION, repostData.storyId));
                if (storyDoc.exists()) {
                    return {
                        _repostMeta: { id: docSnap.id, createdAt: repostData.createdAt },
                        id: storyDoc.id,
                        ...storyDoc.data()
                    };
                }
                return null;
            });

            const results = await Promise.all(hydratePromises);
            const filteredResults = results.filter(Boolean);

            // Sort by the repost creation time to maintain the ordered feed
            filteredResults.sort((a, b) => {
                const timeA = a._repostMeta.createdAt?.toMillis ? a._repostMeta.createdAt.toMillis() : 0;
                const timeB = b._repostMeta.createdAt?.toMillis ? b._repostMeta.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            onNext(filteredResults);
        } catch (err) {
            if (onError) onError(err);
        }
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to user reposts:", error);
    });
};

// --- EDIT AND DELETE LOGIC ---

export const editStory = async (storyId, updatedData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in.");

        const storyRef = doc(db, STORIES_COLLECTION, storyId);
        const snap = await getDoc(storyRef);

        if (!snap.exists()) throw new Error("Story not found.");
        if (snap.data().userId !== user.uid) throw new Error("Only the author can edit this story.");

        await updateDoc(storyRef, {
            title: updatedData.title,
            content: updatedData.content,
            designation: updatedData.designation || "",
            editedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error editing story:", error);
        throw error;
    }
};

export const deleteStory = async (storyId, coverPublicId = null, mediaArray = []) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in.");

        const storyRef = doc(db, STORIES_COLLECTION, storyId);
        const snap = await getDoc(storyRef);

        if (!snap.exists()) throw new Error("Story not found.");
        if (snap.data().userId !== user.uid) throw new Error("Only the author can delete this story.");

        // Delete all related reposts
        const repostsQuery = query(collection(db, STORY_REPOSTS_COLLECTION), where('storyId', '==', storyId));
        const repostsSnap = await getDocs(repostsQuery);
        const deletePromises = repostsSnap.docs.map(docSnap => deleteDoc(doc(db, STORY_REPOSTS_COLLECTION, docSnap.id)));
        await Promise.all(deletePromises);

        // Delete the story document
        await deleteDoc(storyRef);

        // Safe decrement user's storyCount
        await safeDecrement(user.uid, 'storyCount');

        return true;
    } catch (error) {
        console.error("Error deleting story:", error);
        throw error;
    }
};
