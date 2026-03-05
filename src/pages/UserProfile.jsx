import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, Calendar, Shield, Award, TrendingUp, CheckCircle2, UserPlus, FileText, ChevronLeft, Search, Heart, MessageSquare } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { toggleFollow, checkFollowStatus, listenToFollowers, listenToFollowing } from '../utils/userService';
import { X } from 'lucide-react';
import './Profile.css'; // Reusing standard profile styles for consistency

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const [showFollowers, setShowFollowers] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [modalActiveTab, setModalActiveTab] = useState('followers');
    const [modalLoading, setModalLoading] = useState(false);

    const isCurrentUser = auth.currentUser?.uid === userId;

    useEffect(() => {
        if (!userId) return;

        // If trying to view own profile, redirect to the personal profile page
        if (isCurrentUser) {
            navigate('/profile', { replace: true });
            return;
        }

        const userRef = doc(db, "users", userId);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                setUserData({
                    id: docSnap.id,
                    name: data.name || "Anonymous",
                    username: data.username ? `@${data.username}` : "",
                    bio: data.bio || "No bio added yet.",
                    location: data.location || "",
                    role: data.category || "",
                    interests: data.interests || [],
                    stats: {
                        posts: data.postCount || 0,
                        stories: data.storyCount || 0,
                        answers: data.stats?.answers || 0,
                        followers: data.stats?.followers || data.followerCount || 0,
                        following: data.stats?.following || data.followingCount || 0,
                        points: data.stats?.points || 0
                    },
                    joinedDate: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toLocaleDateString('default', { month: 'long', year: 'numeric' }) : "Recently",
                    avatarUrl: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || data.name || 'Sister')}&background=E6E6FA&color=4A0E4E`
                });
            } else {
                setUserData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, isCurrentUser, navigate]);

    useEffect(() => {
        const verifyFollowStatus = async () => {
            if (!auth.currentUser || !userId) return;
            const status = await checkFollowStatus(auth.currentUser.uid, userId);
            setIsFollowing(status);
        };
        verifyFollowStatus();
    }, [userId]);

    useEffect(() => {
        if (!userId || !showFollowers) return;

        setModalLoading(true);
        let unsubscribe = null;

        if (modalActiveTab === 'followers') {
            unsubscribe = listenToFollowers(userId, (data) => {
                setFollowersList(data);
                setModalLoading(false);
            }, (error) => {
                console.error("Error listening to followers:", error);
                setModalLoading(false);
            });
        } else {
            unsubscribe = listenToFollowing(userId, (data) => {
                setFollowingList(data);
                setModalLoading(false);
            }, (error) => {
                console.error("Error listening to following:", error);
                setModalLoading(false);
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [showFollowers, modalActiveTab, userId]);

    const handleToggleFollow = async () => {
        if (followLoading) return;
        setFollowLoading(true);

        try {
            // Optimistic UI toggle handled by firestore snapshot natively reacting to transaction updates!
            // But we can instantly set the local button state.
            const previousState = isFollowing;
            setIsFollowing(!previousState);

            const newStatus = await toggleFollow(userId);
            setIsFollowing(newStatus); // Correct with truth if there was a discrepancy
        } catch (error) {
            console.error("Failed to toggle follow:", error);
            setIsFollowing((prev) => !prev); // Revert optimistic update
            alert("Failed to follow user. Please try again.");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container flex-center">
                <div style={{ color: 'var(--accent-primary)', padding: '40px' }}>Loading public profile...</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="page-container flex-center">
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Search size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>User Not Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>This account doesn't exist or may have been removed.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/community')}>Return to Community</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container profile-page view-mode">
            <button
                className="btn btn-secondary mb-4"
                onClick={() => navigate(-1)}
                style={{ display: 'inline-flex', padding: '6px 12px', gap: '4px', fontSize: '0.9rem' }}
            >
                <ChevronLeft size={16} /> Back
            </button>

            {/* --- INSTA HEADER --- */}
            <header className="insta-header">
                <div className="insta-avatar-container">
                    <img
                        src={userData.avatarUrl}
                        alt={userData.name}
                        className="insta-avatar"
                    />
                </div>

                <div className="insta-info-container">
                    <div className="insta-title-row">
                        <h1 className="insta-username">{userData.username ? userData.username.replace('@', '') : userData.name}</h1>
                        <button
                            className={isFollowing ? 'btn-insta-following' : 'btn-insta-follow'}
                            onClick={handleToggleFollow}
                            disabled={followLoading}
                            style={{ minWidth: '110px' }}
                        >
                            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>

                    <div className="insta-bio-section">
                        <div className="insta-bio-name">{userData.name}</div>
                        <div>{userData.bio}</div>
                        <div className="insta-meta-row">
                            {userData.role && <span><Briefcase size={12} /> {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span>}
                            {userData.location && <span><MapPin size={12} /> {userData.location}</span>}
                            <span>Joined {userData.joinedDate}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- INSTA STATS ROW --- */}
            <div className="insta-stats-row">
                <div className="insta-stat-item">
                    <span className="insta-stat-value">{userData.stats.posts}</span>
                    <span className="insta-stat-label">posts</span>
                </div>
                <div className="insta-stat-item">
                    <span className="insta-stat-value">{userData.stats.stories}</span>
                    <span className="insta-stat-label">stories</span>
                </div>
                <div className="insta-stat-item clickable" onClick={() => { setModalActiveTab('followers'); setShowFollowers(true); }}>
                    <span className="insta-stat-value">{userData.stats.followers}</span>
                    <span className="insta-stat-label">followers</span>
                </div>
                <div className="insta-stat-item clickable" onClick={() => { setModalActiveTab('following'); setShowFollowers(true); }}>
                    <span className="insta-stat-value">{userData.stats.following}</span>
                    <span className="insta-stat-label">following</span>
                </div>
                <div className="insta-stat-item">
                    <span className="insta-stat-value">{userData.stats.points}</span>
                    <span className="insta-stat-label">points</span>
                </div>
            </div>

            {/* --- INSTA TABS --- */}
            <nav className="insta-tabs">
                <button
                    className={`insta-tab ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                >
                    POSTS
                </button>
                <button
                    className={`insta-tab ${activeTab === 'stories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stories')}
                >
                    STORIES
                </button>
                <button
                    className={`insta-tab ${activeTab === 'reposts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reposts')}
                >
                    REPOSTS
                </button>
            </nav>

            {/* --- TAB CONTENT --- */}
            <main className="profile-tab-content-area">
                <div className="tab-content insta-grid">
                    <div className="insta-empty-state">
                        <p>{userData.name}'s public posts will appear here soon.</p>
                    </div>
                </div>
            </main>

            {showFollowers && (
                <div className="modal-overlay">
                    <div className="modal-content followers-modal" style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', gap: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                <span
                                    style={{ cursor: 'pointer', color: modalActiveTab === 'followers' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                    onClick={() => setModalActiveTab('followers')}
                                >
                                    Followers
                                </span>
                                <span
                                    style={{ cursor: 'pointer', color: modalActiveTab === 'following' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                    onClick={() => setModalActiveTab('following')}
                                >
                                    Following
                                </span>
                            </div>
                            <button className="modal-close" onClick={() => setShowFollowers(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="search-bar-wrapper" style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                                <input type="text" className="form-input" placeholder="Search sisterhood..." style={{ paddingLeft: '2.5rem' }} />
                            </div>

                            <div className="followers-list">
                                {modalLoading ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
                                ) : (modalActiveTab === 'followers' ? followersList : followingList).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        No users found.
                                    </div>
                                ) : (
                                    (modalActiveTab === 'followers' ? followersList : followingList).map(user => (
                                        <div key={user.id} className="follower-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => { setShowFollowers(false); navigate(`/user/${user.id}`); }}>
                                                <img src={user.photoURL} alt={user.name} className="follower-avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <div className="follower-info">
                                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{user.name}</h4>
                                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{user.username} • {user.points || 0} Points</p>
                                                </div>
                                            </div>
                                            {/* Not implementing follow toggle from inside another user's modal for simplicity right now */}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
