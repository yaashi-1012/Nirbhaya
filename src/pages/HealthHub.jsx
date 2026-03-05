import React, { useState, useEffect } from 'react';
import { BookHeart } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, limit, getDocs } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import CycleTracker from '../components/CycleTracker';
import TodayLogs from '../components/TodayLogs';
import AIInsights from '../components/AIInsights';
import Reminders from '../components/Reminders';
import Metrics from '../components/Metrics';
import Analytics from '../components/Analytics';
import { Download, Trash2, EyeOff } from 'lucide-react';
import './HealthHub.css';

const HealthHub = () => {
    const [resources, setResources] = useState([]);
    const [dashboardHidden, setDashboardHidden] = useState(false);

    useEffect(() => {
        // Fetch resources (Global)
        const resourcesQuery = query(collection(db, "resources"), limit(2));
        const unsubResources = onSnapshot(resourcesQuery, (snapshot) => {
            const fetchedResources = [];
            snapshot.forEach(docSnap => {
                fetchedResources.push({ id: docSnap.id, ...docSnap.data() });
            });
            setResources(fetchedResources);
        });
        return () => {
            unsubResources();
        };
    }, []);

    const handleExport = async () => {
        const user = auth.currentUser;
        if (!user) return alert("You must be logged in to download data.");

        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Personal Health Report", 20, 20);

            let y = 30;
            doc.setFontSize(12);

            const collectionsToFetch = ['reminders', 'metrics', 'dailyLogs', 'cycle'];
            for (const coll of collectionsToFetch) {
                const snap = await getDocs(collection(db, "users", user.uid, coll));
                if (snap.empty) continue;

                doc.setFont("helvetica", "bold");
                doc.text(`--- ${coll.toUpperCase()} ---`, 20, y);
                doc.setFont("helvetica", "normal");
                y += 10;

                snap.docs.forEach(d => {
                    const data = d.data();
                    let textStr = "";
                    if (coll === 'dailyLogs') {
                        textStr = `${data.date}: Mood(${data.mood || 'N/A'}), Energy(${data.energyLevel || 'N/A'}) - Symptoms: ${data.symptoms ? data.symptoms.map(s => s.name || s).join(', ') : 'None'}`;
                    } else if (coll === 'metrics') {
                        textStr = `${data.date}: Steps(${data.steps || 0}), Water(${data.waterIntake || 0}), Sleep(${data.sleepHours || 0}h), Weight(${data.weight || 0}kg)`;
                    } else if (coll === 'reminders') {
                        textStr = `${data.title} (${data.type || 'reminder'}) - Completed: ${data.completed}`;
                    } else if (coll === 'cycle') {
                        textStr = `Cycle Length: ${data.cycleLength}, Period Length: ${data.periodLength}`;
                    } else {
                        textStr = JSON.stringify(data).substring(0, 100);
                    }

                    doc.text(textStr, 20, y);
                    y += 8;
                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                });
                y += 10;
            }

            doc.save(`NaariShakti_HealthReport_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert("Failed to export PDF.");
        }
    };

    const handleDeleteData = async () => {
        if (window.confirm("Are you sure you want to delete all health data? This cannot be undone.")) {
            alert("This deletes all personal health data. (Mock functionality for safety during demo)");
            // In a real scenario, this would trigger a Cloud Function to recursively delete uid subcollections.
        }
    };

    if (dashboardHidden) {
        return (
            <div className="page-container health-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <EyeOff size={48} className="text-muted" style={{ marginBottom: '16px' }} />
                <h2>Dashboard Hidden</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your health data is currently hidden for privacy.</p>
                <button className="btn btn-primary" onClick={() => setDashboardHidden(false)}>Show Dashboard</button>
            </div>
        );
    }

    return (
        <div className="page-container health-page">
            <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="section-title">Health & Wellness 🌿</h1>
                    <p className="section-subtitle">Your private dashboard for tracking, learning, and thriving.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={handleExport} title="Export Data"><Download size={16} /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => setDashboardHidden(true)} title="Hide Dashboard"><EyeOff size={16} /></button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--status-error)', borderColor: 'var(--status-error)' }} onClick={handleDeleteData} title="Delete Data"><Trash2 size={16} /></button>
                </div>
            </div>

            <Analytics />

            <div className="health-dashboard">
                <div className="dashboard-main">
                    <CycleTracker />
                    <TodayLogs />
                    <Metrics />
                    <AIInsights />
                </div>

                <aside className="dashboard-sidebar">
                    <Reminders />

                    <div className="card education-card mt-6">
                        <h3>Learn & Grow <BookHeart size={20} className="inline ml-1 text-lavender" /></h3>
                        <div className="edu-list">
                            {resources.length > 0 ? resources.map(resource => (
                                <article key={resource.id} className="edu-item">
                                    <div className="edu-img" style={{ backgroundImage: `url(${resource.image})` }}></div>
                                    <div className="edu-text">
                                        <h4>{resource.title}</h4>
                                        <span>{resource.readTime} read {resource.category && `• ${resource.category}`}</span>
                                    </div>
                                </article>
                            )) : (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New resources loading...</p>
                            )}
                        </div>
                        <a href="/resources" className="view-all-link">View all resources ➔</a>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default HealthHub;
