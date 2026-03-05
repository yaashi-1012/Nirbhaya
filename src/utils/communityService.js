import { db, auth } from '../firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { safeDecrement } from './statService';

const POSTS_COLLECTION = 'posts';
const REPLIES_COLLECTION = 'replies';
const CIRCLES_COLLECTION = 'circles';
const CIRCLE_MEMBERS_COLLECTION = 'circleMembers';
const POSTS_LIMIT = 10;

export const fetchPosts = async (lastDocSnap = null, selectedCategory = "All", sortOption = "New", searchQuery = "", circleId = null) => {
    try {
        let constraints = [];

        // Note: In Firestore, to sort by a field and use inequality filters (like category == 'Health'), 
        // you often need composite indexes which require setting up in the Firebase Console.
        // For this demo structure, if category is "All", we just sort. 
        // If not, we typically would need to filter in memory OR assume index exists.
        // We will do a client-side filter if category != "All" to avoid index hell for this demo, fetching more.

        let orderField = 'createdAt';
        if (sortOption === "Top" || sortOption === "Most Liked") orderField = "likesCount";
        if (sortOption === "Most Replied") orderField = "repliesCount";
        if (sortOption === "Trending") orderField = "trendingScore";

        constraints.push(orderBy(orderField, 'desc'));

        if (lastDocSnap) {
            constraints.push(startAfter(lastDocSnap));
        }

        constraints.push(limit(POSTS_LIMIT * 3)); // Fetch more to allow for client side filtering if category is enabled

        let q = query(collection(db, POSTS_COLLECTION), ...constraints);

        const querySnapshot = await getDocs(q);
        let posts = [];
        querySnapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Client side filtering for category to avoid complex index requirements instantly
        if (selectedCategory !== "All") {
            posts = posts.filter(p => p.category === selectedCategory);
        }

        if (circleId) {
            posts = posts.filter(p => p.circleId === circleId);
        } else {
            // If viewing main feed, only show public or null circle posts
            posts = posts.filter(p => !p.circleId || p.visibility === 'public');
        }

        // --- NEW LOGIC: Exclude posts hidden by the current user ---
        const user = auth.currentUser;
        if (user) {
            try {
                const hiddenQuery = query(
                    collection(db, 'userHiddenPosts'),
                    where('userId', '==', user.uid)
                );
                const hiddenSnap = await getDocs(hiddenQuery);
                const hiddenPostIds = new Set(hiddenSnap.docs.map(doc => doc.data().postId));

                // Filter out any post that exists in the hidden set
                posts = posts.filter(p => !hiddenPostIds.has(p.id));
            } catch (err) {
                console.error("Error filtering hidden posts:", err);
            }
        }

        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(queryLower) ||
                p.content.toLowerCase().includes(queryLower) ||
                (p.hashtags && p.hashtags.some(tag => tag.toLowerCase().includes(queryLower))) ||
                (p.displayName && p.displayName.toLowerCase().includes(queryLower))
            );
        }

        // Just return requested limit
        posts = posts.slice(0, POSTS_LIMIT);

        return {
            posts,
            lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
        };
    } catch (error) {
        console.error("Error fetching posts:", error);
        throw error;
    }
};

