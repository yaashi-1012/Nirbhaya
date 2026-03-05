import { db } from '../firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Safely decrements a numeric field on a user document using a Firestore transaction.
 * Ensures that the field never drops below 0.
 * 
 * @param {string} userId - The UID of the user whose stats are being updated.
 * @param {string} fieldName - The path of the field to decrement (e.g., 'postCount', 'stats.followers').
 */
export const safeDecrement = async (userId, fieldName) => {
    if (!userId || !fieldName) {
        throw new Error("userId and fieldName are required for safeDecrement.");
    }

    const userRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User document does not exist.");
            }

            const data = userDoc.data();

            // Handle potentially nested fields (e.g., 'stats.followers')
            const fieldParts = fieldName.split('.');
            let currentValue = data;

            for (const part of fieldParts) {
                if (currentValue && typeof currentValue === 'object' && part in currentValue) {
                    currentValue = currentValue[part];
                } else {
                    currentValue = 0; // Field doesn't exist yet, default to 0
                    break;
                }
            }

            // Ensure currentValue is a valid number, default to 0 if corrupted
            if (typeof currentValue !== 'number' || isNaN(currentValue)) {
                currentValue = 0;
            }

            // Calculate new safe value, flooring at 0
            const newValue = Math.max(0, currentValue - 1);

            // Construct the update object for Firestore (handles dotted paths natively)
            transaction.update(userRef, { [fieldName]: newValue });
        });

        return true;
    } catch (error) {
        console.error(`Failed to safeDecrement ${fieldName} for user ${userId}:`, error);
        throw error;
    }
};
