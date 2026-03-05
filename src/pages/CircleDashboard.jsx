import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Lock, EyeOff, Users, ArrowLeft, Loader2, Info, Settings, Edit2, MessageCircle } from 'lucide-react';
import { fetchCircleById, checkMembership, joinCircle, updateCircle, deleteCircle, leaveCircle } from '../utils/communityService';
import { auth } from '../firebase';
import EditCircleModal from '../components/EditCircleModal';
import ManageMembersModal from '../components/ManageMembersModal';
import './CircleDashboard.css';

const CircleDashboard = () => {
    const { circleId } = useParams();
    const navigate = useNavigate();

    const [circle, setCircle] = useState(null);
    const [membershipRole, setMembershipRole] = useState(null); // 'admin' | 'moderator' | 'member' | null
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isManagingMembers, setIsManagingMembers] = useState(false); // New state
    const isAdmin = membershipRole === 'admin';
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
                    navigate('/circles'); // Redirect if not found
                    return;
                }

                setCircle(circleData);
                setMembershipRole(role);
            } catch (error) {
                console.error("Error loading circle:", error);
            } finally {
                setLoading(false);
            }
        };

        loadCircleData();
    }, [circleId, navigate]);

    const handleJoin = async () => {
        try {
            setJoining(true);
            await joinCircle(circleId, circle.privacyType);
            setMembershipRole("member");
            setCircle(prev => ({ ...prev, memberCount: prev.memberCount + 1 }));
        } catch (error) {
            console.error("Failed to join:", error);
            alert(error.message);
        } finally {
            setJoining(false);
        }
    };

    const handleSaveCircle = async (updatedData) => {
        // Will throw error if fails, caught by EditCircleModal
        await updateCircle(circleId, updatedData);
        setCircle(prev => ({ ...prev, ...updatedData }));
    };

    const handleLeave = async () => {
        if (!window.confirm("Are you sure you want to leave this circle?")) return;
        setJoining(true);
        try {
            await leaveCircle(circleId);
            setMembershipRole(null);
            setCircle(prev => ({ ...prev, memberCount: prev.memberCount - 1 }));
        } catch (error) {
            console.error(error);
            alert("Failed to leave circle: " + (error.message || "Please try again."));
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={40} className="spinning" style={{ color: 'var(--color-plum)' }} />
            </div>
        );
    }

    if (!circle) return null;

    return (
        <div className="circle-dashboard-page">
            <button className="back-btn" onClick={() => navigate('/circles')}>
                <ArrowLeft size={16} /> Back to Discover
            </button>

            <header className={`circle - header - banner ${isAdmin ? 'admin-view' : ''} `}>
                {circle.coverImage ? (
                    <div className="circle-cover" style={{ backgroundImage: `url(${circle.coverImage})` }}>
                        {isAdmin && <div className="edit-overlay banner-edit" onClick={() => setIsEditing(true)}><Edit2 size={16} /> Edit Banner</div>}
                    </div>
                ) : (
                    <div className="circle-cover placeholder-cover">
                        {isAdmin && <div className="edit-overlay banner-edit" onClick={() => setIsEditing(true)}><Edit2 size={16} /> Add Banner</div>}
                    </div>
                )}

                <div className="circle-header-content">
                    <div className="circle-header-top">
                        <div className="circle-logo-wrapper">
                            <div className="circle-logo">
                                {circle.icon && circle.icon.startsWith('http') ? (
                                    <img src={circle.icon} alt={circle.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                    circle.icon
                                )}
                            </div>
                            {isAdmin && <div className="edit-overlay icon-edit" onClick={() => setIsEditing(true)}><Edit2 size={14} /></div>}
                        </div>
                        <div className="circle-actions" style={{ display: 'flex', gap: '8px' }}>
                            {isAdmin && (
                                <>
                                    <button className="btn btn-secondary" onClick={() => setIsManagingMembers(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Users size={16} /> Members
                                    </button>
                                    <button className="btn btn-secondary edit-circle-btn" onClick={() => setIsEditing(true)}>
                                        <Settings size={16} /> Manage
                                    </button>
                                </>
                            )}
                            {!membershipRole ? (
                                <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>
                                    {joining ? <Loader2 size={16} className="spinning" /> : "Join Circle"}
                                </button>
                            ) : isAdmin ? (
                                <div className="joined-indicator">
                                    <Shield size={16} /> Admin
                                </div>
                            ) : (
                                <button className="btn btn-secondary" onClick={handleLeave} disabled={joining}>
                                    {joining ? <Loader2 size={16} className="spinning" /> : "Leave Circle"}
                                </button>
                            )}
                        </div>
                    </div>

                    <h1 className="circle-title">
                        {circle.name}
                        {circle.privacyType === 'secret' && <EyeOff size={20} style={{ marginLeft: '8px', color: 'var(--text-secondary)' }} />}
                    </h1>

                    <div className="circle-meta">
                        <span className="meta-item">
                            {circle.privacyType === 'public' && <><Shield size={16} /> Public Circle</>}
                            {circle.privacyType === 'private' && <><Lock size={16} /> Private Circle</>}
                            {circle.privacyType === 'secret' && <><EyeOff size={16} /> Secret Circle</>}
                        </span>
                        <span className="meta-item">
                            <Users size={16} /> {circle.memberCount} Members
                        </span>
                        <span className="meta-item category-tag">{circle.category}</span>
                    </div>

                    <p className="circle-desc-main">{circle.description}</p>
                </div>
            </header>

            <div className="circle-layout">
                <main className="circle-main-feed">
                    <div className="chat-promo-card card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <h2 style={{ color: 'var(--color-plum)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <MessageCircle size={24} /> Circle Chat
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            Connect with your sisters in real-time. Discuss, share, and support each other.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '12px 24px', fontSize: '16px' }}
                            onClick={() => navigate(`/circles/${circleId}/chat`)}
                        >
                            Open Chat Room
                        </button >
                    </div >

                    <div className="placeholder-card card" style={{ marginTop: '24px' }}>
                        <h3>Posts</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            The post feed is currently being built. Stay tuned!
                        </p>
                    </div>
                </main >

                <aside className="circle-sidebar">
                    <div className="card text-sm">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Info size={16} /> About this Circle
                        </h3>
                        {circle.allowAnonymous ? (
                            <p className="status-good" style={{ padding: '8px', background: 'var(--color-blush)', borderRadius: '8px', marginBottom: '16px' }}>
                                🎭 Anonymous posting is <strong>allowed</strong>.
                            </p>
                        ) : (
                            <p style={{ padding: '8px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                👤 Anonymous posts are disabled.
                            </p>
                        )}

                        <div className="text-muted">
                            <p>Created: {circle.createdAt?.toDate ? circle.createdAt.toDate().toLocaleDateString() : 'Recently'}</p>
                        </div>
                    </div>

                    {circle.rules && circle.rules.length > 0 && (
                        <div className="card rules-card">
                            <h3>Circle Rules</h3>
                            <ol className="rules-list">
                                {circle.rules.map((rule, idx) => (
                                    <li key={idx}>{rule}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </aside>
            </div >

            {isEditing && (
                <EditCircleModal
                    circle={circle}
                    onClose={() => setIsEditing(false)}
                    onSave={async (updatedData) => {
                        await updateCircle(circle.id, updatedData);
                        setCircle({ ...circle, ...updatedData });
                    }}
                    onDelete={async () => {
                        await deleteCircle(circle.id);
                        navigate('/circles');
                    }}
                />
            )}

            {isManagingMembers && (
                <ManageMembersModal
                    circle={circle}
                    currentUser={currentUser}
                    onClose={() => {
                        // After members modal closes, reload circle count
                        setLoading(true);
                        fetchCircleById(circleId).then(setCircle).finally(() => setLoading(false));
                        setIsManagingMembers(false);
                    }}
                />
            )}
        </div >
    );
};

export default CircleDashboard;
