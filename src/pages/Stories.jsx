import React, { useState, useEffect } from 'react';
import { Search, PenTool, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StoryCard from '../components/StoryCard';
import ShareStoryModal from '../components/ShareStoryModal';
import { fetchFeaturedStory, listenToStories } from '../utils/storyService';
import './Stories.css';

const storyCategories = ["All", "Inspiration", "Career", "Motherhood", "Financial Independence", "Health & Wellness", "Technology"];

const Stories = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const [featuredStory, setFeaturedStory] = useState(null);
    const [stories, setStories] = useState([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [loadingStories, setLoadingStories] = useState(true);
    const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);

    useEffect(() => {
        loadFeatured();
    }, []);

    useEffect(() => {
        setLoadingStories(true);
        const unsubscribe = listenToStories(
            activeCategory,
            searchQuery,
            50, // limit
            (newStories) => {
                setStories(newStories);
                setLoadingStories(false);
            },
            (error) => {
                console.error("Error listening to stories:", error);
                setLoadingStories(false);
            }
        );

        return () => unsubscribe();
    }, [activeCategory, searchQuery]);

    const loadFeatured = async () => {
        try {
            const featured = await fetchFeaturedStory();
            setFeaturedStory(featured);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingFeatured(false);
        }
    };

    const handlePublishSuccess = (newStory) => {
        // onSnapshot automatically updates the feed, no need for manual local state injection!
        alert("Your story has been published successfully!");
    };

    const getOptimizedUrl = (url, width) => {
        if (!url || !url.includes("cloudinary.com")) return url;
        const parts = url.split("upload/");
        if (parts.length === 2) {
            return `${parts[0]}upload/w_${width},f_auto,q_auto/${parts[1]}`;
        }
        return url;
    };

    return (
        <div className="page-container stories-page">
            <div className="stories-header">
                <div className="header-text">
                    <h1 className="section-title">Stories & Inspiration ✨</h1>
                    <p className="section-subtitle">Read, celebrate, and be inspired by women who are changing the world.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsSharingModalOpen(true)}>
                    <PenTool size={20} />
                    <span>Share Your Story</span>
                </button>
            </div>

            {loadingFeatured ? (
                <div className="card fade-in" style={{ padding: '60px', textAlign: 'center' }}>
                    <Loader2 size={32} className="spinning" style={{ margin: '0 auto', color: 'var(--color-plum)' }} />
                </div>
            ) : featuredStory ? (
                <div className="hero-story card fade-in" style={{ cursor: 'pointer' }} onClick={() => navigate(`/stories/${featuredStory.id}`)}>
                    <div className="hero-content">
                        <span className="badge mb-2"><Sparkles size={14} className="inline mr-1" /> Featured Story</span>
                        <h2>{featuredStory.title}</h2>
                        <div style={{ fontSize: '0.9rem', color: '#6d28d9', marginBottom: '12px', fontWeight: '500' }}>
                            By {featuredStory.authorName} {featuredStory.designation && `• ${featuredStory.designation}`}
                        </div>
                        <p className="hero-excerpt" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {featuredStory.content}
                        </p>
                        <button className="btn btn-secondary mt-4">
                            Read Featured Story <ArrowRight size={16} className="ml-2" />
                        </button>
                    </div>
                    <div className="hero-image-wrapper">
                        <img
                            src={getOptimizedUrl(featuredStory.coverImageUrl, 1200)}
                            alt="Featured"
                            className="hero-image"
                        />
                    </div>
                </div>
            ) : (
                <div className="hero-story card fade-in" style={{ background: 'linear-gradient(135deg, #f3e8ff, #e0e7ff)' }}>
                    <div className="hero-content" style={{ width: '100%' }}>
                        <h2>Every sister has a story.</h2>
                        <p className="hero-excerpt">What journey has shaped you? Share your triumphs, lessons, and experiences to inspire others in our safe space.</p>
                    </div>
                </div>
            )}

            <div className="stories-controls">
                <div className="search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search stories by name, role, or keywords..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="category-filters">
                    {storyCategories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="stories-grid">
                {loadingStories && stories.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                        <Loader2 size={32} className="spinning" style={{ margin: '0 auto', color: 'var(--color-plum)' }} />
                    </div>
                ) : (
                    <>
                        {stories.map(story => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                onReadMore={() => navigate(`/stories/${story.id}`)}
                            />
                        ))}
                    </>
                )}

                {!loadingStories && stories.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <p>No stories found matching your criteria.</p>
                        <button className="btn btn-outline mt-2" onClick={() => setActiveCategory("All")}>Clear Filters</button>
                    </div>
                )}
            </div>

            {/* Removed manual Load More button since onSnapshot streams real-time updates */}

            {isSharingModalOpen && (
                <ShareStoryModal
                    onClose={() => setIsSharingModalOpen(false)}
                    onPublishSuccess={handlePublishSuccess}
                />
            )}
        </div>
    );
};

export default Stories;
