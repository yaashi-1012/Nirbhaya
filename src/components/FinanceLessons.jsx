import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const defaultLessons = [
    { title: "Investing 101: Stocks & Bonds", level: "Beginner", duration: "12 mins", youtubeUrl: "https://www.youtube.com/watch?v=gFQNPmLKj1k", category: "Core" },
    { title: "Building an Emergency Fund", level: "Beginner", duration: "8 mins", youtubeUrl: "https://www.youtube.com/watch?v=HQzoZfc3GwQ", category: "Core" },
    { title: "Understanding SIPs & Mutual Funds", level: "Intermediate", duration: "15 mins", youtubeUrl: "https://www.youtube.com/watch?v=KJw3vO6W9pY", category: "Investing" }
];

const FinanceLessons = () => {
    const [lessons, setLessons] = useState([]);
    const [completedIds, setCompletedIds] = useState(new Set());

    // Setup & Fetch Lessons from global collection
    useEffect(() => {
        const fetchLessons = async () => {
            const lessonsRef = collection(db, "financeResources");
            const snap = await getDocs(lessonsRef);
            if (snap.empty) {
                // Seed lessons once if missing
                defaultLessons.forEach(async (lesson, i) => {
                    await setDoc(doc(lessonsRef, `lesson_${i}`), lesson);
                });
                setLessons(defaultLessons.map((l, i) => ({ id: `lesson_${i}`, ...l })));
            } else {
                setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        };
        fetchLessons();
    }, []);

    // Listen to user completion progress
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const progressRef = collection(db, "users", user.uid, "finance_lessonProgress");
                const unsub = onSnapshot(progressRef, (snapshot) => {
                    const ids = new Set();
                    snapshot.forEach(d => {
                        if (d.data().completed) ids.add(d.id);
                    });
                    setCompletedIds(ids);
                });
                return () => unsub();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const markCompleted = async (lessonId) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            await setDoc(doc(db, "users", user.uid, "finance_lessonProgress", lessonId), {
                completed: true,
                watchedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error marking completed", error);
        }
    };

    return (
        <div className="lessons-section mt-8">
            <div className="section-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Bite-Sized Lessons 📚</h3>
                <span className="badge" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{completedIds.size} / {lessons.length} Completed</span>
            </div>

            <div className="lessons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {lessons.map(lesson => {
                    const isDone = completedIds.has(lesson.id);
                    return (
                        <div key={lesson.id} className="card lesson-card" style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: '16px', position: 'relative', opacity: isDone ? 0.8 : 1 }}>
                            <a href={lesson.youtubeUrl} target="_blank" rel="noreferrer" onClick={() => !isDone && markCompleted(lesson.id)} className="lesson-icon" style={{ backgroundColor: isDone ? 'var(--status-success)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', color: isDone ? '#fff' : 'var(--accent-primary)', flexShrink: 0 }}>
                                {isDone ? <CheckCircle size={24} /> : <PlayCircle size={24} />}
                            </a>
                            <div className="lesson-info" style={{ flex: 1, minWidth: 0 }}>
                                <div className="lesson-meta" style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{lesson.level}</span>
                                    <span>• {lesson.duration}</span>
                                </div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{lesson.title}</h4>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FinanceLessons;
