import React, { useState, useEffect } from 'react';
import { Calendar, Droplets, Plus, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import './CycleTracker.css';

const CycleTracker = () => {
    const [cycleData, setCycleData] = useState(null);
    const [cycleHistory, setCycleHistory] = useState([]); // Stores past cycle data for history/averages
    const [averageCycleLength, setAverageCycleLength] = useState(null); // Calculated average cycle length
    const [loading, setLoading] = useState(true);
    const [showSetupModal, setShowSetupModal] = useState(false);

    // Modal states
    const [lastPeriodDate, setLastPeriodDate] = useState("");
    const [cycleLengthInput, setCycleLengthInput] = useState(28);
    const [periodLengthInput, setPeriodLengthInput] = useState(5);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const cycleRef = doc(db, "users", user.uid, "cycle", "main");
                const unsubCycle = onSnapshot(cycleRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setCycleData(docSnap.data());
                    } else {
                        setCycleData(null);
                    }
                    setLoading(false);
                });
                return () => unsubCycle();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSaveCycle = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) return;
            const cycleRef = doc(db, "users", user.uid, "cycle", "main");
            await setDoc(cycleRef, {
                lastPeriodDate: new Date(lastPeriodDate),
                cycleLength: Number(cycleLengthInput),
                periodLength: Number(periodLengthInput)
            });
            setShowSetupModal(false);
        } catch (error) {
            console.error("Error saving cycle setup:", error);
            alert("Failed to save cycle data");
        }
    };

    if (loading) return <div className="card cycle-tracker">Loading...</div>;

    // Calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cycleDay = 1;
    let daysLeft = 28;
    let nextDateStr = "N/A";
    let ovulationRangeStr = "N/A";

    if (cycleData && cycleData.lastPeriodDate) {
        const lastPeriod = cycleData.lastPeriodDate.toDate ? cycleData.lastPeriodDate.toDate() : new Date(cycleData.lastPeriodDate);
        lastPeriod.setHours(0, 0, 0, 0);

        const daysPassed = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
        const cLen = cycleData.cycleLength || 28;

        cycleDay = (daysPassed >= 0) ? (daysPassed % cLen) + 1 : 1;
        daysLeft = cLen - cycleDay;

        const nextPeriodObj = new Date(today);
        nextPeriodObj.setDate(today.getDate() + daysLeft);
        nextDateStr = nextPeriodObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const ovStart = new Date(nextPeriodObj);
        ovStart.setDate(nextPeriodObj.getDate() - 15);
        const ovEnd = new Date(nextPeriodObj);
        ovEnd.setDate(nextPeriodObj.getDate() - 11);
        ovulationRangeStr = `${ovStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${ovEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    return (
        <div className="card cycle-tracker">
            <div className="tracker-header">
                <div className="tracker-title-area">
                    <h3>Period & Cycle Tracker 🌸</h3>
                    {cycleData && <span className="badge cycle-day-badge">Day {cycleDay} of {cycleData.cycleLength}</span>}
                </div>
                <button className="icon-btn" title="Setup Cycle" onClick={() => setShowSetupModal(true)}>
                    <Plus size={20} />
                </button>
            </div>

            <div className="cycle-circle-container">
                {cycleData ? (
                    <div className="cycle-circle">
                        <div className="circle-content">
                            <span className="days-left">{daysLeft}</span>
                            <span className="days-label">Days until next period</span>
                        </div>
                    </div>
                ) : (
                    <div className="cycle-circle" style={{ cursor: 'pointer' }} onClick={() => setShowSetupModal(true)}>
                        <div className="circle-content">
                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Set up your cycle</span>
                        </div>
                    </div>
                )}
            </div>

            {cycleData && (
                <div className="cycle-stats">
                    <div className="stat-box">
                        <Calendar size={20} className="stat-icon text-plum" />
                        <div className="stat-info">
                            <span className="stat-label">Next Period</span>
                            <span className="stat-value">{nextDateStr}</span>
                        </div>
                    </div>

                    <div className="stat-box">
                        <Droplets size={20} className="stat-icon text-lavender" />
                        <div className="stat-info">
                            <span className="stat-label">Ovulation Window</span>
                            <span className="stat-value text-sm">{ovulationRangeStr}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Setup Modal */}
            {showSetupModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', zIndex: 999, alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', minWidth: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Setup Cycle</h3>
                            <button onClick={() => setShowSetupModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveCycle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Last period start date:
                                <input type="date" value={lastPeriodDate} onChange={(e) => setLastPeriodDate(e.target.value)} required style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Cycle Length (days):
                                <input type="number" value={cycleLengthInput} onChange={(e) => setCycleLengthInput(e.target.value)} required min="15" max="45" style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
                                Period Length (days):
                                <input type="number" value={periodLengthInput} onChange={(e) => setPeriodLengthInput(e.target.value)} required min="1" max="15" style={{ padding: '0.5rem', marginTop: '0.2rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                            </label>
                            <button type="submit" className="btn btn-primary mt-2">Save</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CycleTracker;
