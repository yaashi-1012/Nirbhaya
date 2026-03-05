import { db } from '../firebase';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';

// Fetch or create a conversation for a user
export const getOrCreateConversation = async (userId) => {
    // Instead of querying by userId, we can just use userId as the document ID
    const docRef = doc(db, 'chat_conversations', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docRef.id;
    }

    // Create a new conversation if none exists
    await setDoc(docRef, {
        userId,
        createdAt: serverTimestamp()
    });

    return docRef.id;
};

// Send a message
export const sendMessageToFirestore = async (conversationId, sender, messageText) => {
    // We use a subcollection inside the conversation to avoid composite indexes!
    const messagesRef = collection(db, 'chat_conversations', conversationId, 'messages');

    await addDoc(messagesRef, {
        sender, // 'user' or 'bot'
        message: messageText,
        createdAt: serverTimestamp()
    });
};

// Listen to messages for a given conversation
export const listenToChatMessages = (conversationId, callback) => {
    const messagesRef = collection(db, 'chat_conversations', conversationId, 'messages');

    const q = query(
        messagesRef,
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            // Ensure createdAt object can be handled locally before serverTimestamp resolves
            createdAt: docSnap.data().createdAt ? docSnap.data().createdAt.toDate() : new Date()
        }));
        callback(messages);
    });
};
