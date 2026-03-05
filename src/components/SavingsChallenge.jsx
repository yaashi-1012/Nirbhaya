import React, { useState, useEffect } from 'react';
import { Award, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

const SavingsChallenge = () => {
    const [savingsProgress, setSavingsProgress] = useState(0); // 0-100 %
    const [totalSaved, setTotalSaved] = useState(0);
    const [weekNumber, setWeekNumber] = useState(1);

    const [showLogModal, setShowLogModal] = useState(false);
    const [saveAmount, setSaveAmount] = useState("");

    // Total goal for 30 days challenge (assume 500 per week -> avg 2000 per month as goal)
    const TARGET_GOAL = 2000;

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                // Listen to all saves in the challenge
                const challengeRef = collection(db, "users", user.uid, "finance_savingsChallenge");
                const unsub = onSnapshot(challengeRef, (snapshot) => {
                    let total = 0;
                    snapshot.forEach(docSnap => {
                        total += (docSnap.data().amountSaved || 0);
                    });

                    setTotalSaved(total);
                    const percent = Math.min(100, Math.round((total / TARGET_GOAL) * 100));
                    setSavingsProgress(percent);

                    // Simple heuristic for week number based on docs count / amount logic (1 update per week logic)
                    // Or just derive it purely from amount if standard 500
                    const week = 1 + Math.floor(total / 500);
                    setWeekNumber(Math.min(week, 4)); // cap at 4 weeks ~ 30 days
                });
                return () => unsub();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const handleLogSave = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) return;
            const todayStr = new Date().toISOString().split('T')[0];
            const logRef = doc(db, "users", user.uid, "finance_savingsChallenge", todayStr);

            await setDoc(logRef, {
                amountSaved: Number(saveAmount),
                dateLogged: todayStr,
            }, { merge: true }); // merge true allows additive updates if they log twice a day manually handling logic (in this raw version it just overwrites the day's amount. We'll leave it as a daily tracker override to be safe).

            setShowLogModal(false);
            setSaveAmount("");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to log save");
        }
    };

    return (
        <>
            <div className="card challenge-card">
                <div className="challenge-icon-wrapper">
                    <Award size={32} className="text-warning" />
                </div>
                <h3>30-Day Savings Challenge</h3>
                <p>Save ₹500 every week. You are on Week {weekNumber}!</p>
                <div className="progress-container">
                    <div className="progress-bar" style={{ backgroundColor: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '12px', marginBottom: '8px' }}>
                        <div className="progress-fill" style={{ width: `${savingsProgress}%`, backgroundColor: 'var(--accent-primary)', height: '100%', transition: 'width 0.4s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span className="progress-text" style={{ color: 'var(--text-secondary)' }}>{savingsProgress}% Completed</span>
                        <span style={{ fontWeight: 600 }}>₹{totalSaved} / ₹{TARGET_GOAL}</span>
                    </div>
                </div>
                <button className="btn btn-primary w-full mt-4" onClick={() => setShowLogModal(true)}>Log Today's Save</button>
            </div>

            {/* Log Modal */}
            {showLogModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', zIndex: 999, alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', minWidth: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Log Save</h3>
                            <button onClick={() => setShowLogModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleLogSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Amount Saved (₹):
                                <input type="number" min="0" value={saveAmount} onChange={(e) => setSaveAmount(e.target.value)} required placeholder="e.g. 100" style={{ padding: '0.5rem', marginTop: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                            </label>
                            <button type="submit" className="btn btn-primary mt-2">Log Deposit</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SavingsChallenge;