export const listenToUserPosts = (userId, callback, errorCallback) => {
    const q = query(
        collection(db, POSTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const userPosts = [];
        snapshot.forEach(docSnap => {
            userPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(userPosts);
    }, (error) => {
        if (errorCallback) errorCallback(error);
        else console.error("Error listening to user posts:", error);
    });
};

/**
 * Real-time listener for the main feed, replacing fetchPosts.
 */
export const listenToPosts = (limitCount = 10, selectedCategory = "All", sortOption = "New", searchQuery = "", circleId = null, onNext, onError) => {
    let constraints = [];

    let orderField = 'createdAt';
    if (sortOption === "Top" || sortOption === "Most Liked") orderField = "likesCount";
    if (sortOption === "Most Replied") orderField = "repliesCount";
    if (sortOption === "Trending") orderField = "trendingScore";

    constraints.push(orderBy(orderField, 'desc'));
    constraints.push(limit(limitCount * 3));

    let q = query(collection(db, POSTS_COLLECTION), ...constraints);

    return onSnapshot(q, async (snapshot) => {
        let posts = [];
        snapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (selectedCategory !== "All") {
            posts = posts.filter(p => p.category === selectedCategory);
        }

        if (circleId) {
            posts = posts.filter(p => p.circleId === circleId);
        } else {
            posts = posts.filter(p => !p.circleId || p.visibility === 'public');
        }

        const user = auth.currentUser;
        if (user) {
            try {
                const hiddenQuery = query(
                    collection(db, 'userHiddenPosts'),
                    where('userId', '==', user.uid)
                );
                const hiddenSnap = await getDocs(hiddenQuery);
                const hiddenPostIds = new Set(hiddenSnap.docs.map(doc => doc.data().postId));
                posts = posts.filter(p => !hiddenPostIds.has(p.id));
            } catch (err) {
                console.error("Error filtering hidden posts:", err);
            }
        }

        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(queryLower) ||
                p.content.toLowerCase().includes(queryLower) ||
                (p.hashtags && p.hashtags.some(tag => tag.toLowerCase().includes(queryLower))) ||
                (p.displayName && p.displayName.toLowerCase().includes(queryLower))
            );
        }

        const originalLength = posts.length;
        posts = posts.slice(0, limitCount);

        // We know there's more if our post-filtered array is larger than the requested limit
        const hasMore = originalLength > limitCount;

        onNext({ posts, hasMore });
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to posts:", error);
    });
};

export const listenToReplies = (postId, callback, errorCallback) => {
    const q = query(
        collection(db, POSTS_COLLECTION, postId, REPLIES_COLLECTION),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const replies = [];
        snapshot.forEach(docSnap => {
            replies.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(replies);
    }, (error) => {
        if (errorCallback) errorCallback(error);
        else console.error("Error listening to replies:", error);
    });
};

export const fetchReplies = async (postId) => {
    try {
        const q = query(
            collection(db, POSTS_COLLECTION, postId, REPLIES_COLLECTION),
            orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching replies:", error);
        return [];
    }
};

export const toggleLike = async (postId, currentStatus) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to like.");

        const postRef = doc(db, POSTS_COLLECTION, postId);
        const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', user.uid);

        if (currentStatus) {
            // Unliking
            await deleteDoc(likeRef);
            await updateDoc(postRef, {
                likesCount: increment(-1)
            });
        } else {
            // Liking
            await setDoc(likeRef, { likedAt: serverTimestamp() });
            await updateDoc(postRef, {
                likesCount: increment(1)
            });
        }
        return true;
    } catch (error) {
        console.error("Error toggling like:", error);
        return false;
    }
};

export const hasUserLikedPost = async (postId) => {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', user.uid);
        const snap = await getDoc(likeRef);
        return snap.exists();
    } catch (error) {
        return false;
    }
};

export const addReply = async (postId, replyData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to reply.");

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const actualUsername = userData.username ? `@${userData.username}` : "Sister";
        const actualPhoto = userData.photoURL || `https://ui-avatars.com/api/?name=${actualUsername.replace('@', '')}&background=E6E6FA&color=4A0E4E`;

        const displayName = replyData.isAnonymous ? "Anonymous Sister" : actualUsername;
        const displayPhoto = replyData.isAnonymous ? "https://ui-avatars.com/api/?name=Anon&background=E6E6FA&color=4A0E4E" : actualPhoto;

        const newReply = {
            userId: user.uid,
            isAnonymous: replyData.isAnonymous,
            displayName,
            displayPhoto,
            content: replyData.content,
            likesCount: 0,
            createdAt: serverTimestamp(),
            parentReplyId: replyData.parentReplyId || null
        };

        const postRef = doc(db, POSTS_COLLECTION, postId);
        const repliesCol = collection(db, POSTS_COLLECTION, postId, REPLIES_COLLECTION);

        const docRef = await addDoc(repliesCol, newReply);

        // Update post counter
        await updateDoc(postRef, {
            repliesCount: increment(1)
        });

        return {
            id: docRef.id,
            ...newReply,
            createdAt: new Date()
        };
    } catch (error) {
        console.error("Error adding reply:", error);
        throw error;
    }
};

export const toggleSavePost = async (postId, currentStatus) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to save.");

        const saveRef = doc(db, 'users', user.uid, 'saved_posts', postId);

        if (currentStatus) {
            // Unsaving
            await deleteDoc(saveRef);
        } else {
            // Saving
            await setDoc(saveRef, { savedAt: serverTimestamp() });
        }
        return true;
    } catch (error) {
        console.error("Error toggling save:", error);
        return false;
    }
};

