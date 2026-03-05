import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchCircleById, checkMembership } from '../utils/communityService';
import { auth } from '../firebase';
import ChatSection from '../components/ChatSection';
import './ChatPage.css';

const ChatPage = () => {
    const { circleId } = useParams();
    const navigate = useNavigate();

    const [circle, setCircle] = useState(null);
    const [membershipRole, setMembershipRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const currentUser = auth.currentUser;

    useEffect(() => {
        const loadCircleData = async () => {
            try {
                setLoading(true);
                const [circleData, role] = await Promise.all([
                    fetchCircleById(circleId),
                    checkMembership(circleId)
                ]);

                if (!circleData) {
                    navigate('/circles');
                    return;
                }

                setCircle(circleData);
                setMembershipRole(role);
            } catch (error) {
                console.error("Error loading circle for chat:", error);
            } finally {
                setLoading(false);
            }
        };

        loadCircleData();
    }, [circleId, navigate]);

    if (loading) {
        return (
            <div className="page-container chat-page-loading">
                <Loader2 size={40} className="spinning" style={{ color: 'var(--color-plum)' }} />
            </div>
        );
    }

    if (!circle) return null;

    return (
        <div className="chat-page-container">
            <main className="chat-page-main">
                <ChatSection
                    circle={circle}
                    membershipRole={membershipRole}
                    currentUser={currentUser}
                    onBack={() => navigate(`/circles/${circleId}`)}
                />
            </main>
        </div>
    );
};

export default ChatPage;
