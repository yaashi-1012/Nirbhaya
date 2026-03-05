import React from 'react';
import { PlayCircle, Award, Briefcase, IndianRupee } from 'lucide-react';
import GoalPlanner from '../components/GoalPlanner';
import SavingsChallenge from '../components/SavingsChallenge';
import FinanceLessons from '../components/FinanceLessons';
import SideHustles from '../components/SideHustles';
import FinanceAnalytics from '../components/FinanceAnalytics';
import './Finance.css';

const Finance = () => {
    return (
        <div className="page-container finance-page">
            <div className="finance-header">
                <div>
                    <h1 className="section-title">Financial Independence 📈</h1>
                    <p className="section-subtitle">Take control of your wealth. Learn, plan, and grow.</p>
                </div>
            </div>

            <FinanceAnalytics />

            <div className="finance-layout">
                <main className="finance-main">
                    <GoalPlanner />
                    <FinanceLessons />
                </main>

                <aside className="finance-sidebar">
                    <SavingsChallenge />
                    <SideHustles />
                </aside>
            </div>
        </div>
    );
};

export default Finance;
