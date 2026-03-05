import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageSquare, Repeat, Clock, Loader2, Send } from 'lucide-react';
import { fetchStoryById, toggleStoryLike, hasUserLikedStory, repostStory, listenToStoryReplies, addStoryReply } from '../utils/storyService';
import { formatTimeAgo } from '../utils/timeAgo';
import './Stories.css'; // Reuse existing styles where applicable

const StoryDetail = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();

    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [reposts, setReposts] = useState(0);
    const [isReposting, setIsReposting] = useState(false);

    const [replies, setReplies] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    useEffect(() => {
        const loadDocs = async () => {
            try {
                const data = await fetchStoryById(storyId);
                if (!data) {
                    setError('Story not found.');
                    return;
                }
                setStory(data);
                setLikes(data.likesCount || 0);
                setReposts(data.repostCount || 0);

                const liked = await hasUserLikedStory(storyId);
                setIsLiked(liked);
            } catch (err) {
                console.error(err);
                setError('Failed to load story.');
            } finally {
                setLoading(false);
            }
        };
        loadDocs();
    }, [storyId]);

    useEffect(() => {
        if (!storyId) return;
        const unsubscribe = listenToStoryReplies(storyId, (liveReplies) => {
            setReplies(liveReplies);
        });
        return () => unsubscribe();
    }, [storyId]);

    const handleLike = async () => {
        const previousState = isLiked;
        setIsLiked(!previousState);
        setLikes(prev => previousState ? prev - 1 : prev + 1);

        const success = await toggleStoryLike(storyId, previousState);
        if (!success) {
            setIsLiked(previousState);
            setLikes(prev => previousState ? prev + 1 : prev - 1);
        }
    };

    const handleRepost = async () => {
        if (isReposting) return;
        setIsReposting(true);
        try {
            await repostStory(storyId);
            setReposts(prev => prev + 1);
            alert("Story reposted to your profile!");
        } catch (error) {
            alert(error.message || "Could not repost story.");
        } finally {
            setIsReposting(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setIsReplying(true);
        try {
            await addStoryReply(storyId, replyText);
            setReplyText('');
        } catch (error) {
            alert(error.message || "Failed to add reply.");
        } finally {
            setIsReplying(false);
        }
    };

    const getOptimizedUrl = (url, width) => {
        if (!url || !url.includes("cloudinary.com")) return url;
        const parts = url.split("upload/");
        if (parts.length === 2) {
            return `${parts[0]}upload/w_${width},f_auto,q_auto/${parts[1]}`;
        }
        return url;
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
            <Loader2 size={32} className="spinning" style={{ color: 'var(--color-plum)' }} />
        </div>
    );

    if (error || !story) return (
        <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
            <h2>{error || "Oops! Something went wrong."}</h2>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/stories')}>Back to Stories</button>
        </div>
    );

    return (
        <div className="page-container stories-page detail-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
                className="back-btn fade-in"
                onClick={() => navigate('/stories')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontSize: '1rem', fontWeight: '500' }}
            >
                <ArrowLeft size={18} /> Back to Discover
            </button>

            <article className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '350px', background: '#fcf8fa' }}>
                    <img
                        src={getOptimizedUrl(story.coverImageUrl, 1200)}
                        alt="Cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1542314831-c6a4d14d8c7c?q=80&w=1200&auto=format&fit=crop"; }}
                    />
                </div>

                <div style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span className="badge category-badge">{story.category}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#9ca3af' }}>
                            <Clock size={14} /> {formatTimeAgo(story.createdAt)}
                        </div>
                    </div>

                    <h1 style={{ fontSize: '2.4rem', color: '#1f2937', marginBottom: '8px', lineHeight: '1.2' }}>{story.title}</h1>

                    <div style={{ fontSize: '1.1rem', color: 'var(--color-plum)', marginBottom: '32px', fontWeight: '500' }}>
                        By {story.authorName} {story.designation && <span style={{ color: '#666', fontWeight: '400' }}>• {story.designation}</span>}
                    </div>

                    <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#374151', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
                        {story.content}
                    </div>

                    {story.media && story.media.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                            {story.media.map((img, index) => (
                                <div key={index} style={{ borderRadius: '12px', overflow: 'hidden', height: '200px' }}>
                                    <img
                                        src={getOptimizedUrl(img.url, 600)}
                                        alt={`Media ${index}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                        <button className={`icon-btn flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-500'}`} onClick={handleLike} style={{ color: isLiked ? '#e11d48' : '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                            <span>{likes} Likes</span>
                        </button>
                        <div className="flex items-center gap-2 text-gray-500" style={{ fontSize: '1rem', fontWeight: '500', color: '#6b7280' }}>
                            <MessageSquare size={20} />
                            <span>{replies.length} Replies</span>
                        </div>
                        <button className="icon-btn flex items-center gap-2 text-gray-500" onClick={handleRepost} disabled={isReposting} style={{ fontSize: '1rem', fontWeight: '500', color: '#6b7280' }}>
                            <Repeat size={20} />
                            <span>{reposts} Reposts</span>
                        </button>
                    </div>

                    {/* Replies Section */}
                    <div style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Community Responses</h3>

                        <form onSubmit={handleReplySubmit} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Share your thoughts on this story..."
                                style={{ flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
                                required
                            />
                            <button type="submit" disabled={isReplying || !replyText.trim()} style={{ background: 'var(--color-plum)', color: 'white', border: 'none', borderRadius: '30px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}>
                                {isReplying ? <Loader2 size={18} className="spinning" /> : <><Send size={18} /> Reply</>}
                            </button>
                        </form>

                        <div className="replies-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {replies.length === 0 ? (
                                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>Be the first to share your thoughts.</p>
                            ) : (
                                replies.map(reply => (
                                    <div key={reply.id} style={{ display: 'flex', gap: '16px', padding: '16px', background: '#fcf8fa', borderRadius: '12px' }}>
                                        <img src={reply.displayPhoto} alt={reply.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <strong style={{ color: '#1f2937' }}>{reply.displayName}</strong>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{formatTimeAgo(reply.createdAt)}</span>
                                            </div>
                                            <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{reply.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default StoryDetail;
