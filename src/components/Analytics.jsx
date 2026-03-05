import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Zap, Smile } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

const Analytics = () => {
    const [analytics, setAnalytics] = useState({
        consistency: 90, // mock defaults for UI fallback
        symptomFreq: 4,
        habitStreak: 0,
        avgMood: "Happy"
    });

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                // Fetch basic data to calculate simple averages (Habits & Logs)
                const unsubReminders = onSnapshot(collection(db, "users", user.uid, "reminders"), (snapshot) => {
                    let totalStreak = 0;
                    snapshot.forEach(docSnap => {
                        const data = docSnap.data();
                        if (data.type === 'habit' && data.streakCount) {
                            totalStreak += data.streakCount;
                        }
                    });
                    setAnalytics(prev => ({ ...prev, habitStreak: totalStreak }));
                });

                return () => unsubReminders();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Calendar size={24} className="text-plum" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analytics.consistency}%</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cycle Consistency</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Activity size={24} className="text-lavender" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analytics.symptomFreq}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logs This Week</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Zap size={24} style={{ color: '#f39c12', marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analytics.habitStreak}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Habit Streak</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Smile size={24} style={{ color: '#2ecc71', marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analytics.avgMood}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Average Mood</span>
            </div>
        </div>
    );
};

export default Analytics;
