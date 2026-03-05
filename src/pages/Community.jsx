import React, { useState, useEffect } from 'react';
import { PenSquare, Filter, ChevronDown, Loader2 } from 'lucide-react';
import PostCard from '../components/PostCard';
import NewPostModal from '../components/NewPostModal';
import { listenToPosts, createPost, fetchUserJoinedCircles } from '../utils/communityService';
import { Link } from 'react-router-dom';
import './Community.css';

const categories = ["All", "Career", "Health", "Mental Health", "Relationships", "Entrepreneurship", "Safety", "Education"];

const Community = () => {
    const [activeCategory, setActiveCategory] = useState("All");
    const [activeSort, setActiveSort] = useState("New");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCircle, setActiveCircle] = useState(null);
    const [posts, setPosts] = useState([]);
    const [postLimit, setPostLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
    const [joinedCircles, setJoinedCircles] = useState([]);

    useEffect(() => {
        let unsubscribe = null;
        setLoading(true);

        const debounce = setTimeout(() => {
            unsubscribe = listenToPosts(
                postLimit,
                activeCategory,
                activeSort,
                searchQuery,
                activeCircle,
                ({ posts: updatedPosts, hasMore: moreAvailable }) => {
                    setPosts(updatedPosts);
                    setHasMore(moreAvailable);
                    setLoading(false);
                },
                (error) => {
                    console.error("Error loading live posts:", error);
                    setLoading(false);
                }
            );
        }, 300); // Small debounce for search/filter changes

        return () => {
            clearTimeout(debounce);
            if (unsubscribe) unsubscribe();
        };
    }, [activeCategory, activeSort, searchQuery, activeCircle, postLimit]);

    useEffect(() => {
        const loadUserCircles = async () => {
            try {
                const circles = await fetchUserJoinedCircles();
                setJoinedCircles(circles);
            } catch (error) {
                console.error("Error loading user circles:", error);
            }
        };
        loadUserCircles();
    }, []);

    const handleLoadMore = () => {
        if (!hasMore) return;
        setPostLimit(prev => prev + 10);
    };

    const handleCreatePost = async (postData) => {
        await createPost(postData);
        // Listener handles UI update
    };

    return (
        <div className="page-container community-page">
            <div className="community-header">
                <div>
                    <h1 className="section-title">Sisterhood Q&A </h1>
                    <p className="section-subtitle">A safe, anonymous, and empowering space to ask, answer, and support each other.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" onClick={() => setIsNewPostModalOpen(true)}>
                        <PenSquare size={20} />
                        <span>New Post</span>
                    </button>
                </div>
            </div>

            <div className="community-layout">
                <main className="feed-section">
                    <div className="search-bar-container" style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search discussions, tags, or users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="feed-controls">
                        <div className="category-filters">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="sort-dropdown">
                            <span className="sort-label">Sort by:</span>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <select
                                    className="sort-btn"
                                    value={activeSort}
                                    onChange={(e) => setActiveSort(e.target.value)}
                                    style={{
                                        appearance: 'none',
                                        paddingRight: '24px',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                        border: 'none',
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        color: 'inherit',
                                        fontWeight: '600'
                                    }}
                                >
                                    <option value="New">New</option>
                                    <option value="Top">Top</option>
                                    <option value="Most Replied">Most Replied</option>
                                    <option value="Trending">Trending</option>
                                </select>
                                <ChevronDown size={16} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                            </div>
                        </div>
                    </div>

                    <div className="thread-list">
                        {loading ? (
                            <div className="empty-state">
                                <Loader2 size={32} className="spinning" style={{ color: 'var(--color-plum)', animation: 'spin 1s linear infinite' }} />
                                <p>Loading sisterhood posts...</p>
                                <style>{`
                                    @keyframes spin { 100% { transform: rotate(360deg); } }
                                    .spinning { margin-bottom: 12px; }
                                `}</style>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="empty-state">
                                <p>No recent posts found in this category.</p>
                            </div>
                        ) : (
                            <>
                                {posts.map(post => (
                                    <PostCard key={post.id} post={post} />
                                ))}

                                {hasMore && (
                                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                                        <button
                                            className="btn-secondary"
                                            onClick={handleLoadMore}
                                        >
                                            Load More Posts
                                        </button>
                                    </div>
                                )}
                                {!hasMore && posts.length > 0 && (
                                    <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        You've reached the end of the feed.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>

                <aside className="community-sidebar">
                    <div className="card guidelines-card">
                        <h3>Community Guidelines 🛡️</h3>
                        <ul className="guidelines-list">
                            <li>Be kind, supportive, and non-judgmental.</li>
                            <li>Respect everyone's privacy and anonymity.</li>
                            <li>No hate speech, bullying, or discrimination.</li>
                            <li>Share knowledge, uplift each other.</li>
                        </ul>
                    </div>

                    <div className="card circles-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>My Private Circles ⭕</h3>
                            {activeCircle && (
                                <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setActiveCircle(null)}>
                                    Clear
                                </button>
                            )}
                        </div>
                        {joinedCircles.length > 0 ? (
                            joinedCircles.map(circle => (
                                <div
                                    key={circle.id}
                                    className={`circle-item ${activeCircle === circle.id ? 'active' : ''}`}
                                    onClick={() => setActiveCircle(circle.id)}
                                    style={{ cursor: 'pointer', background: activeCircle === circle.id ? 'var(--color-blush)' : 'transparent', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
                                >
                                    <div className="circle-icon" style={{ backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', width: '48px', height: '48px', borderRadius: '12px' }}>
                                        {circle.icon && circle.icon.startsWith('http') ? (
                                            <img src={circle.icon} alt={circle.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '12px' }} />
                                        ) : (
                                            <span style={{ fontSize: '24px' }}>{circle.icon || "⭕"}</span>
                                        )}
                                    </div>
                                    <div className="circle-info">
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{circle.name}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{circle.memberCount} members</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>You haven't joined any circles yet.</p>
                                <Link to="/circles" style={{ color: 'var(--color-plum)', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}>Discover Circles</Link>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {isNewPostModalOpen && (
                <NewPostModal
                    onClose={() => setIsNewPostModalOpen(false)}
                    onSubmit={handleCreatePost}
                />
            )}
        </div>
    );
};

export default Community;
