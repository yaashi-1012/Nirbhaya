import React, { useState, useEffect } from 'react';
import './Loader.css';
import AuthGateway from '../pages/AuthGateway';
import illustration from '../assets/unity_profiles.png';

const Loader = ({ onComplete }) => {
    const [phase, setPhase] = useState('playing');

    useEffect(() => {
        // Run animation strictly on every load as requested by user
        const timer1 = setTimeout(() => {
            setPhase('exiting');
        }, 2500); // 2.5s for presentation

        const timer2 = setTimeout(() => {
            setPhase('complete');
            sessionStorage.setItem('naari_intro_seen', 'true');
        }, 3500); // 1s for exit transition (total 3.5s)

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    if (phase === 'complete') {
        return <AuthGateway onLoginSuccess={onComplete} />;
    }

    return (
        <React.Fragment>
            {/* Mount AuthGateway behind the loader so the transition is smooth */}
            <AuthGateway onLoginSuccess={onComplete} />
            <div className={`loader-container phase-${phase}`} aria-hidden="true">
                <div className="ambient-glow"></div>
                <div className="particles">
                    <div className="particle p1"></div>
                    <div className="particle p2"></div>
                    <div className="particle p3"></div>
                    <div className="particle p4"></div>
                    <div className="particle p5"></div>
                </div>
                <div className="illustration-wrapper">
                    <div className="merge-glow-bg"></div>
                    <img src={illustration} alt="Women Unity" className="unity-illustration" />
                </div>
            </div>
        </React.Fragment>
    );
};

export default Loader;
