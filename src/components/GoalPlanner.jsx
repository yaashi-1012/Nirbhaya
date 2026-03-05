import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, ShieldCheck } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import './GoalPlanner.css';

const GoalPlanner = () => {
    const [goalAmount, setGoalAmount] = useState(500000);
    const [years, setYears] = useState(5);
    const [returnRate, setReturnRate] = useState(12);

    const [hasExistingPlan, setHasExistingPlan] = useState(false);
    const [isEditMode, setIsEditMode] = useState(true); // if false, sliders are disabled
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const planRef = doc(db, "users", user.uid, "finance", "sip");
                const unsubPlan = onSnapshot(planRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setGoalAmount(data.goalAmount || 500000);
                        setYears(data.years || 5);
                        setReturnRate(data.expectedReturn || 12);
                        setHasExistingPlan(true);
                        setIsEditMode(false); // default to viewing mode if plan exists
                    } else {
                        setHasExistingPlan(false);
                        setIsEditMode(true);
                    }
                    setLoading(false);
                });
                return () => unsubPlan();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const calculateSIP = () => {
        const monthlyRate = returnRate / 12 / 100;
        const months = years * 12;
        // P = M / ( ({[1 + i]^n - 1} / i) × (1 + i) )
        if (monthlyRate === 0) return goalAmount / months;
        const numerator = Math.pow(1 + monthlyRate, months) - 1;
        const denominator = monthlyRate * (1 + monthlyRate);
        const sip = goalAmount / (numerator / denominator);
        return Math.max(0, Math.round(sip)); // avoid negatives or NaN if sliders hit 0 temporarily
    };

    const monthlySIP = calculateSIP();
    const totalInvested = monthlySIP * years * 12;
    const wealthGained = Math.max(0, goalAmount - totalInvested);

    const handleSavePlan = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return alert("Must be logged in.");

            const planRef = doc(db, "users", user.uid, "finance", "sip");
            await setDoc(planRef, {
                goalAmount,
                years,
                expectedReturn: returnRate,
                monthlySIP,
                totalInvested,
                wealthGained,
                createdAt: serverTimestamp()
            });
            setIsEditMode(false);
            alert("Success: Investing plan saved securely.");
        } catch (error) {
            console.error("Error saving SIP plan:", error);
            alert("Failed to save investing plan.");
        }
    };

    if (loading) return <div className="card goal-planner">Loading Planner...</div>;

    return (
        <div className="card goal-planner">
            <div className="planner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3>SIP & Goal Planner 🎯</h3>
                    <p className="subtitle">See how small monthly investments build wealth over time.</p>
                </div>
                {hasExistingPlan && !isEditMode && (
                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditMode(true)}>Edit Plan</button>
                )}
            </div>

            <div className="planner-grid">
                <div className="planner-controls" style={{ opacity: isEditMode ? 1 : 0.6, pointerEvents: isEditMode ? 'auto' : 'none' }}>
                    <div className="control-group">
                        <div className="control-label">
                            <label>Financial Goal (₹)</label>
                            <span>₹{goalAmount.toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            min="100000"
                            max="5000000"
                            step="50000"
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(Number(e.target.value))}
                            className="range-slider"
                            disabled={!isEditMode}
                        />
                    </div>

                    <div className="control-group">
                        <div className="control-label">
                            <label>Time Period (Years)</label>
                            <span>{years} Years</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={years}
                            onChange={(e) => setYears(Number(e.target.value))}
                            className="range-slider"
                            disabled={!isEditMode}
                        />
                    </div>

                    <div className="control-group">
                        <div className="control-label">
                            <label>Expected Return (%)</label>
                            <span>{returnRate}%</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="20"
                            step="1"
                            value={returnRate}
                            onChange={(e) => setReturnRate(Number(e.target.value))}
                            className="range-slider"
                            disabled={!isEditMode}
                        />
                    </div>
                </div>

                <div className="planner-results">
                    <div className="result-main">
                        <span>Required Monthly SIP</span>
                        <div className="sip-amount">₹{monthlySIP.toLocaleString()}</div>
                    </div>

                    <div className="result-breakdown">
                        <div className="breakdown-item bg-light">
                            <ShieldCheck className="text-plum" size={20} />
                            <div>
                                <span className="sm-label">Total Invested</span>
                                <strong>₹{totalInvested.toLocaleString()}</strong>
                            </div>
                        </div>
                        <div className="breakdown-item bg-success">
                            <TrendingUp className="text-success" size={20} />
                            <div>
                                <span className="sm-label">Wealth Gained</span>
                                <strong>₹{wealthGained.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>

                    {isEditMode && (
                        <button className="btn btn-primary w-full mt-4" onClick={handleSavePlan}>
                            {hasExistingPlan ? "Update Investing Plan" : "Start Investing Plan"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoalPlanner;