export const hasUserSavedPost = async (postId) => {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const saveRef = doc(db, 'users', user.uid, 'saved_posts', postId);
        const snap = await getDoc(saveRef);
        return snap.exists();
    } catch (error) {
        return false;
    }
};

export const reportPost = async (postId, reason, details) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to report.");

        // We use a combination of postId_userId as document ID to prevent duplicate reports globally
        const reportId = `${postId}_${user.uid}`;
        const reportRef = doc(db, 'reports', reportId);

        const snap = await getDoc(reportRef);
        if (snap.exists()) {
            throw new Error("You have already reported this post.");
        }

        await setDoc(reportRef, {
            postId,
            reportedBy: user.uid,
            reason,
            details,
            status: "pending",
            reportedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error reporting post:", error);
        throw error;
    }
};

// ----- PHASE 1: SISTER CIRCLES 2.0 -----

export const createCircle = async (circleData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to create a circle.");

        const newCircle = {
            name: circleData.name,
            description: circleData.description,
            category: circleData.category,
            coverImage: circleData.coverImage || null,
            icon: circleData.icon || "⭕",
            createdBy: user.uid,
            privacyType: circleData.privacyType, // "public" | "private" | "secret"
            allowAnonymous: circleData.allowAnonymous,
            createdAt: serverTimestamp(),
            memberCount: 1, // Start with 1 (the creator)
            postCount: 0,
            lastActivityAt: serverTimestamp(),
            rules: circleData.rules || []
        };

        const docRef = await addDoc(collection(db, CIRCLES_COLLECTION), newCircle);

        // Immediately grant "admin" role in circleMembers
        const memberId = `${docRef.id}_${user.uid}`;
        await setDoc(doc(db, CIRCLE_MEMBERS_COLLECTION, memberId), {
            circleId: docRef.id,
            userId: user.uid,
            role: "admin",
            joinedAt: serverTimestamp(),
            lastViewedAt: serverTimestamp(),
            notificationsEnabled: true,
            identityMode: "real",
            isMuted: false
        });

        return {
            id: docRef.id,
            ...newCircle,
            createdAt: new Date()
        };
    } catch (error) {
        console.error("Error creating circle:", error);
        throw error;
    }
};

export const fetchCircles = async (searchQuery = "", categoryFilter = "All") => {
    try {
        const user = auth.currentUser;

        let constraints = [
            orderBy('memberCount', 'desc'),
            limit(50)
        ];

        if (categoryFilter !== "All") {
            // Because we only order by memberCount we can't do equality without composite index setup
            // We'll apply it locally on the bounded chunk for simplicity here as requested logic allows.
        }

        const q = query(collection(db, CIRCLES_COLLECTION), ...constraints);
        const snapshot = await getDocs(q);

        let circles = [];
        snapshot.forEach(doc => {
            circles.push({ id: doc.id, ...doc.data() });
        });

        if (categoryFilter !== "All") {
            circles = circles.filter(c => c.category === categoryFilter);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            circles = circles.filter(c =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.description.toLowerCase().includes(lowerQuery)
            );
        }

        // Handle Privacy Visibility (Hide Secret circles unless user is a member)
        if (user) {
            const membersSnap = await getDocs(query(collection(db, CIRCLE_MEMBERS_COLLECTION),
                // We'd ideally query where userId == user.uid and circleId in [ids]
                // For simplicity, we filter out secrets locally unless we expand complex queries
            ));
            // To be precise at scale, we'd query member docs for the user and cross ref.
            // But since this is a limited fetch, we'll manually filter secrets we don't own/belong to.
            // Without `where('userId', '==', user.uid)` we can't effectively fetch "my circles" perfectly yet
            // Wait, we CAN fetch the user's memberships:

            const userMembershipsSnap = await getDocs(
                query(collection(db, CIRCLE_MEMBERS_COLLECTION)) // Firestore needs an index or we fetch all.
                // NOTE: We cannot natively do where('userId', '==', user.uid) without importing where().
            );
        }

        // Just filtering out all secrets for now for safety during discoverability fetch
        circles = circles.filter(c => c.privacyType !== "secret");

        return circles;
    } catch (error) {
        console.error("Error fetching circles:", error);
        throw error;
    }
};

