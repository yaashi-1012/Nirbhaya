import React, { useState, useEffect } from 'react';
import { Activity, Droplets, Moon, ArrowUpCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const Metrics = () => {
    const [metrics, setMetrics] = useState({ weight: "", sleepHours: "", waterIntake: "", steps: "" });
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const metricsRef = doc(db, "users", user.uid, "metrics", todayStr);
                const unsubMetrics = onSnapshot(metricsRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setMetrics(docSnap.data());
                    } else {
                        setMetrics({ weight: "", sleepHours: "", waterIntake: "", steps: "" });
                    }
                    setLoading(false);
                });
                return () => unsubMetrics();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, [todayStr]);

    const handleSaveMetric = async (field, value) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const metricsRef = doc(db, "users", user.uid, "metrics", todayStr);
            await setDoc(metricsRef, {
                [field]: Number(value),
                date: todayStr
            }, { merge: true });
        } catch (error) {
            console.error("Error saving metric:", error);
        }
    };

    const handleFieldChange = (field, value) => {
        setMetrics(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return null;

    return (
        <div className="card mt-6">
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Daily Health Metrics 📊</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpCircle size={14} className="text-plum" /> Weight (kg)
                    </label>
                    <input
                        type="number"
                        value={metrics.weight}
                        onChange={(e) => handleFieldChange('weight', e.target.value)}
                        onBlur={(e) => handleSaveMetric('weight', e.target.value)}
                        placeholder="e.g. 65"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Moon size={14} className="text-lavender" /> Sleep (hrs)
                    </label>
                    <input
                        type="number"
                        value={metrics.sleepHours}
                        onChange={(e) => handleFieldChange('sleepHours', e.target.value)}
                        onBlur={(e) => handleSaveMetric('sleepHours', e.target.value)}
                        placeholder="e.g. 8"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Droplets size={14} style={{ color: '#4facfe' }} /> Water (glasses)
                    </label>
                    <input
                        type="number"
                        value={metrics.waterIntake}
                        onChange={(e) => handleFieldChange('waterIntake', e.target.value)}
                        onBlur={(e) => handleSaveMetric('waterIntake', e.target.value)}
                        placeholder="e.g. 8"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={14} style={{ color: '#2ecc71' }} /> Steps
                    </label>
                    <input
                        type="number"
                        value={metrics.steps}
                        onChange={(e) => handleFieldChange('steps', e.target.value)}
                        onBlur={(e) => handleSaveMetric('steps', e.target.value)}
                        placeholder="e.g. 10000"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Metrics;
