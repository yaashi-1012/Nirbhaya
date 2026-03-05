import React from 'react';
import { Briefcase } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const sideHustleLinks = [
    { id: "hustle_1", title: "Freelance Writing Guide", subtitle: "How to get first client", url: "https://www.youtube.com/watch?v=KZKq8xD9ZpM" },
    { id: "hustle_2", title: "Salary Negotiation", subtitle: "Scripts that work 100%", url: "https://www.youtube.com/watch?v=KMdE-7w1mB0" },
    { id: "hustle_3", title: "Selling Crafts Online", subtitle: "Platform comparisons", url: "https://www.youtube.com/watch?v=1g8QJq7nXjI" },
];

const SideHustles = () => {

    const handleHustleClick = async (hustle) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            // Record the click activity for analytics or history
            await setDoc(doc(db, "users", user.uid, "finance_hustleClicks", hustle.id), {
                title: hustle.title,
                lastClicked: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error logging hustle click", error);
        }
    };

    return (
        <div className="card side-hustle-card mt-6">
            <h3>Earn Extra <Briefcase size={20} className="inline ml-1 text-lavender" /></h3>
            <ul className="hustle-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sideHustleLinks.map(hustle => (
                    <li key={hustle.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => handleHustleClick(hustle)}>
                        <a href={hustle.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                            <div className="hustle-bullet" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{hustle.title}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hustle.subtitle}</span>
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SideHustles;