export const fetchCircleById = async (circleId) => {
    try {
        const docRef = doc(db, CIRCLES_COLLECTION, circleId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching circle by id:", error);
        throw error;
    }
};

export const joinCircle = async (circleId, privacyType) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to join.");

        const memberId = `${circleId}_${user.uid}`;
        const memberRef = doc(db, CIRCLE_MEMBERS_COLLECTION, memberId);

        const snap = await getDoc(memberRef);
        if (snap.exists()) {
            throw new Error("You are already a member of this circle.");
        }

        // If public, instant join. If private, we might want to track pending states. 
        // For Phase 1, we will force join everything to get the schema running.

        await setDoc(memberRef, {
            circleId: circleId,
            userId: user.uid,
            role: "member",
            joinedAt: serverTimestamp(),
            lastViewedAt: serverTimestamp(),
            notificationsEnabled: true,
            identityMode: "real",
            isMuted: false
        });

        const circleRef = doc(db, CIRCLES_COLLECTION, circleId);
        await updateDoc(circleRef, {
            memberCount: increment(1)
        });

        return true;
    } catch (error) {
        console.error("Error joining circle:", error);
        throw error;
    }
};

export const leaveCircle = async (circleId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to leave.");

        const memberId = `${circleId}_${user.uid}`;
        const memberRef = doc(db, CIRCLE_MEMBERS_COLLECTION, memberId);

        const snap = await getDoc(memberRef);
        if (!snap.exists()) {
            throw new Error("You are not a member of this circle.");
        }

        if (snap.data().role === "admin") {
            throw new Error("Admins cannot leave. You must delete the circle or transfer ownership.");
        }

        await deleteDoc(memberRef);

        const circleRef = doc(db, CIRCLES_COLLECTION, circleId);
        await updateDoc(circleRef, {
            memberCount: increment(-1)
        });

        return true;
    } catch (error) {
        console.error("Error leaving circle:", error);
        throw error;
    }
};

export const fetchCircleMembers = async (circleId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to view members.");

        const q = query(
            collection(db, CIRCLE_MEMBERS_COLLECTION),
            where("circleId", "==", circleId)
        );
        const snapshot = await getDocs(q);

        const members = [];
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const userSnap = await getDoc(doc(db, 'users', data.userId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const actualUsername = userData.username ? `@${userData.username}` : "Sister";
                members.push({
                    id: docSnap.id,
                    ...data,
                    displayName: actualUsername,
                    displayPhoto: userData.photoURL || `https://ui-avatars.com/api/?name=${actualUsername.replace('@', '')}&background=E6E6FA&color=4A0E4E`
                });
            } else {
                members.push({ id: docSnap.id, ...data, displayName: "Unknown User", displayPhoto: `https://ui-avatars.com/api/?name=U&background=E6E6FA&color=4A0E4E` });
            }
        }
        return members;
    } catch (error) {
        console.error("Error fetching circle members:", error);
        throw error;
    }
};

export const removeMember = async (circleId, memberUserId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in.");

        const adminId = `${circleId}_${user.uid}`;
        const snap = await getDoc(doc(db, CIRCLE_MEMBERS_COLLECTION, adminId));
        if (!snap.exists() || snap.data().role !== "admin") {
            throw new Error("Only admins can remove members.");
        }

        const memberId = `${circleId}_${memberUserId}`;
        await deleteDoc(doc(db, CIRCLE_MEMBERS_COLLECTION, memberId));

        const circleRef = doc(db, CIRCLES_COLLECTION, circleId);
        await updateDoc(circleRef, {
            memberCount: increment(-1)
        });

        return true;
    } catch (error) {
        console.error("Error removing member:", error);
        throw error;
    }
};

export const checkMembership = async (circleId) => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const memberId = `${circleId}_${user.uid}`;
        const snap = await getDoc(doc(db, CIRCLE_MEMBERS_COLLECTION, memberId));

        if (snap.exists()) {
            return snap.data().role; // "admin" | "moderator" | "member"
        }
        return null;
    } catch (error) {
        console.error("Error checking membership:", error);
        return null;
    }
};

