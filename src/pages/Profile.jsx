import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, MapPin, Briefcase, Calendar, Shield, X, UserX, AlertTriangle, Heart, MessageSquare, MoreHorizontal, CheckCircle2, Bookmark, ExternalLink, Award, TrendingUp, UserPlus, FileText, Search, BookOpen, Repeat } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { uploadToCloudinary } from '../cloudinaryUpload';
import { listenToFollowers, listenToFollowing, toggleFollow } from '../utils/userService';
import { listenToUserStories, listenToUserReposts } from '../utils/storyService';
import { listenToUserPosts } from '../utils/communityService';
import StoryCard from '../components/StoryCard';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [isEditing, setIsEditing] = useState(false);
    const [showFollowers, setShowFollowers] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [modalActiveTab, setModalActiveTab] = useState('followers'); // 'followers' or 'following'
    const [modalLoading, setModalLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [editName, setEditName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editBio, setEditBio] = useState("");
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // --- Stories & Posts Tab State ---
    const [myPosts, setMyPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [myStories, setMyStories] = useState([]);
    const [myReposts, setMyReposts] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(false);
    const [repostsLoading, setRepostsLoading] = useState(false);

    const handleEditProfile = async () => {
        try {
            setUploadingImage(true);
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            let finalPhotoUrl = null;

            if (selectedImageFile) {
                finalPhotoUrl = await uploadToCloudinary(selectedImageFile);
            }

            const userRef = doc(db, "users", userId);

            const updateData = {
                name: editName,
                username: editUsername.replace('@', ''),
                bio: editBio,
                ...(finalPhotoUrl && { photoURL: finalPhotoUrl })
            };

            setSelectedImageFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error("Error updating profile:", error);
            setUploadingImage(false);
            alert(error.message || "Failed to update profile.");
        }
    };

    const handleImageSelection = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedImageFile(file);
        // Create local preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
    };

    const isOwnProfile = true; // Later this can be dynamic based on route params

    useEffect(() => {
        // We use onSnapshot to listen for live updates to followers/points/etc
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const userRef = doc(db, "users", currentUserId);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Map Firestore structure to our UI structure gracefully
                setUserData({
                    name: data.name || "Anonymous",
                    username: data.username ? `@${data.username}` : "@new_sister",
                    bio: data.bio || "No bio added yet.",
                    location: data.location || "",
                    role: data.category || "",
                    interests: data.interests || [],
                    stats: {
                        posts: data.postCount || 0,
                        stories: data.storyCount || 0,
                        answers: data.stats?.answers || 0,
                        followers: data.stats?.followers || 0,
                        following: data.stats?.following || 0,
                        points: data.stats?.points || 0
                    },
                    joinedDate: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toLocaleDateString('default', { month: 'long', year: 'numeric' }) : "Recently",
                    avatarUrl: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'Sister')}&background=E6E6FA&color=4A0E4E`
                });
            } else {
                console.warn("User document not found.");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching live profile data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId || !showFollowers) return;

        setModalLoading(true);
        let unsubscribe = null;

        if (modalActiveTab === 'followers') {
            unsubscribe = listenToFollowers(currentUserId, (data) => {
                setFollowersList(data);
                setModalLoading(false);
            }, (error) => {
                console.error("Error listening to followers:", error);
                setModalLoading(false);
            });
        } else {
            unsubscribe = listenToFollowing(currentUserId, (data) => {
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
    }, [showFollowers, modalActiveTab]);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        let unsubscribeStories = null;
        let unsubscribeReposts = null;
        let unsubscribePosts = null;

        if (activeTab === 'posts') {
            setPostsLoading(true);
            unsubscribePosts = listenToUserPosts(uid,
                (data) => {
                    setMyPosts(data);
                    setPostsLoading(false);
                },
                (err) => {
                    console.error('Error loading user posts:', err);
                    setPostsLoading(false);
                }
            );
        }

        if (activeTab === 'mystories') {
            setStoriesLoading(true);
            unsubscribeStories = listenToUserStories(uid,
                (data) => {
                    setMyStories(data);
                    setStoriesLoading(false);
                },
                (err) => {
                    console.error('Error loading user stories:', err);
                    setStoriesLoading(false);
                }
            );
        }

        if (activeTab === 'reposts') {
            setRepostsLoading(true);
            unsubscribeReposts = listenToUserReposts(uid,
                (data) => {
                    setMyReposts(data);
                    setRepostsLoading(false);
                },
                (err) => {
                    console.error('Error loading reposts:', err);
                    setRepostsLoading(false);
                }
            );
        }

        return () => {
            if (unsubscribeStories) unsubscribeStories();
            if (unsubscribeReposts) unsubscribeReposts();
            if (unsubscribePosts) unsubscribePosts();
        };
    }, [activeTab]);

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf8fa' }}>Loading Profile...</div>;
    }

    if (!userData) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf8fa' }}>Profile not found.</div>;
    }

    const tabs = [
        { id: 'posts', label: 'Posts' },
        { id: 'mystories', label: 'Stories' },
        { id: 'reposts', label: 'Reposts' }
    ];

    const renderPostsTab = () => {
        if (postsLoading) {
            return (
                <div className="tab-content empty-state">
                    <div className="empty-message-container">
                        <p style={{ color: '#9ca3af' }}>Loading your posts...</p>
                    </div>
                </div>
            );
        }
        if (myPosts.length === 0) {
            return (
                <div className="tab-content insta-grid">
                    <div className="insta-empty-state">
                        <TrendingUp size={40} style={{ color: '#dbdbdb', margin: '0 auto 1rem auto' }} />
                        <h3 style={{ color: '#111', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No posts yet</h3>
                        <p style={{ color: '#8e8e8e', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Share your journey, successes, or thoughts with the sisterhood.</p>
                        <button className="btn-primary mt-3" onClick={() => navigate('/community')}><TrendingUp size={16} /> Go to Community</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="tab-content insta-grid">
                {myPosts.map(post => (
                    <div key={post.id} className="insta-grid-item" onClick={() => navigate('/community')}>
                        <div className="insta-grid-text">
                            <strong>{post.title}</strong>
                            <span style={{ marginTop: '0.5rem', opacity: 0.8 }}>{post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAnswersTab = () => (
        <div className="tab-content answers-list">
            {/* Dummy Answer 1 */}
            <div className="profile-answer-card mt-4">
                <div className="question-preview">
                    <strong>Q:</strong> "What are the best negotiation tactics for a first job offer?"
                </div>
                <div className="answer-content">
                    <p>Always ask for at least 10% more than their initial offer, and don't forget to negotiate non-salary perks like WFH days or learning budgets.</p>
                </div>
                <div className="answer-footer">
                    <span className="helpful-badge"><CheckCircle2 size={14} /> Helpful (42)</span>
                    <span className="post-time">3 weeks ago</span>
                </div>
            </div>
        </div>
    );

    const renderSavedTab = () => (
        <div className="tab-content saved-grid">
            <div className="profile-saved-card">
                <div className="saved-icon-wrapper"><Bookmark size={20} className="text-plum" /></div>
                <div className="saved-content">
                    <h4>Top 10 Mutual Funds for Beginners 2024</h4>
                    <span className="saved-meta">Finance • 5 mins read</span>
                </div>
                <button className="btn-icon"><ExternalLink size={16} /></button>
            </div>
            <div className="profile-saved-card">
                <div className="saved-icon-wrapper"><Bookmark size={20} className="text-plum" /></div>
                <div className="saved-content">
                    <h4>How to gracefully decline extra work</h4>
                    <span className="saved-meta">Career • 3 mins read</span>
                </div>
                <button className="btn-icon"><ExternalLink size={16} /></button>
            </div>
        </div>
    );

    const renderAchievementsTab = () => (
        <div className="tab-content achievements-grid">
            <div className="achievement-badge earned">
                <div className="badge-icon gold"><Award size={32} /></div>
                <h4>Top Contributor</h4>
                <p>Among the top 5% most helpful members.</p>
            </div>
            <div className="achievement-badge earned">
                <div className="badge-icon silver"><CheckCircle2 size={32} /></div>
                <h4>100 Answers</h4>
                <p>Helped 100 sisters with their questions.</p>
            </div>
            <div className="achievement-badge locked">
                <div className="badge-icon grey"><Calendar size={32} /></div>
                <h4>365 Days Streak</h4>
                <p>Health tracker active for a full year.</p>
            </div>
        </div>
    );

    const renderActivityTab = () => (
        <div className="tab-content activity-feed">
            <div className="activity-item">
                <div className="activity-icon-timeline"><FileText size={16} /></div>
                <div className="activity-details">
                    <p><strong>You</strong> posted a new question in <strong>Finance</strong></p>
                    <span className="activity-time">2 hours ago</span>
                </div>
            </div>
            <div className="activity-item">
                <div className="activity-icon-timeline"><MessageSquare size={16} /></div>
                <div className="activity-details">
                    <p><strong>You</strong> answered a question by <strong>@priya_g</strong></p>
                    <span className="activity-time">Yesterday</span>
                </div>
            </div>
            <div className="activity-item">
                <div className="activity-icon-timeline"><UserPlus size={16} /></div>
                <div className="activity-details">
                    <p><strong>You</strong> started following <strong>@dr_neha</strong></p>
                    <span className="activity-time">3 days ago</span>
                </div>
            </div>
            <div className="activity-item">
                <div className="activity-icon-timeline"><Award size={16} /></div>
                <div className="activity-details">
                    <p><strong>You</strong> earned the <strong>100 Answers</strong> badge!</p>
                    <span className="activity-time">1 week ago</span>
                </div>
            </div>
        </div>
    );

    const renderMyStoriesTab = () => {
        if (storiesLoading) {
            return (
                <div className="tab-content empty-state">
                    <div className="empty-message-container">
                        <p style={{ color: '#9ca3af' }}>Loading your stories...</p>
                    </div>
                </div>
            );
        }
        if (myStories.length === 0) {
            return (
                <div className="tab-content insta-grid">
                    <div className="insta-empty-state">
                        <BookOpen size={40} style={{ color: '#dbdbdb', margin: '0 auto 1rem auto' }} />
                        <h3 style={{ color: '#111', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No stories yet</h3>
                        <p style={{ color: '#8e8e8e', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Share your journey, successes, or thoughts with the sisterhood.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="tab-content insta-grid">
                {myStories.map(story => (
                    <StoryCard
                        key={story.id}
                        story={story}
                        onReadMore={() => navigate(`/stories/${story.id}`)}
                    />
                ))}
            </div>
        );
    };

    const renderRepostsTab = () => {
        if (repostsLoading) {
            return (
                <div className="tab-content empty-state">
                    <div className="empty-message-container">
                        <p style={{ color: '#9ca3af' }}>Loading reposts...</p>
                    </div>
                </div>
            );
        }
        if (myReposts.length === 0) {
            return (
                <div className="tab-content insta-grid">
                    <div className="insta-empty-state">
                        <Repeat size={40} style={{ color: '#dbdbdb', margin: '0 auto 1rem auto' }} />
                        <h3 style={{ color: '#111', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No reposts yet</h3>
                        <p style={{ color: '#8e8e8e', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Stories you repost will appear here.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="tab-content insta-grid">
                {myReposts.map(story => (
                    <div key={story.id} style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            color: '#7c3aed',
                            fontWeight: '600',
                            marginBottom: '8px',
                            padding: '0 4px'
                        }}>
                            <Repeat size={14} /> You reposted
                        </div>
                        <StoryCard
                            story={story}
                            onReadMore={() => navigate(`/stories/${story.id}`)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'posts':
                return renderPostsTab();
            case 'mystories':
                return renderMyStoriesTab();
            case 'reposts':
                return renderRepostsTab();
            default:
                return null;
        }
    };

    return (
        <div className="profile-page-container">
            {/* --- INSTAGRAM HEADER --- */}
            <header className="insta-header">
                <div className="insta-avatar-container">
                    <img src={userData.avatarUrl} alt="Profile" className="insta-avatar" />
                </div>

                <div className="insta-info-container">
                    <div className="insta-title-row">
                        <h1 className="insta-username">{userData.username ? userData.username.replace('@', '') : userData.name}</h1>
                        <button className="btn-insta-following" onClick={() => {
                            setEditName(userData.name);
                            setEditBio(userData.bio !== "No bio added yet." ? userData.bio : "");
                            setPreviewUrl(userData.avatarUrl);
                            setSelectedImageFile(null);
                            setIsEditing(true);
                        }}>
                            Edit Profile
                        </button>
                    </div>

                    <div className="insta-bio-section">
                        <div className="insta-bio-name">{userData.name}</div>
                        <div>{userData.bio}</div>
                        <div className="insta-meta-row">
                            {userData.location && <span><MapPin size={12} /> {userData.location}</span>}
                            {userData.role && <span><Briefcase size={12} /> {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span>}
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
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`insta-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* --- TAB CONTENT --- */}
            <main className="profile-tab-content-area">
                {renderTabContent()}
            </main>

            {/* --- EDIT MODAL (Placeholder for now) --- */}
            {isEditing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Edit Profile</h2>
                            <button className="modal-close" onClick={() => setIsEditing(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={previewUrl || userData.avatarUrl} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--profile-lavender)', opacity: uploadingImage ? 0.5 : 1 }} />
                                    <label htmlFor="modal-avatar-upload" style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--profile-plum)', color: 'white', border: '2px solid white', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex' }}>
                                        <Edit2 size={14} />
                                    </label>
                                    <input type="file" id="modal-avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelection} disabled={uploadingImage} />
                                </div>
                                {uploadingImage && <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>Saving profile...</p>}
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Bio (150-200 chars)</label>
                                <textarea className="form-textarea" value={editBio} onChange={(e) => setEditBio(e.target.value)}></textarea>
                            </div>
                            {/* More fields to come */}
                            <div className="toggle-group" style={{ marginTop: '2rem' }}>
                                <div>
                                    <h4 style={{ color: 'var(--profile-deep-plum)' }}>Anonymous Posting Mode</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Hide identity on new posts by default.</p>
                                </div>
                                <input type="checkbox" />
                            </div>

                            <div className="toggle-group" style={{ marginTop: '2rem', borderTop: '1px solid #fee2e2', paddingTop: '1rem' }}>
                                <div>
                                    <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> Danger Zone</h4>
                                </div>
                                <button style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <UserX size={16} /> Delete Account
                                </button>
                            </div>

                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} onClick={handleEditProfile} disabled={uploadingImage}>
                                {uploadingImage ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                                            {modalActiveTab === 'following' && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                    onClick={async () => {
                                                        const isFollowing = await toggleFollow(user.id);
                                                        setFollowingList(prev => prev.filter(f => f.id !== user.id));
                                                    }}
                                                >
                                                    Following
                                                </button>
                                            )}
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

export default Profile;
