import React, { useState, useEffect } from 'react';
import { Sparkles, Coffee, Activity } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const AIInsights = () => {
    const [recentLogs, setRecentLogs] = useState([]);
    const [insightText, setInsightText] = useState("Logging your daily symptoms helps us provide tailored insights just for you.");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const logsQuery = query(collection(db, "users", user.uid, "dailyLogs"), orderBy("date", "desc"), limit(7));
                const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
                    const logs = [];
                    snapshot.forEach(docSnap => logs.push(docSnap.data()));
                    setRecentLogs(logs);
                    generateInsights(logs);
                    setLoading(false);
                });
                return () => unsubLogs();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const generateInsights = (logs) => {
        if (!logs || logs.length === 0) {
            setInsightText("Logging your daily symptoms helps us provide tailored insights just for you.");
            return;
        }

        // Extremely simple insight engine based on recent arrays
        let anxietyCount = 0;
        let crampCount = 0;
        let fatigueCount = 0;

        logs.forEach(log => {
            const symptoms = log.symptoms || []; // Handle array of objects or strings 
            symptoms.forEach(s => {
                const name = typeof s === 'string' ? s : s.name;
                if (name === 'Anxious') anxietyCount++;
                if (name === 'Cramps') crampCount++;
                if (name === 'Fatigue' || log.energyLevel <= 2) fatigueCount++;
            });
        });

        if (anxietyCount >= 2) {
            setInsightText("We noticed you've been feeling anxious over the last few days. We recommend staying hydrated and taking a 15-minute meditation break.");
        } else if (crampCount >= 2) {
            setInsightText("You've experienced cramps recently. A warm tea and a heating pad might help soothe the discomfort today.");
        } else if (fatigueCount >= 2) {
            setInsightText("Your energy levels have been low recently. Consider going to bed 30 minutes earlier tonight and drink plenty of water.");
        } else {
            setInsightText("You're doing great! Keep logging your daily metrics to build your health profile.");
        }
    };

    if (loading) return null;

    return (
        <div className="card insights-card mt-6">
            <div className="insights-header">
                <Sparkles className="text-plum" size={24} />
                <h3>AI Personalized Insights</h3>
            </div>
            <div className="insight-content">
                <p>{insightText}</p>
                <div className="action-buttons mt-3">
                    <button className="btn btn-secondary btn-sm"><Coffee size={16} /> Track Water</button>
                    <button className="btn btn-secondary btn-sm"><Activity size={16} /> 5 Min Meditation</button>
                </div>
            </div>
        </div>
    );
};

export default AIInsights;