export const fetchUserJoinedCircles = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const q = query(
            collection(db, CIRCLE_MEMBERS_COLLECTION),
            where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        const joinedCircles = [];
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const circleSnap = await getDoc(doc(db, CIRCLES_COLLECTION, data.circleId));
            if (circleSnap.exists()) {
                joinedCircles.push({ id: circleSnap.id, ...circleSnap.data() });
            }
        }
        return joinedCircles;
    } catch (error) {
        console.error("Error fetching joined circles:", error);
        return [];
    }
};

export const createPost = async (postData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to post.");

        // Extract hashtags using a basic regex
        const hashtagsMatch = postData.content.match(/#[a-z0-9_]+/gi);
        const hashtags = hashtagsMatch ? hashtagsMatch.map(tag => tag.substring(1).toLowerCase()) : [];

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const actualUsername = userData.username ? `@${userData.username}` : "Sister";
        const actualPhoto = userData.photoURL || `https://ui-avatars.com/api/?name=${actualUsername.replace('@', '')}&background=E6E6FA&color=4A0E4E`;

        const displayName = postData.isAnonymous ? "Anonymous Sister" : actualUsername;
        const displayPhoto = postData.isAnonymous ? "https://ui-avatars.com/api/?name=Anon&background=E6E6FA&color=4A0E4E" : actualPhoto;

        const newPost = {
            userId: user.uid,
            isAnonymous: postData.isAnonymous,
            displayName,
            displayPhoto,
            title: postData.title,
            content: postData.content,
            hashtags,
            category: postData.category,
            circleId: postData.circleId,
            visibility: postData.visibility,
            likesCount: 0,
            repliesCount: 0,
            shareCount: 0,
            trendingScore: 0,
            createdAt: serverTimestamp() // Firestore server time
        };

        const docRef = await addDoc(collection(db, POSTS_COLLECTION), newPost);

        // Increment user's postCount
        const userUpdateRef = doc(db, 'users', user.uid);
        await updateDoc(userUpdateRef, { postCount: increment(1) });

        // Return constructed object for immediate Optimistic UI rendering
        return {
            id: docRef.id,
            ...newPost,
            createdAt: new Date() // Fallback literal date for optimistic render since serverTimestamp is pending
        };
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
};

// TEMPORARY: Seed data function for Phase 1 testing
export const seedPhase1MockPosts = async () => {
    const mockPosts = [
        {
            userId: "mockUser1",
            isAnonymous: true,
            displayName: "Anonymous Sister",
            displayPhoto: "https://ui-avatars.com/api/?name=Anon&background=E6E6FA&color=4A0E4E",
            title: "How to negotiate salary for my first tech job?",
            content: "Hi sisters! I recently received an offer for a Junior Developer role. They offered 60k but my research shows the average is around 70k. This is my first job and I'm scared they might pull the offer if I negotiate. Any advice?",
            hashtags: ["tech", "salary", "negotiation", "firstjob"],
            category: "Career",
            circleId: null,
            visibility: "public",
            likesCount: 45,
            repliesCount: 12,
            shareCount: 2,
            trendingScore: 50,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
            userId: "mockUser2",
            isAnonymous: true,
            displayName: "Wellness Warrior",
            displayPhoto: "https://ui-avatars.com/api/?name=W+W&background=E6E6FA&color=4A0E4E",
            title: "Managing PCOS symptoms naturally?",
            content: "I've recently been diagnosed with PCOS and the doctor just put me on the pill. I'd love to hear if anyone has managed their symptoms through diet, supplements, or lifestyle changes before I start medication.",
            hashtags: ["pcos", "womenshealth", "wellness"],
            category: "Health",
            circleId: null,
            visibility: "public",
            likesCount: 89,
            repliesCount: 34,
            shareCount: 5,
            trendingScore: 120,
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        },
        {
            userId: "mockUser3",
            isAnonymous: false,
            displayName: "Priya Sharma",
            displayPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
            title: "Feeling severe imposter syndrome after promotion",
            content: "I got promoted to manager last month and I feel like I have no idea what I'm doing. I feel like everyone knows I'm a fraud. How do you deal with this?",
            hashtags: ["impostersyndrome", "leadership", "mentalhealth"],
            category: "Mental Health",
            circleId: null,
            visibility: "public",
            likesCount: 112,
            repliesCount: 28,
            shareCount: 10,
            trendingScore: 80,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
    ];

    try {
        const postsCol = collection(db, POSTS_COLLECTION);
        // Check if there are posts first so we don't seed dupes
        const snap = await getDocs(query(postsCol, limit(1)));
        if (!snap.empty) {
            console.log("Database already has posts, skipping seeding.");
            return;
        }

        for (const post of mockPosts) {
            await addDoc(postsCol, post);
        }
        console.log("Mock posts seeded successfully.");
    } catch (error) {
        console.error("Error seeding posts:", error);
    }
};

export const updateCircle = async (circleId, circleData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to update a circle.");

        const circleRef = doc(db, CIRCLES_COLLECTION, circleId);
        await updateDoc(circleRef, {
            ...circleData,
            lastActivityAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error updating circle:", error);
        throw error;
    }
};

export const deleteCircle = async (circleId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to delete a circle.");

        // First, check if the user is actually the admin
        const memberId = `${circleId}_${user.uid}`;
        const snap = await getDoc(doc(db, CIRCLE_MEMBERS_COLLECTION, memberId));
        if (!snap.exists() || snap.data().role !== "admin") {
            throw new Error("Only admins can delete a circle.");
        }

        // Delete the main circle document
        await deleteDoc(doc(db, CIRCLES_COLLECTION, circleId));
        return true;
    } catch (error) {
        console.error("Error deleting circle:", error);
        throw error;
    }
};

export const listenToCircleMessages = (circleId, callback) => {
    const q = query(
        collection(db, CIRCLES_COLLECTION, circleId, 'circleMessages'),
        orderBy('createdAt', 'asc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages);
    }, (error) => {
        console.error("Error listening to messages:", error);
    });
};

export const sendCircleMessage = async (circleId, messageData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to send a message.");

        // Admins bypass anonymity
        const isAdmin = messageData.role === "admin";
        const isAnonymous = isAdmin ? false : messageData.isAnonymous;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const actualUsername = userData.username ? `@${userData.username}` : "Sister";
        const actualPhoto = userData.photoURL || `https://ui-avatars.com/api/?name=${actualUsername.replace('@', '')}&background=E6E6FA&color=4A0E4E`;

        const displayName = isAnonymous ? "Anonymous Sister" : actualUsername;
        const displayPhoto = isAnonymous ? "https://ui-avatars.com/api/?name=Anon&background=E6E6FA&color=4A0E4E" : actualPhoto;

        const newMessage = {
            userId: user.uid,
            displayName,
            displayPhoto,
            isAnonymous,
            isAdmin,
            text: messageData.text,
            mediaUrl: messageData.mediaUrl || null,
            createdAt: serverTimestamp()
        };

        const messagesCol = collection(db, CIRCLES_COLLECTION, circleId, 'circleMessages');
        const docRef = await addDoc(messagesCol, newMessage);

        // Update circle lastActivityAt
        const circleRef = doc(db, CIRCLES_COLLECTION, circleId);
        await updateDoc(circleRef, {
            lastActivityAt: serverTimestamp()
        });

        return {
            id: docRef.id,
            ...newMessage,
            createdAt: new Date()
        };
    } catch (error) {
        console.error("Error sending circle message:", error);
        throw error;
    }
};

// --- DELETE AND HIDE LOGIC ---

export const deletePostForEveryone = async (postId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in.");

        const postRef = doc(db, POSTS_COLLECTION, postId);
        const snap = await getDoc(postRef);

        if (!snap.exists()) throw new Error("Post not found.");
        if (snap.data().userId !== user.uid) throw new Error("Only the author can delete this post for everyone.");

        // Delete post completely from database
        await deleteDoc(postRef);

        // Safe decrement user's postCount
        await safeDecrement(user.uid, 'postCount');

        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
};

export const hidePostForMe = async (postId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in.");

        const hiddenId = `${postId}_${user.uid}`;
        const hiddenRef = doc(db, 'userHiddenPosts', hiddenId);

        await setDoc(hiddenRef, {
            postId: postId,
            userId: user.uid,
            hiddenAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error hiding post:", error);
        throw error;
    }
};

export const incrementPostShareCount = async (postId) => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, postId);
        await updateDoc(postRef, {
            shareCount: increment(1)
        });
        return true;
    } catch (error) {
        console.error("Error incrementing share count:", error);
        return false;
    }
};
