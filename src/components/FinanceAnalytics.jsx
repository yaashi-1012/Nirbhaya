import React, { useState, useEffect } from 'react';
import { IndianRupee, PieChart, Banknote, BookOpenCheck } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

const FinanceAnalytics = () => {
    const [stats, setStats] = useState({
        totalInvested: 0,
        totalSaved: 0,
        lessonsCompleted: 0,
        wealthProjection: 0
    });

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async user => {
            if (user) {
                // 1. Fetch SIP Data
                const planRef = doc(db, "users", user.uid, "finance", "sip");
                const unsubSIP = onSnapshot(planRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setStats(prev => ({
                            ...prev,
                            totalInvested: data.totalInvested || 0,
                            wealthProjection: (data.totalInvested || 0) + (data.wealthGained || 0)
                        }));
                    }
                });

                // 2. Fetch Savings Challenge Total
                const challengeRef = collection(db, "users", user.uid, "finance_savingsChallenge");
                const unsubChallenge = onSnapshot(challengeRef, (snapshot) => {
                    let total = 0;
                    snapshot.forEach(docSnap => total += (docSnap.data().amountSaved || 0));
                    setStats(prev => ({ ...prev, totalSaved: total }));
                });

                // 3. Fetch Lessons Completed Count
                const progressRef = collection(db, "users", user.uid, "finance_lessonProgress");
                const unsubLessons = onSnapshot(progressRef, (snapshot) => {
                    let count = 0;
                    snapshot.forEach(docSnap => {
                        if (docSnap.data().completed) count++;
                    });
                    setStats(prev => ({ ...prev, lessonsCompleted: count }));
                });

                return () => {
                    unsubSIP();
                    unsubChallenge();
                    unsubLessons();
                };
            }
        });
        return () => unsubscribeAuth();
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <PieChart size={24} className="text-plum" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{stats.totalInvested.toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Invested</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Banknote size={24} style={{ color: '#2ecc71', marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{stats.totalSaved.toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>30-Day Saved</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <IndianRupee size={24} style={{ color: '#f39c12', marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{stats.wealthProjection.toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Projected Flow</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <BookOpenCheck size={24} className="text-lavender" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.lessonsCompleted}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lessons Done</span>
            </div>
        </div>
    );
};

export default FinanceAnalytics;
