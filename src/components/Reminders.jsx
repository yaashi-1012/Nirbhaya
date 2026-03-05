import React, { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, addDoc, updateDoc, onSnapshot, query, serverTimestamp, orderBy } from 'firebase/firestore';

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderTitle, setReminderTitle] = useState("");
    const [reminderTime, setReminderTime] = useState("");
    const [reminderType, setReminderType] = useState("reminder");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const remindersQuery = query(collection(db, "users", user.uid, "reminders"), orderBy("createdAt", "asc"));
                const unsubReminders = onSnapshot(remindersQuery, (snapshot) => {
                    const fetchedReminders = [];
                    snapshot.forEach(docSnap => {
                        fetchedReminders.push({ id: docSnap.id, ...docSnap.data() });
                    });
                    setReminders(fetchedReminders);
                    setLoading(false);
                });
                return () => unsubReminders();
            } else {
                setLoading(false);
                setReminders([]);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const handleAddReminder = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) return;
            await addDoc(collection(db, "users", user.uid, "reminders"), {
                title: reminderTitle,
                time: reminderTime,
                type: reminderType,
                completed: false,
                streakCount: reminderType === "habit" ? 0 : null,
                createdAt: serverTimestamp()
            });
            setReminderTitle("");
            setReminderTime("");
            setReminderType("reminder");
            setShowReminderModal(false);
        } catch (error) {
            console.error("Error adding reminder:", error);
            alert("Failed to add reminder");
        }
    };

    const toggleReminderStatus = async (reminderId, currentStatus, type, currentStreak) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const reminderRef = doc(db, "users", user.uid, "reminders", reminderId);

            let updates = { completed: !currentStatus };

            // Simple habit streak logic for demo purposes (real logic would need daily resets)
            if (type === "habit" && !currentStatus) {
                updates.streakCount = (currentStreak || 0) + 1;
            } else if (type === "habit" && currentStatus) {
                updates.streakCount = Math.max(0, (currentStreak || 0) - 1);
            }

            await updateDoc(reminderRef, updates);
        } catch (error) {
            console.error("Error updating reminder:", error);
        }
    };

    if (loading) return <div className="card reminders-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Reminders...</div>;

    return (
        <div className="card reminders-card">
            <h3>Daily Reminders & Habits <BellRing size={20} className="inline ml-1" /></h3>
            <div className="reminder-list">
                {reminders.length > 0 ? reminders.map(reminder => (
                    <div key={reminder.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <label className="reminder-item" style={{ opacity: reminder.completed ? 0.6 : 1, transition: '0.2s', paddingBottom: 0 }}>
                            <input
                                type="checkbox"
                                className="custom-checkbox"
                                checked={reminder.completed}
                                onChange={() => toggleReminderStatus(reminder.id, reminder.completed, reminder.type, reminder.streakCount)}
                            />
                            <span style={{ textDecoration: reminder.completed ? 'line-through' : 'none' }}>
                                {reminder.title} {reminder.type === 'habit' && '🎯'}
                            </span>
                            <span className="time-tag">{reminder.time}</span>
                        </label>
                        {reminder.type === 'habit' && (
                            <div style={{ marginLeft: '32px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Streak: {reminder.streakCount || 0} days 🔥
                            </div>
                        )}
                    </div>
                )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No reminders set yet.</p>}
            </div>
            <button className="btn btn-outline mt-4 w-full text-sm" onClick={() => setShowReminderModal(true)}>Add Reminder</button>

            {/* Reminder Modal */}
            {showReminderModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', zIndex: 999, alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', minWidth: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Add Reminder</h3>
                            <button onClick={() => setShowReminderModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Title:
                                <input type="text" value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} required placeholder="Take vitamins..." style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Time:
                                <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} required style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Type:
                                <select value={reminderType} onChange={(e) => setReminderType(e.target.value)} style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }}>
                                    <option value="reminder">One-time Reminder</option>
                                    <option value="habit">Daily Habit (Tracks Streak)</option>
                                </select>
                            </label>
                            <button type="submit" className="btn btn-primary mt-2">Add</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reminders;
