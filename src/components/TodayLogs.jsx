import React, { useState, useEffect } from 'react';
import { Activity, Moon, Plus } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const TodayLogs = () => {
    const [dailyLog, setDailyLog] = useState({ symptoms: [], mood: "", energyLevel: 3, notes: "" });
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const todayLogRef = doc(db, "users", user.uid, "dailyLogs", todayStr);
                const unsubLogs = onSnapshot(todayLogRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setDailyLog(docSnap.data());
                    } else {
                        setDailyLog({ symptoms: [], mood: "", energyLevel: 3, notes: "" });
                    }
                    setLoading(false);
                });
                return () => unsubLogs();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, [todayStr]);

    const handleSaveLog = async (updatedLog) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const todayLogRef = doc(db, "users", user.uid, "dailyLogs", todayStr);
            await setDoc(todayLogRef, {
                ...updatedLog,
                date: todayStr
            }, { merge: true });
        } catch (error) {
            console.error("Error saving log:", error);
        }
    };

    const handleToggleSymptom = (symptomName) => {
        let currentSymptoms = [...(dailyLog.symptoms || [])];
        const existingIndex = currentSymptoms.findIndex(s => {
            if (typeof s === 'string') return s === symptomName;
            return s.name === symptomName;
        });

        if (existingIndex >= 0) {
            // Remove it
            currentSymptoms.splice(existingIndex, 1);
        } else {
            // Add it with default intensity 1
            currentSymptoms.push({ name: symptomName, intensity: 1 });
        }

        const newLog = { ...dailyLog, symptoms: currentSymptoms };
        setDailyLog(newLog); // Optimistic UI update
        handleSaveLog(newLog);
    };

    const handleIntensityChange = (symptomName, newIntensity) => {
        let currentSymptoms = [...(dailyLog.symptoms || [])];
        const index = currentSymptoms.findIndex(s => (typeof s === 'string' ? s === symptomName : s.name === symptomName));
        if (index >= 0) {
            const sym = currentSymptoms[index];
            currentSymptoms[index] = { name: symptomName, intensity: Number(newIntensity) };
            const newLog = { ...dailyLog, symptoms: currentSymptoms };
            setDailyLog(newLog);
            handleSaveLog(newLog);
        }
    };

    const handleFieldChange = (field, value) => {
        const newLog = { ...dailyLog, [field]: value };
        setDailyLog(newLog);
        handleSaveLog(newLog);
    };

    if (loading) return <div className="daily-logs">Loading Logs...</div>;

    const symptomsList = dailyLog.symptoms || [];

    const isSymptomActive = (name) => {
        return symptomsList.some(s => (typeof s === 'string' ? s === name : s.name === name));
    };

    const getSymptomIntensity = (name) => {
        const sym = symptomsList.find(s => (typeof s === 'string' ? s === name : s.name === name));
        return sym?.intensity || 1;
    };

    return (
        <div className="daily-logs mt-6" style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <h4>Today's Logs</h4>
            <div className="log-tags" style={{ marginBottom: '16px' }}>
                {['Cramps', 'Headache', 'Anxious', 'Fatigue', 'Bloating'].map(sym => (
                    <div key={sym} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <button
                            className={`log-tag ${isSymptomActive(sym) ? 'active' : ''}`}
                            onClick={() => handleToggleSymptom(sym)}
                            style={{ margin: 0 }}
                        >
                            {sym === 'Anxious' ? <Moon size={14} /> : <Activity size={14} />} {sym}
                        </button>
                        {isSymptomActive(sym) && (
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={getSymptomIntensity(sym)}
                                onChange={(e) => handleIntensityChange(sym, e.target.value)}
                                style={{ width: '60px', accentColor: 'var(--accent-primary)' }}
                                title={`Intensity: ${getSymptomIntensity(sym)}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Mood</label>
                    <select
                        value={dailyLog.mood || ""}
                        onChange={(e) => handleFieldChange('mood', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="">Select Mood</option>
                        <option value="Happy">Happy 😊</option>
                        <option value="Calm">Calm 😌</option>
                        <option value="Low">Low 😔</option>
                        <option value="Irritable">Irritable 😠</option>
                        <option value="Anxious">Anxious 😰</option>
                    </select>
                </div>

                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Energy Level</label>
                    <select
                        value={dailyLog.energyLevel || 3}
                        onChange={(e) => handleFieldChange('energyLevel', Number(e.target.value))}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="5">Very High ⚡⚡⚡</option>
                        <option value="4">High ⚡⚡</option>
                        <option value="3">Normal ⚡</option>
                        <option value="2">Low 🔋</option>
                        <option value="1">Exhausted 🪫</option>
                    </select>
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Notes</label>
                <textarea
                    value={dailyLog.notes || ""}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="How are you feeling today?"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: '60px', resize: 'vertical' }}
                />
            </div>
        </div>
    );
};

export default TodayLogs;
